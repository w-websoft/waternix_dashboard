"""
유지보수 관리 API 라우터
"""
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.db.database import get_pool
from app.models.schemas import MaintenanceCreate, MaintenanceComplete

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/maintenance", tags=["유지보수"])


def _row_to_maintenance(row) -> dict:
    d = dict(row)
    d["id"] = str(d["id"])
    if d.get("equipment_id"):
        d["equipment_id"] = str(d["equipment_id"])
    if d.get("company_id"):
        d["company_id"] = str(d["company_id"])
    for date_field in ["scheduled_date", "completed_date", "next_maintenance"]:
        if d.get(date_field):
            d[date_field] = str(d[date_field])
    if d.get("created_at"):
        d["created_at"] = d["created_at"].isoformat()
    if d.get("updated_at"):
        d["updated_at"] = d["updated_at"].isoformat()
    return d


@router.get("", summary="유지보수 목록")
async def get_maintenance_list(
    company_id: Optional[str] = None,
    equipment_id: Optional[str] = None,
    status: Optional[str] = None,
    mtype: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            conditions = []
            params: list = []

            if company_id:
                params.append(company_id)
                conditions.append(f"m.company_id = ${len(params)}")
            if equipment_id:
                params.append(equipment_id)
                conditions.append(f"m.equipment_id = ${len(params)}")
            if status:
                params.append(status)
                conditions.append(f"m.status = ${len(params)}")
            if mtype:
                params.append(mtype)
                conditions.append(f"m.type = ${len(params)}")
            if search:
                params.append(f"%{search}%")
                n = len(params)
                conditions.append(
                    f"(m.title ILIKE ${n} OR m.technician ILIKE ${n})"
                )

            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            offset = (page - 1) * page_size
            params.extend([page_size, offset])

            rows = await conn.fetch(
                f"""
                SELECT m.*,
                       e.name AS equipment_name,
                       c.name AS company_name
                FROM maintenance_records m
                LEFT JOIN equipment e ON m.equipment_id = e.id
                LEFT JOIN companies c ON m.company_id = c.id
                {where}
                ORDER BY m.scheduled_date DESC NULLS LAST, m.created_at DESC
                LIMIT ${len(params)-1} OFFSET ${len(params)}
                """,
                *params,
            )
            return [_row_to_maintenance(r) for r in rows]
    except Exception as e:
        logger.error(f"유지보수 목록 조회 오류: {e}")
        return []


@router.post("", status_code=201, summary="유지보수 작업 등록")
async def create_maintenance(data: MaintenanceCreate):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            mid = str(uuid.uuid4())
            row = await conn.fetchrow(
                """
                INSERT INTO maintenance_records (
                    id, equipment_id, company_id, type, title, description,
                    technician, scheduled_date, labor_hours, cost,
                    next_maintenance, status
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'scheduled')
                RETURNING *
                """,
                mid,
                str(data.equipment_id),
                str(data.company_id),
                data.type.value,
                data.title,
                data.description,
                data.technician,
                data.scheduled_date,
                data.labor_hours,
                data.cost,
                data.next_maintenance,
            )
            result = _row_to_maintenance(row)
            # 장비/업체명 조회
            eq = await conn.fetchrow("SELECT name FROM equipment WHERE id = $1", str(data.equipment_id))
            cp = await conn.fetchrow("SELECT name FROM companies WHERE id = $1", str(data.company_id))
            result["equipment_name"] = eq["name"] if eq else None
            result["company_name"] = cp["name"] if cp else None
            return result
    except Exception as e:
        logger.error(f"유지보수 등록 오류: {e}")
        raise HTTPException(status_code=500, detail=f"유지보수 등록 실패: {str(e)}")


@router.put("/{maintenance_id}/complete", summary="유지보수 완료 처리")
async def complete_maintenance(maintenance_id: str, data: MaintenanceComplete):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE maintenance_records
                SET status = 'completed',
                    completed_date = $1,
                    technician = $2,
                    labor_hours = COALESCE($3, labor_hours),
                    cost = COALESCE($4, cost),
                    description = COALESCE($5, description),
                    next_maintenance = $6,
                    updated_at = NOW()
                WHERE id = $7
                RETURNING *
                """,
                data.completed_date,
                data.technician,
                data.labor_hours,
                data.cost,
                data.description,
                data.next_maintenance,
                maintenance_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="유지보수 기록을 찾을 수 없습니다")
            return _row_to_maintenance(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{maintenance_id}", status_code=204, summary="유지보수 삭제")
async def delete_maintenance(maintenance_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM maintenance_records WHERE id = $1", maintenance_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
