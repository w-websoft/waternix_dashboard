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
from app.models.schemas import EquipmentCreate, EquipmentUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/equipment", tags=["장비 관리"])


def _row_to_equipment(row) -> dict:
    d = dict(row)
    d["id"] = str(d["id"]) if d.get("id") else d.get("id")
    if d.get("install_date"):
        d["install_date"] = str(d["install_date"])
    if d.get("warranty_end"):
        d["warranty_end"] = str(d["warranty_end"])
    if d.get("created_at"):
        d["created_at"] = d["created_at"].isoformat()
    if d.get("updated_at"):
        d["updated_at"] = d["updated_at"].isoformat()
    # comm_config JSONB 처리
    if d.get("comm_config") and isinstance(d["comm_config"], str):
        try:
            d["comm_config"] = json.loads(d["comm_config"])
        except Exception:
            d["comm_config"] = None
    # comm_host/comm_port/comm_slave_id → comm_config dict로 통합
    if not d.get("comm_config"):
        comm = {}
        if d.get("comm_host"):
            comm["host"] = d["comm_host"]
        if d.get("comm_port"):
            comm["port"] = d["comm_port"]
        if d.get("comm_slave_id") is not None:
            comm["slave_id"] = d["comm_slave_id"]
        if comm:
            d["comm_config"] = comm
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
            comm_host = None
            comm_port = None
            comm_slave_id = None
            if data.comm_config:
                cfg = data.comm_config.model_dump(exclude_none=True)
                comm_host = cfg.get("host")
                comm_port = cfg.get("port")
                comm_slave_id = cfg.get("slave_id")

            # company_name 먼저 조회
            comp = await conn.fetchrow(
                "SELECT name FROM companies WHERE id = $1", str(data.company_id)
            )
            company_name = comp["name"] if comp else None

            row = await conn.fetchrow(
                """
                INSERT INTO equipment (
                    id, company_id, company_name, serial_no, model, equipment_type, name,
                    lat, lng, address, city, district,
                    install_date, warranty_end, capacity_lph,
                    comm_type, comm_host, comm_port, comm_slave_id, status
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                    $13, $14, $15, $16, $17, $18, $19, 'offline'
                )
                RETURNING *
                """,
                eq_id,
                str(data.company_id),
                company_name,
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
                comm_host,
                comm_port,
                comm_slave_id,
            )
            result = _row_to_equipment(row)
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
                       e.lat, e.lng, e.city, e.updated_at AS last_seen,
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
            update_data = data.model_dump(exclude_none=True, mode='json')
            if "comm_config" in update_data and update_data["comm_config"]:
                update_data["comm_config"] = json.dumps(update_data["comm_config"])
            for field, val in update_data.items():
                # Enum 값이면 .value 추출
                if hasattr(val, "value"):
                    val = val.value
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
            if resolved:
                cond = "a.process_step = 'completed'"
            else:
                cond = "a.process_step != 'completed'"
            rows = await conn.fetch(
                f"""
                SELECT a.*
                FROM alerts a
                WHERE a.equipment_id = $1
                  AND {cond}
                ORDER BY a.created_at DESC
                LIMIT 50
                """,
                equipment_id,
            )
            result = []
            for r in rows:
                d = dict(r)
                for k in ["created_at", "process_updated_at"]:
                    if d.get(k):
                        d[k] = d[k].isoformat()
                result.append(d)
            return result
    except Exception as e:
        logger.error(f"장비 알림 조회 오류: {e}")
        return []
