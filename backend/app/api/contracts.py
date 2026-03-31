"""
계약 관리 API
"""
import logging
import uuid
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.db.database import get_pool

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contracts", tags=["계약 관리"])

CONTRACT_TYPES = {
    "supply": "단순 납품",
    "maintenance": "유지보수 포함",
    "full_service": "완전 위탁",
}


def _row_to_contract(row) -> dict:
    d = dict(row)
    for col in ("created_at", "updated_at"):
        if d.get(col):
            d[col] = d[col].isoformat()
    for col in ("start_date", "end_date"):
        if d.get(col):
            d[col] = str(d[col])
    d["contract_type_label"] = CONTRACT_TYPES.get(d.get("contract_type", ""), d.get("contract_type", ""))
    # 만료 D-Day 계산
    if d.get("end_date"):
        try:
            end = date.fromisoformat(d["end_date"])
            d["days_remaining"] = (end - date.today()).days
        except Exception:
            d["days_remaining"] = None
    return d


@router.get("", summary="계약 목록")
async def list_contracts(
    company_id: Optional[str] = None,
    status: Optional[str] = None,
    contract_type: Optional[str] = None,
    expiring_soon: bool = False,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            conditions, params = [], []
            if company_id:
                params.append(company_id)
                conditions.append(f"company_id = ${len(params)}")
            if status:
                params.append(status)
                conditions.append(f"status = ${len(params)}")
            if contract_type:
                params.append(contract_type)
                conditions.append(f"contract_type = ${len(params)}")
            if expiring_soon:
                soon = date.today() + timedelta(days=90)
                params.append(str(soon))
                conditions.append(f"end_date <= ${len(params)} AND status = 'active'")
            if search:
                params.append(f"%{search}%")
                conditions.append(
                    f"(contract_no ILIKE ${len(params)} OR company_name ILIKE ${len(params)} OR title ILIKE ${len(params)})"
                )
            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            offset = (page - 1) * page_size
            params += [page_size, offset]
            rows = await conn.fetch(
                f"SELECT * FROM contracts {where} ORDER BY created_at DESC LIMIT ${len(params)-1} OFFSET ${len(params)}",
                *params,
            )
            total = await conn.fetchval(
                f"SELECT COUNT(*) FROM contracts {where}", *params[:-2]
            )
            return {"items": [_row_to_contract(r) for r in rows], "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/expiring", summary="만료 예정 계약 (90일 이내)")
async def get_expiring_contracts():
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            soon = date.today() + timedelta(days=90)
            rows = await conn.fetch(
                "SELECT * FROM contracts WHERE end_date <= $1 AND status='active' ORDER BY end_date",
                str(soon),
            )
            return [_row_to_contract(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{cont_id}", summary="계약 상세")
async def get_contract(cont_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM contracts WHERE id=$1", cont_id)
            if not row:
                raise HTTPException(status_code=404, detail="계약을 찾을 수 없습니다")
            return _row_to_contract(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201, summary="계약 등록")
async def create_contract(data: dict):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            year = date.today().year
            cnt = await conn.fetchval("SELECT COUNT(*)+1 FROM contracts")
            contract_no = data.get("contract_no") or f"C-{year}-{int(cnt):04d}"
            cid = str(uuid.uuid4())
            row = await conn.fetchrow(
                """INSERT INTO contracts
                   (id, contract_no, company_id, company_name, quotation_id,
                    contract_type, title, start_date, end_date, amount,
                    payment_terms, scope, status, assigned_sales_id, sales_name, notes)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
                   RETURNING *""",
                cid, contract_no,
                data.get("company_id"), data.get("company_name"),
                data.get("quotation_id"),
                data.get("contract_type", "supply"),
                data.get("title"),
                data.get("start_date"), data.get("end_date"),
                data.get("amount", 0),
                data.get("payment_terms"), data.get("scope"),
                data.get("status", "active"),
                data.get("assigned_sales_id"), data.get("sales_name"),
                data.get("notes"),
            )
            return _row_to_contract(row)
    except Exception as e:
        logger.error(f"계약 등록 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{cont_id}", summary="계약 수정")
async def update_contract(cont_id: str, data: dict):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            fields, params = [], []
            for k in ("title", "contract_type", "start_date", "end_date", "amount",
                      "payment_terms", "scope", "status", "sales_name",
                      "assigned_sales_id", "notes"):
                if k in data:
                    params.append(data[k])
                    fields.append(f"{k}=${len(params)}")
            if not fields:
                raise HTTPException(status_code=400, detail="수정할 항목 없음")
            params.append(cont_id)
            row = await conn.fetchrow(
                f"UPDATE contracts SET {', '.join(fields)}, updated_at=NOW() WHERE id=${len(params)} RETURNING *",
                *params,
            )
            if not row:
                raise HTTPException(status_code=404, detail="계약을 찾을 수 없습니다")
            return _row_to_contract(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{cont_id}", status_code=204, summary="계약 삭제")
async def delete_contract(cont_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute("DELETE FROM contracts WHERE id=$1", cont_id)
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="계약을 찾을 수 없습니다")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
