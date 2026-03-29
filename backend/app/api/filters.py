"""
필터 관리 API 라우터
"""
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db.database import get_pool

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/filters", tags=["필터 관리"])


class FilterCreate(BaseModel):
    equipment_id: Optional[str] = None
    equipment_name: Optional[str] = None
    company_name: Optional[str] = None
    filter_name: str
    filter_type: Optional[str] = None
    stage: Optional[int] = None
    install_date: Optional[str] = None
    replace_date: Optional[str] = None
    used_percent: float = 0
    status: str = "normal"
    part_no: Optional[str] = None
    supplier: Optional[str] = None


def _row_to_filter(row) -> dict:
    d = dict(row)
    for k in ["install_date", "replace_date"]:
        if d.get(k):
            d[k] = d[k].isoformat()
    if d.get("created_at"):
        d["created_at"] = d["created_at"].isoformat()
    return d


@router.get("", summary="필터 목록")
async def get_filters(
    status: Optional[str] = None,
    equipment_id: Optional[str] = None,
    company_id: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            conditions: list[str] = []
            params: list = []

            if status:
                params.append(status)
                conditions.append(f"status = ${len(params)}")
            if equipment_id:
                params.append(equipment_id)
                conditions.append(f"equipment_id = ${len(params)}")
            if company_id:
                # filters 테이블에 company_id 컬럼이 없으므로 equipment JOIN
                params.append(company_id)
                conditions.append(
                    f"equipment_id IN (SELECT id FROM equipment WHERE company_id = ${len(params)})"
                )
            if search:
                params.append(f"%{search}%")
                n = len(params)
                conditions.append(
                    f"(filter_name ILIKE ${n} OR filter_type ILIKE ${n} "
                    f"OR equipment_name ILIKE ${n} OR company_name ILIKE ${n})"
                )

            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            offset = (page - 1) * page_size
            params.extend([page_size, offset])

            rows = await conn.fetch(
                f"""
                SELECT * FROM filters
                {where}
                ORDER BY used_percent DESC
                LIMIT ${len(params) - 1} OFFSET ${len(params)}
                """,
                *params,
            )
            return [_row_to_filter(r) for r in rows]
    except Exception as e:
        logger.error(f"필터 목록 조회 오류: {e}")
        return []


@router.post("", status_code=201, summary="필터 등록")
async def create_filter(data: FilterCreate):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            fid = str(uuid.uuid4())
            row = await conn.fetchrow(
                """
                INSERT INTO filters (
                    id, equipment_id, equipment_name, company_name,
                    filter_name, filter_type, stage,
                    install_date, replace_date, used_percent, status,
                    part_no, supplier
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                RETURNING *
                """,
                fid,
                data.equipment_id,
                data.equipment_name,
                data.company_name,
                data.filter_name,
                data.filter_type,
                data.stage,
                data.install_date,
                data.replace_date,
                data.used_percent,
                data.status,
                data.part_no,
                data.supplier,
            )
            return _row_to_filter(row)
    except Exception as e:
        logger.error(f"필터 등록 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{filter_id}", summary="필터 수정")
async def update_filter(filter_id: str, data: FilterCreate):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE filters
                SET used_percent=$1, status=$2, replace_date=$3
                WHERE id=$4
                RETURNING *
                """,
                data.used_percent, data.status, data.replace_date, filter_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="필터를 찾을 수 없습니다")
            return _row_to_filter(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{filter_id}", status_code=204, summary="필터 삭제")
async def delete_filter(filter_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM filters WHERE id = $1", filter_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
