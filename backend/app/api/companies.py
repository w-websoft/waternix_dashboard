"""
업체(고객사) 관리 API 라우터
"""
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.db.database import get_pool
from app.models.schemas import CompanyCreate, CompanyUpdate, CompanyResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/companies", tags=["업체 관리"])


def _row_to_company(row) -> dict:
    d = dict(row)
    d["id"] = str(d["id"])
    if d.get("contract_start"):
        d["contract_start"] = str(d["contract_start"])
    if d.get("contract_end"):
        d["contract_end"] = str(d["contract_end"])
    if d.get("created_at"):
        d["created_at"] = d["created_at"].isoformat()
    if d.get("updated_at"):
        d["updated_at"] = d["updated_at"].isoformat()
    return d


@router.get("", summary="업체 목록")
async def get_companies(
    city: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            conditions = []
            params = []

            if city:
                params.append(city)
                conditions.append(f"city = ${len(params)}")
            if status:
                params.append(status)
                conditions.append(f"status = ${len(params)}")
            if search:
                params.append(f"%{search}%")
                conditions.append(f"(name ILIKE ${len(params)} OR contact ILIKE ${len(params)} OR city ILIKE ${len(params)})")

            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            offset = (page - 1) * page_size
            params.extend([page_size, offset])

            rows = await conn.fetch(
                f"""
                SELECT c.*,
                    (SELECT COUNT(*) FROM equipment e WHERE e.company_id = c.id) AS equipment_count
                FROM companies c
                {where}
                ORDER BY c.name
                LIMIT ${len(params)-1} OFFSET ${len(params)}
                """,
                *params,
            )
            return [_row_to_company(r) for r in rows]
    except Exception as e:
        logger.error(f"업체 목록 조회 오류: {e}")
        return []


@router.post("", status_code=201, summary="업체 등록")
async def create_company(data: CompanyCreate):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            cid = str(uuid.uuid4())
            row = await conn.fetchrow(
                """
                INSERT INTO companies (
                    id, name, business_no, contact, phone, email,
                    address, city, district,
                    contract_start, contract_end, notes, status
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                RETURNING *
                """,
                cid,
                data.name,
                data.business_no,
                data.contact,
                data.phone,
                data.email,
                data.address,
                data.city,
                data.district,
                data.contract_start,
                data.contract_end,
                data.notes,
                data.status or "active",
            )
            result = _row_to_company(row)
            result["equipment_count"] = 0
            return result
    except Exception as e:
        logger.error(f"업체 등록 오류: {e}")
        raise HTTPException(status_code=500, detail=f"업체 등록 실패: {str(e)}")


@router.get("/{company_id}", summary="업체 상세")
async def get_company(company_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT c.*,
                    (SELECT COUNT(*) FROM equipment e WHERE e.company_id = c.id) AS equipment_count
                FROM companies c
                WHERE c.id = $1
                """,
                company_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="업체를 찾을 수 없습니다")
            return _row_to_company(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"업체 상세 조회 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{company_id}", summary="업체 수정")
async def update_company(company_id: str, data: CompanyUpdate):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            fields = []
            params = []
            for field, val in data.model_dump(exclude_none=True).items():
                params.append(val)
                fields.append(f"{field} = ${len(params)}")
            if not fields:
                raise HTTPException(status_code=400, detail="수정할 항목이 없습니다")
            params.append(company_id)
            row = await conn.fetchrow(
                f"UPDATE companies SET {', '.join(fields)}, updated_at = NOW() WHERE id = ${len(params)} RETURNING *",
                *params,
            )
            if not row:
                raise HTTPException(status_code=404, detail="업체를 찾을 수 없습니다")
            result = _row_to_company(row)
            count_row = await conn.fetchrow(
                "SELECT COUNT(*) AS cnt FROM equipment WHERE company_id = $1", company_id
            )
            result["equipment_count"] = int(count_row["cnt"]) if count_row else 0
            return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{company_id}/equipment", summary="업체별 장비 목록")
async def get_company_equipment(company_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM equipment WHERE company_id = $1 ORDER BY created_at DESC",
                company_id,
            )
            result = []
            for r in rows:
                d = dict(r)
                d["id"] = str(d["id"])
                d["company_id"] = str(d["company_id"])
                if d.get("created_at"):
                    d["created_at"] = d["created_at"].isoformat()
                if d.get("updated_at"):
                    d["updated_at"] = d["updated_at"].isoformat()
                result.append(d)
            return result
    except Exception as e:
        logger.error(f"업체별 장비 조회 오류: {e}")
        return []
