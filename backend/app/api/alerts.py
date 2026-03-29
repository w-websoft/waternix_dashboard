"""
알림/경보 관리 API 라우터
"""
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db.database import get_pool

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/alerts", tags=["알림 관리"])

PROCESS_STEPS = ["received", "investigating", "processing", "completed"]


class AlertCreate(BaseModel):
    equipment_id: Optional[str] = None
    equipment_name: Optional[str] = None
    company_name: Optional[str] = None
    severity: str = "warning"
    type: str
    title: str
    message: Optional[str] = None


class AlertProcess(BaseModel):
    process_step: str  # received | investigating | processing | completed
    assignee: Optional[str] = None
    process_comment: Optional[str] = None


def _row_to_alert(row) -> dict:
    d = dict(row)
    for k in ["created_at", "process_updated_at"]:
        if d.get(k):
            d[k] = d[k].isoformat()
    return d


@router.get("", summary="알림 목록")
async def get_alerts(
    severity: Optional[str] = None,
    resolved: bool = False,
    equipment_id: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            conditions: list[str] = []
            params: list = []

            if not resolved:
                conditions.append("a.process_step != 'completed'")
            else:
                conditions.append("a.process_step = 'completed'")

            if severity:
                params.append(severity)
                conditions.append(f"a.severity = ${len(params)}")
            if equipment_id:
                params.append(equipment_id)
                conditions.append(f"a.equipment_id = ${len(params)}")
            if search:
                params.append(f"%{search}%")
                n = len(params)
                conditions.append(
                    f"(a.title ILIKE ${n} OR a.message ILIKE ${n} "
                    f"OR a.equipment_name ILIKE ${n} OR a.company_name ILIKE ${n})"
                )

            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            offset = (page - 1) * page_size
            params.extend([page_size, offset])

            rows = await conn.fetch(
                f"""
                SELECT a.*
                FROM alerts a
                {where}
                ORDER BY a.created_at DESC
                LIMIT ${len(params) - 1} OFFSET ${len(params)}
                """,
                *params,
            )
            return [_row_to_alert(r) for r in rows]
    except Exception as e:
        logger.error(f"알림 목록 조회 오류: {e}")
        return []


@router.post("", status_code=201, summary="알림 생성")
async def create_alert(data: AlertCreate):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            aid = str(uuid.uuid4())
            row = await conn.fetchrow(
                """
                INSERT INTO alerts
                  (id, equipment_id, equipment_name, company_name, severity, type, title, message)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                RETURNING *
                """,
                aid,
                data.equipment_id,
                data.equipment_name,
                data.company_name,
                data.severity,
                data.type,
                data.title,
                data.message,
            )
            return _row_to_alert(row)
    except Exception as e:
        logger.error(f"알림 생성 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{alert_id}/process", summary="알림 처리 단계 업데이트")
async def process_alert(alert_id: str, data: AlertProcess):
    """처리 단계: received → investigating → processing → completed"""
    if data.process_step not in PROCESS_STEPS:
        raise HTTPException(
            status_code=400,
            detail=f"process_step 은 {PROCESS_STEPS} 중 하나여야 합니다",
        )
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE alerts
                SET process_step = $1::varchar,
                    assignee = COALESCE($2::varchar, assignee),
                    process_comment = COALESCE($3::text, process_comment),
                    acknowledged = CASE WHEN $1::varchar != 'received' THEN true ELSE acknowledged END,
                    process_updated_at = NOW()
                WHERE id = $4::varchar
                RETURNING *
                """,
                data.process_step,
                data.assignee,
                data.process_comment,
                alert_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다")
            return _row_to_alert(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{alert_id}", status_code=204, summary="알림 삭제")
async def delete_alert(alert_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute("DELETE FROM alerts WHERE id = $1", alert_id)
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
