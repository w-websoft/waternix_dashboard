"""
견적서 관리 API
"""
import json
import logging
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.db.database import get_pool

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/quotations", tags=["견적서"])


def _next_quote_no(seq: int) -> str:
    year = date.today().year
    return f"Q-{year}-{seq:04d}"


def _row_to_quot(row) -> dict:
    d = dict(row)
    if d.get("items") and isinstance(d["items"], str):
        try:
            d["items"] = json.loads(d["items"])
        except Exception:
            d["items"] = []
    for col in ("created_at", "updated_at"):
        if d.get(col):
            d[col] = d[col].isoformat()
    for col in ("valid_until",):
        if d.get(col):
            d[col] = str(d[col])
    return d


@router.get("", summary="견적서 목록")
async def list_quotations(
    company_id: Optional[str] = None,
    status: Optional[str] = None,
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
            if search:
                params.append(f"%{search}%")
                conditions.append(
                    f"(quote_no ILIKE ${len(params)} OR company_name ILIKE ${len(params)} OR contact_name ILIKE ${len(params)})"
                )
            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            offset = (page - 1) * page_size
            params += [page_size, offset]
            rows = await conn.fetch(
                f"SELECT * FROM quotations {where} ORDER BY created_at DESC LIMIT ${len(params)-1} OFFSET ${len(params)}",
                *params,
            )
            total = await conn.fetchval(
                f"SELECT COUNT(*) FROM quotations {where}", *params[:-2]
            )
            return {"items": [_row_to_quot(r) for r in rows], "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{quot_id}", summary="견적서 상세")
async def get_quotation(quot_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM quotations WHERE id=$1", quot_id)
            if not row:
                raise HTTPException(status_code=404, detail="견적서를 찾을 수 없습니다")
            return _row_to_quot(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201, summary="견적서 작성")
async def create_quotation(data: dict):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            seq = await conn.fetchval("SELECT COUNT(*)+1 FROM quotations")
            quote_no = _next_quote_no(int(seq))
            qid = str(uuid.uuid4())
            items = data.get("items", [])
            subtotal = sum(i.get("amount", 0) for i in items)
            tax = int(subtotal * 0.1)
            total = subtotal + tax
            row = await conn.fetchrow(
                """INSERT INTO quotations
                   (id, quote_no, company_id, company_name, contact_name,
                    contact_email, contact_phone, items, subtotal, tax, total,
                    valid_until, status, notes, created_by)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15)
                   RETURNING *""",
                qid, quote_no,
                data.get("company_id"), data.get("company_name"),
                data.get("contact_name"), data.get("contact_email"),
                data.get("contact_phone"),
                json.dumps(items),
                subtotal, tax, total,
                data.get("valid_until"),
                data.get("status", "draft"),
                data.get("notes"), data.get("created_by"),
            )
            return _row_to_quot(row)
    except Exception as e:
        logger.error(f"견적서 생성 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{quot_id}", summary="견적서 수정")
async def update_quotation(quot_id: str, data: dict):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            fields, params = [], []
            for k in ("company_name", "contact_name", "contact_email", "contact_phone",
                      "valid_until", "status", "notes"):
                if k in data:
                    params.append(data[k])
                    fields.append(f"{k}=${len(params)}")
            if "items" in data:
                items = data["items"]
                subtotal = sum(i.get("amount", 0) for i in items)
                tax = int(subtotal * 0.1)
                total = subtotal + tax
                params.append(json.dumps(items))
                fields.append(f"items=${len(params)}::jsonb")
                params += [subtotal, tax, total]
                fields += [f"subtotal=${len(params)-2}", f"tax=${len(params)-1}", f"total=${len(params)}"]
            if not fields:
                raise HTTPException(status_code=400, detail="수정할 항목 없음")
            params.append(quot_id)
            row = await conn.fetchrow(
                f"UPDATE quotations SET {', '.join(fields)}, updated_at=NOW() WHERE id=${len(params)} RETURNING *",
                *params,
            )
            if not row:
                raise HTTPException(status_code=404, detail="견적서를 찾을 수 없습니다")
            return _row_to_quot(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{quot_id}/send", summary="견적서 발송 처리")
async def send_quotation(quot_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "UPDATE quotations SET status='sent', updated_at=NOW() WHERE id=$1 RETURNING *",
                quot_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="견적서를 찾을 수 없습니다")
            return _row_to_quot(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{quot_id}/accept", summary="견적 수락 → 계약 자동 생성")
async def accept_quotation(quot_id: str):
    """견적 수락 처리 후 contracts 테이블에 계약 자동 생성"""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            quot = await conn.fetchrow("SELECT * FROM quotations WHERE id=$1", quot_id)
            if not quot:
                raise HTTPException(status_code=404, detail="견적서를 찾을 수 없습니다")
            await conn.execute(
                "UPDATE quotations SET status='accepted', updated_at=NOW() WHERE id=$1", quot_id
            )
            # 계약 자동 생성
            year = date.today().year
            cnt = await conn.fetchval("SELECT COUNT(*)+1 FROM contracts")
            contract_no = f"C-{year}-{int(cnt):04d}"
            cid = str(uuid.uuid4())
            await conn.execute(
                """INSERT INTO contracts
                   (id, contract_no, company_id, company_name, quotation_id,
                    contract_type, title, amount, status)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')""",
                cid, contract_no,
                quot["company_id"], quot["company_name"], quot_id,
                "supply", f"견적 {quot['quote_no']} 수락 계약",
                quot["total"],
            )
            return {"message": "견적 수락 완료", "contract_no": contract_no}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{quot_id}", status_code=204, summary="견적서 삭제")
async def delete_quotation(quot_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute("DELETE FROM quotations WHERE id=$1", quot_id)
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="견적서를 찾을 수 없습니다")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
