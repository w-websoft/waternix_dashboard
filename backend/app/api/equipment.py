"""
장비 관리 API 라우터
"""
import json
import logging
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Query

from app.db.database import get_pool
from app.models.schemas import (
    EquipmentCreate, EquipmentUpdate, EquipmentResponse,
    EquipmentMapPoint, SensorDataResponse, AlertResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/equipment", tags=["장비 관리"])


def _row_to_equipment(row) -> dict:
    d = dict(row)
    d["id"] = str(d["id"])
    if d.get("company_id"):
        d["company_id"] = str(d["company_id"])
    if d.get("install_date"):
        d["install_date"] = str(d["install_date"])
    if d.get("warranty_end"):
        d["warranty_end"] = str(d["warranty_end"])
    if d.get("last_seen"):
        d["last_seen"] = d["last_seen"].isoformat()
    if d.get("created_at"):
        d["created_at"] = d["created_at"].isoformat()
    if d.get("updated_at"):
        d["updated_at"] = d["updated_at"].isoformat()
    # comm_config는 JSONB → dict 변환
    if d.get("comm_config") and isinstance(d["comm_config"], str):
        try:
            d["comm_config"] = json.loads(d["comm_config"])
        except Exception:
            d["comm_config"] = None
    return d


@router.get("", summary="장비 목록 조회")
async def get_equipment_list(
    company_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    equipment_type: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
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
                conditions.append(f"e.company_id = ${len(params)}")
            if status:
                params.append(status)
                conditions.append(f"e.status = ${len(params)}")
            if equipment_type:
                params.append(equipment_type)
                conditions.append(f"e.equipment_type = ${len(params)}")
            if city:
                params.append(city)
                conditions.append(f"e.city = ${len(params)}")
            if search:
                params.append(f"%{search}%")
                n = len(params)
                conditions.append(
                    f"(e.name ILIKE ${n} OR e.model ILIKE ${n} OR e.serial_no ILIKE ${n})"
                )

            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            offset = (page - 1) * page_size
            params.extend([page_size, offset])

            rows = await conn.fetch(
                f"""
                SELECT e.*, c.name AS company_name
                FROM equipment e
                LEFT JOIN companies c ON e.company_id = c.id
                {where}
                ORDER BY e.created_at DESC
                LIMIT ${len(params)-1} OFFSET ${len(params)}
                """,
                *params,
            )
            return [_row_to_equipment(r) for r in rows]
    except Exception as e:
        logger.error(f"장비 목록 조회 오류: {e}")
        return []


@router.post("", status_code=201, summary="장비 등록")
async def create_equipment(data: EquipmentCreate):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            eq_id = str(uuid.uuid4())
            comm_config_json = None
            if data.comm_config:
                comm_config_json = json.dumps(data.comm_config.model_dump(exclude_none=True))

            row = await conn.fetchrow(
                """
                INSERT INTO equipment (
                    id, company_id, serial_no, model, equipment_type, name,
                    lat, lng, address, city, district,
                    install_date, warranty_end, capacity_lph,
                    comm_type, comm_config, status
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                    $12, $13, $14, $15, $16::jsonb, 'offline'
                )
                RETURNING *
                """,
                eq_id,
                str(data.company_id),
                data.serial_no,
                data.model,
                data.equipment_type.value,
                data.name,
                data.lat,
                data.lng,
                data.address,
                data.city,
                data.district,
                data.install_date,
                data.warranty_end,
                data.capacity_lph,
                data.comm_type.value if data.comm_type else None,
                comm_config_json,
            )
            result = _row_to_equipment(row)
            # company_name 조회
            comp = await conn.fetchrow(
                "SELECT name FROM companies WHERE id = $1", str(data.company_id)
            )
            result["company_name"] = comp["name"] if comp else None
            return result
    except Exception as e:
        logger.error(f"장비 등록 오류: {e}")
        raise HTTPException(status_code=500, detail=f"장비 등록 실패: {str(e)}")


@router.get("/map-data", summary="지도용 장비 데이터")
async def get_map_data(
    company_id: Optional[str] = None,
    status: Optional[str] = None,
):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            conditions = ["e.lat IS NOT NULL", "e.lng IS NOT NULL"]
            params: list = []
            if company_id:
                params.append(company_id)
                conditions.append(f"e.company_id = ${len(params)}")
            if status:
                params.append(status)
                conditions.append(f"e.status = ${len(params)}")

            where = f"WHERE {' AND '.join(conditions)}"
            rows = await conn.fetch(
                f"""
                SELECT e.id, e.name, e.model, e.equipment_type, e.status,
                       e.lat, e.lng, e.city, e.last_seen,
                       c.name AS company_name
                FROM equipment e
                LEFT JOIN companies c ON e.company_id = c.id
                {where}
                """,
                *params,
            )
            result = []
            for r in rows:
                d = dict(r)
                d["id"] = str(d["id"])
                if d.get("last_seen"):
                    d["last_seen"] = d["last_seen"].isoformat()
                result.append(d)
            return result
    except Exception as e:
        logger.error(f"지도 데이터 조회 오류: {e}")
        return []


@router.get("/{equipment_id}", summary="장비 상세 조회")
async def get_equipment(equipment_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT e.*, c.name AS company_name
                FROM equipment e
                LEFT JOIN companies c ON e.company_id = c.id
                WHERE e.id = $1
                """,
                equipment_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="장비를 찾을 수 없습니다")
            return _row_to_equipment(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{equipment_id}", summary="장비 수정")
async def update_equipment(equipment_id: str, data: EquipmentUpdate):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            fields = []
            params: list = []
            update_data = data.model_dump(exclude_none=True)
            if "comm_config" in update_data and update_data["comm_config"]:
                update_data["comm_config"] = json.dumps(update_data["comm_config"])
            for field, val in update_data.items():
                params.append(val)
                if field == "comm_config":
                    fields.append(f"{field} = ${len(params)}::jsonb")
                else:
                    fields.append(f"{field} = ${len(params)}")
            if not fields:
                raise HTTPException(status_code=400, detail="수정할 항목이 없습니다")
            params.append(equipment_id)
            row = await conn.fetchrow(
                f"UPDATE equipment SET {', '.join(fields)}, updated_at = NOW() WHERE id = ${len(params)} RETURNING *",
                *params,
            )
            if not row:
                raise HTTPException(status_code=404, detail="장비를 찾을 수 없습니다")
            return _row_to_equipment(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{equipment_id}", status_code=204, summary="장비 삭제")
async def delete_equipment(equipment_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute("DELETE FROM equipment WHERE id = $1", equipment_id)
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="장비를 찾을 수 없습니다")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{equipment_id}/sensors/latest", summary="최신 센서 데이터")
async def get_latest_sensor_data(equipment_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM sensor_readings
                WHERE equipment_id = $1
                ORDER BY time DESC
                LIMIT 1
                """,
                equipment_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="센서 데이터 없음")
            d = dict(row)
            d["equipment_id"] = str(d["equipment_id"])
            d["timestamp"] = d["time"].isoformat()
            return d
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{equipment_id}/alerts", summary="장비 알림 목록")
async def get_equipment_alerts(equipment_id: str, resolved: bool = False):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT a.*, e.name AS equipment_name, c.name AS company_name
                FROM alerts a
                LEFT JOIN equipment e ON a.equipment_id = e.id
                LEFT JOIN companies c ON a.company_id = c.id
                WHERE a.equipment_id = $1
                  AND ($2 OR a.resolved_at IS NULL)
                ORDER BY a.created_at DESC
                LIMIT 50
                """,
                equipment_id,
                resolved,
            )
            result = []
            for r in rows:
                d = dict(r)
                d["id"] = str(d["id"])
                d["equipment_id"] = str(d["equipment_id"])
                d["company_id"] = str(d["company_id"])
                if d.get("created_at"):
                    d["created_at"] = d["created_at"].isoformat()
                result.append(d)
            return result
    except Exception as e:
        logger.error(f"장비 알림 조회 오류: {e}")
        return []
