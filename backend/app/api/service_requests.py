"""
A/S 서비스 요청 API (접수 · 배차 · 완료 처리)
"""
import json
import logging
import uuid
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.db.database import get_pool

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/service-requests", tags=["A/S 서비스 요청"])

REQUEST_TYPES = {
    "breakdown": "고장수리",
    "inspection": "정기점검",
    "consumable": "소모품교체",
    "install": "신규설치",
    "other": "기타",
}
STATUS_LABELS = {
    "received": "접수",
    "dispatched": "배차완료",
    "on_route": "이동중",
    "arrived": "현장도착",
    "working": "작업중",
    "completed": "완료",
    "cancelled": "취소",
}


def _next_request_no(seq: int) -> str:
    today = date.today().strftime("%Y%m%d")
    return f"SR-{today}-{seq:04d}"


def _row_to_sr(row) -> dict:
    d = dict(row)
    for col in ("parts_used", "photos"):
        if d.get(col) and isinstance(d[col], str):
            try:
                d[col] = json.loads(d[col])
            except Exception:
                d[col] = []
        if d.get(col) is None:
            d[col] = []
    for col in ("created_at", "updated_at", "arrived_at", "completed_at"):
        if d.get(col):
            d[col] = d[col].isoformat()
    for col in ("scheduled_date",):
        if d.get(col):
            d[col] = str(d[col])
    return d


@router.get("", summary="A/S 서비스 요청 목록")
async def list_service_requests(
    equipment_id: Optional[str] = None,
    company_id: Optional[str] = None,
    technician_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    request_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            conditions = []
            params: list = []

            if equipment_id:
                params.append(equipment_id)
                conditions.append(f"equipment_id = ${len(params)}")
            if company_id:
                params.append(company_id)
                conditions.append(f"company_id = ${len(params)}")
            if technician_id:
                params.append(technician_id)
                conditions.append(f"assigned_technician_id = ${len(params)}")
            if status:
                params.append(status)
                conditions.append(f"status = ${len(params)}")
            if priority:
                params.append(priority)
                conditions.append(f"priority = ${len(params)}")
            if request_type:
                params.append(request_type)
                conditions.append(f"request_type = ${len(params)}")
            if search:
                params.append(f"%{search}%")
                conditions.append(
                    f"(title ILIKE ${len(params)} OR company_name ILIKE ${len(params)} OR equipment_name ILIKE ${len(params)} OR request_no ILIKE ${len(params)})"
                )

            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            offset = (page - 1) * page_size
            params += [page_size, offset]

            rows = await conn.fetch(
                f"SELECT * FROM service_requests {where} ORDER BY created_at DESC LIMIT ${len(params)-1} OFFSET ${len(params)}",
                *params,
            )
            total = await conn.fetchval(
                f"SELECT COUNT(*) FROM service_requests {where}",
                *params[:-2],
            )
            return {"items": [_row_to_sr(r) for r in rows], "total": total, "page": page, "page_size": page_size}
    except Exception as e:
        logger.error(f"서비스요청 목록 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", summary="A/S 통계")
async def get_stats():
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT
                    COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled')) AS open_count,
                    COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
                    COUNT(*) FILTER (WHERE priority = 'urgent' AND status NOT IN ('completed','cancelled')) AS urgent_count,
                    COUNT(*) FILTER (WHERE status = 'received') AS pending_dispatch,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS monthly
                FROM service_requests
            """)
            return dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sr_id}", summary="서비스 요청 상세")
async def get_service_request(sr_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM service_requests WHERE id=$1", sr_id)
            if not row:
                raise HTTPException(status_code=404, detail="서비스 요청을 찾을 수 없습니다")
            return _row_to_sr(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201, summary="A/S 접수")
async def create_service_request(data: dict):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            seq = await conn.fetchval("SELECT COUNT(*)+1 FROM service_requests")
            request_no = _next_request_no(int(seq))
            sr_id = str(uuid.uuid4())
            row = await conn.fetchrow(
                """INSERT INTO service_requests
                   (id, request_no, equipment_id, company_id, equipment_name, company_name,
                    request_type, priority, title, description, assigned_technician_id,
                    technician_name, status, scheduled_date)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                   RETURNING *""",
                sr_id, request_no,
                data.get("equipment_id"), data.get("company_id"),
                data.get("equipment_name"), data.get("company_name"),
                data.get("request_type", "inspection"),
                data.get("priority", "normal"),
                data["title"], data.get("description"),
                data.get("assigned_technician_id"), data.get("technician_name"),
                data.get("status", "received"),
                data.get("scheduled_date"),
            )
            return _row_to_sr(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"서비스요청 등록 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{sr_id}/dispatch", summary="기사 배차")
async def dispatch_technician(sr_id: str, data: dict):
    """담당 기사를 지정하고 상태를 dispatched로 변경"""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """UPDATE service_requests
                   SET assigned_technician_id=$1, technician_name=$2,
                       status='dispatched', scheduled_date=$3, updated_at=NOW()
                   WHERE id=$4 RETURNING *""",
                data.get("technician_id"), data.get("technician_name"),
                data.get("scheduled_date"), sr_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="서비스 요청을 찾을 수 없습니다")
            return _row_to_sr(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{sr_id}/status", summary="상태 변경")
async def update_status(sr_id: str, data: dict):
    """arrived / working / completed / cancelled"""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            new_status = data.get("status")
            if new_status not in STATUS_LABELS:
                raise HTTPException(status_code=400, detail=f"유효하지 않은 상태: {new_status}")

            extra_fields = ""
            extra_params: list = [new_status]

            if new_status == "arrived":
                extra_fields = ", arrived_at=NOW()"
            elif new_status == "completed":
                extra_fields = ", completed_at=NOW()"

            params = extra_params + [sr_id]
            row = await conn.fetchrow(
                f"UPDATE service_requests SET status=$1{extra_fields}, updated_at=NOW() WHERE id=$2 RETURNING *",
                *params,
            )
            if not row:
                raise HTTPException(status_code=404, detail="서비스 요청을 찾을 수 없습니다")
            return _row_to_sr(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{sr_id}/complete", summary="작업 완료 처리")
async def complete_service_request(sr_id: str, data: dict):
    """완료 처리 + 부품 사용 내역, 비용, 고객 평가"""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            parts = json.dumps(data.get("parts_used") or [])
            row = await conn.fetchrow(
                """UPDATE service_requests SET
                   status='completed', completed_at=NOW(),
                   parts_used=$1::jsonb, labor_hours=$2, labor_cost=$3,
                   parts_cost=$4, total_cost=$5, report_notes=$6,
                   customer_rating=$7, customer_feedback=$8, updated_at=NOW()
                   WHERE id=$9 RETURNING *""",
                parts,
                data.get("labor_hours"), data.get("labor_cost"),
                data.get("parts_cost"), data.get("total_cost"),
                data.get("report_notes"),
                data.get("customer_rating"), data.get("customer_feedback"),
                sr_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="서비스 요청을 찾을 수 없습니다")
            return _row_to_sr(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{sr_id}", summary="서비스 요청 수정")
async def update_service_request(sr_id: str, data: dict):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            updatable = ["title", "description", "request_type", "priority",
                         "scheduled_date", "status", "technician_name",
                         "report_notes", "assigned_technician_id"]
            fields, params = [], []
            for k in updatable:
                if k in data:
                    params.append(data[k])
                    fields.append(f"{k}=${len(params)}")
            if not fields:
                raise HTTPException(status_code=400, detail="수정할 항목 없음")
            params.append(sr_id)
            row = await conn.fetchrow(
                f"UPDATE service_requests SET {', '.join(fields)}, updated_at=NOW() WHERE id=${len(params)} RETURNING *",
                *params,
            )
            if not row:
                raise HTTPException(status_code=404, detail="서비스 요청을 찾을 수 없습니다")
            return _row_to_sr(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{sr_id}", status_code=204, summary="서비스 요청 삭제")
async def delete_service_request(sr_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute("DELETE FROM service_requests WHERE id=$1", sr_id)
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="서비스 요청을 찾을 수 없습니다")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
