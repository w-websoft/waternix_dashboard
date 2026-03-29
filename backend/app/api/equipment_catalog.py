"""
워터닉스 장비 카탈로그 API (자사 제품 등록/관리)
"""
import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db.database import get_pool

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/equipment-catalog", tags=["장비 카탈로그"])

WATERNIX_SEED_CATALOG = [
    # ─── DCRO 시리즈 (냉각수 스케일제거) ─────────────────────────────
    {"model_code":"DCRO-150","model_name":"냉각수 스케일제거 시스템 150L/h","equipment_type":"cooling","series":"DCRO","category":"냉각수처리","specs":{"capacity_lph":150,"voltage":"220V","power_kw":0.37,"dimensions":"600×450×1200mm"},"warranty_months":12,"sell_price":12000000,"default_consumables":[{"part_no":"DCRO-SD-5","name":"세디먼트 5㎛","interval_days":90},{"part_no":"DCRO-MEM-NF","name":"NF 멤브레인","interval_days":1095}]},
    {"model_code":"DCRO-300","model_name":"냉각수 스케일제거 시스템 300L/h","equipment_type":"cooling","series":"DCRO","category":"냉각수처리","specs":{"capacity_lph":300,"voltage":"220V","power_kw":0.75,"dimensions":"700×500×1400mm"},"warranty_months":12,"sell_price":18000000,"default_consumables":[{"part_no":"DCRO-SD-5-L","name":"세디먼트 5㎛ (대형)","interval_days":90},{"part_no":"DCRO-MEM-NF4","name":"NF 멤브레인 4인치","interval_days":1095}]},
    {"model_code":"DCRO-500","model_name":"냉각수 스케일제거 시스템 500L/h","equipment_type":"cooling","series":"DCRO","category":"냉각수처리","specs":{"capacity_lph":500,"voltage":"380V","power_kw":1.5,"dimensions":"900×600×1600mm"},"warranty_months":12,"sell_price":28000000},
    {"model_code":"DCRO-1000","model_name":"냉각수 스케일제거 시스템 1000L/h","equipment_type":"cooling","series":"DCRO","category":"냉각수처리","specs":{"capacity_lph":1000,"voltage":"380V","power_kw":3.0},"warranty_months":12,"sell_price":45000000},
    # ─── WRO 시리즈 (역삼투압) ───────────────────────────────────────
    {"model_code":"WRO-500","model_name":"역삼투압 정수 시스템 500L/h","equipment_type":"ro","series":"WRO","category":"역삼투압","specs":{"capacity_lph":500,"rejection_rate":99,"voltage":"220V"},"warranty_months":12,"sell_price":15000000,"default_consumables":[{"part_no":"WRO-SD","name":"세디먼트 필터","interval_days":90},{"part_no":"WRO-CTO","name":"카본 블록","interval_days":180},{"part_no":"WRO-MEM","name":"RO 멤브레인","interval_days":730}]},
    {"model_code":"WRO-1000","model_name":"역삼투압 정수 시스템 1000L/h","equipment_type":"ro","series":"WRO","category":"역삼투압","specs":{"capacity_lph":1000,"rejection_rate":99,"voltage":"220V"},"warranty_months":12,"sell_price":22000000},
    {"model_code":"WRO-2000","model_name":"역삼투압 정수 시스템 2000L/h","equipment_type":"ro","series":"WRO","category":"역삼투압","specs":{"capacity_lph":2000,"rejection_rate":99,"voltage":"380V"},"warranty_months":12,"sell_price":38000000},
    {"model_code":"WRO-5000","model_name":"역삼투압 정수 시스템 5000L/h","equipment_type":"ro","series":"WRO","category":"역삼투압","specs":{"capacity_lph":5000,"rejection_rate":99,"voltage":"380V"},"warranty_months":12,"sell_price":75000000},
    # ─── WDI 시리즈 (초순수/DI) ──────────────────────────────────────
    {"model_code":"WDI-100","model_name":"초순수 제조 시스템 100L/h","equipment_type":"di","series":"WDI","category":"초순수","specs":{"capacity_lph":100,"resistivity":"18 MΩ·cm","voltage":"220V"},"warranty_months":12,"sell_price":25000000},
    {"model_code":"WDI-500","model_name":"초순수 제조 시스템 500L/h","equipment_type":"di","series":"WDI","category":"초순수","specs":{"capacity_lph":500,"resistivity":"18 MΩ·cm","voltage":"380V"},"warranty_months":12,"sell_price":60000000},
    # ─── WSRO 시리즈 (해수담수화) ────────────────────────────────────
    {"model_code":"WSRO-1000","model_name":"해수담수화 시스템 1000L/h","equipment_type":"seawater","series":"WSRO","category":"해수담수화","specs":{"capacity_lph":1000,"salt_rejection":99.5,"voltage":"380V"},"warranty_months":12,"sell_price":85000000},
    {"model_code":"WSRO-3000","model_name":"해수담수화 시스템 3000L/h","equipment_type":"seawater","series":"WSRO","category":"해수담수화","specs":{"capacity_lph":3000,"salt_rejection":99.5,"voltage":"380V"},"warranty_months":12,"sell_price":180000000},
    # ─── WUF 시리즈 (양액회수·재생) ─────────────────────────────────
    {"model_code":"WUF-200","model_name":"양액회수·재생 시스템 200L/h","equipment_type":"uf","series":"WUF","category":"양액회수","specs":{"capacity_lph":200,"membrane_type":"UF","voltage":"220V"},"warranty_months":12,"sell_price":18000000},
    {"model_code":"WUF-500","model_name":"양액회수·재생 시스템 500L/h","equipment_type":"uf","series":"WUF","category":"양액회수","specs":{"capacity_lph":500,"membrane_type":"UF","voltage":"380V"},"warranty_months":12,"sell_price":35000000},
    # ─── 소형 시스템 ─────────────────────────────────────────────────
    {"model_code":"T05","model_name":"소형 정수 시스템 T05 (5L/h)","equipment_type":"small","series":"T","category":"소형시스템","specs":{"capacity_lph":5,"voltage":"110-220V"},"warranty_months":12,"sell_price":850000},
    {"model_code":"T20","model_name":"소형 정수 시스템 T20 (20L/h)","equipment_type":"small","series":"T","category":"소형시스템","specs":{"capacity_lph":20,"voltage":"110-220V"},"warranty_months":12,"sell_price":1800000},
    # ─── WUV 시리즈 (UV살균) ─────────────────────────────────────────
    {"model_code":"WUV-50","model_name":"UV살균 시스템 50L/h","equipment_type":"uv","series":"WUV","category":"UV살균","specs":{"capacity_lph":50,"uv_dose":"40 mJ/cm²","voltage":"220V"},"warranty_months":12,"sell_price":2500000,"default_consumables":[{"part_no":"WUV-LAMP","name":"UV 램프","interval_days":365}]},
    {"model_code":"WUV-200","model_name":"UV살균 시스템 200L/h","equipment_type":"uv","series":"WUV","category":"UV살균","specs":{"capacity_lph":200,"uv_dose":"40 mJ/cm²","voltage":"220V"},"warranty_months":12,"sell_price":5800000},
    # ─── WSF 시리즈 (연수) ───────────────────────────────────────────
    {"model_code":"WSF-500","model_name":"연수 시스템 500L/h","equipment_type":"softener","series":"WSF","category":"연수처리","specs":{"capacity_lph":500,"hardness_removal":"99%","voltage":"220V"},"warranty_months":12,"sell_price":8000000,"default_consumables":[{"part_no":"WSF-RESIN","name":"이온교환수지","interval_days":1095}]},
    {"model_code":"WSF-2000","model_name":"연수 시스템 2000L/h","equipment_type":"softener","series":"WSF","category":"연수처리","specs":{"capacity_lph":2000,"hardness_removal":"99%","voltage":"380V"},"warranty_months":12,"sell_price":22000000},
]


def _row_to_catalog(row) -> dict:
    d = dict(row)
    for col in ("specs", "default_consumables"):
        if d.get(col) and isinstance(d[col], str):
            try:
                d[col] = json.loads(d[col])
            except Exception:
                pass
    for col in ("features",):
        if d.get(col) is None:
            d[col] = []
    for col in ("created_at", "updated_at"):
        if d.get(col):
            d[col] = d[col].isoformat()
    return d


@router.get("", summary="장비 카탈로그 목록")
async def list_catalog(
    equipment_type: Optional[str] = None,
    series: Optional[str] = None,
    search: Optional[str] = None,
    active_only: bool = True,
):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            conditions = []
            params = []
            if active_only:
                conditions.append("is_active = true")
            if equipment_type:
                params.append(equipment_type)
                conditions.append(f"equipment_type = ${len(params)}")
            if series:
                params.append(series)
                conditions.append(f"series = ${len(params)}")
            if search:
                params.append(f"%{search}%")
                conditions.append(f"(model_code ILIKE ${len(params)} OR model_name ILIKE ${len(params)} OR category ILIKE ${len(params)})")

            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            rows = await conn.fetch(
                f"SELECT * FROM equipment_catalog {where} ORDER BY equipment_type, sort_order, model_code",
                *params,
            )
            return [_row_to_catalog(r) for r in rows]
    except Exception as e:
        logger.error(f"카탈로그 조회 오류: {e}")
        return []


@router.get("/series", summary="시리즈 목록")
async def list_series():
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT DISTINCT equipment_type, series, category FROM equipment_catalog WHERE is_active=true ORDER BY equipment_type, series"
            )
            return [dict(r) for r in rows]
    except Exception as e:
        return []


@router.get("/{model_code}", summary="장비 카탈로그 상세")
async def get_catalog(model_code: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM equipment_catalog WHERE model_code = $1", model_code
            )
            if not row:
                raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다")
            return _row_to_catalog(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201, summary="장비 카탈로그 등록")
async def create_catalog(data: dict):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            cid = str(uuid.uuid4())
            specs = json.dumps(data.get("specs") or {})
            consumables = json.dumps(data.get("default_consumables") or [])
            row = await conn.fetchrow(
                """INSERT INTO equipment_catalog
                   (id, model_code, model_name, equipment_type, series, category,
                    description, specs, default_consumables, warranty_months,
                    sell_price, cost_price, lead_time_days, is_active, sort_order)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14,$15)
                   RETURNING *""",
                cid, data["model_code"], data["model_name"], data["equipment_type"],
                data.get("series"), data.get("category"), data.get("description"),
                specs, consumables,
                data.get("warranty_months", 12),
                data.get("sell_price"), data.get("cost_price"),
                data.get("lead_time_days", 30), data.get("is_active", True),
                data.get("sort_order", 0),
            )
            return _row_to_catalog(row)
    except Exception as e:
        logger.error(f"카탈로그 등록 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{catalog_id}", summary="장비 카탈로그 수정")
async def update_catalog(catalog_id: str, data: dict):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            fields, params = [], []
            updatable = ["model_name", "equipment_type", "series", "category", "description",
                         "warranty_months", "sell_price", "cost_price", "lead_time_days",
                         "is_active", "sort_order"]
            for k in updatable:
                if k in data:
                    params.append(data[k])
                    fields.append(f"{k}=${len(params)}")
            if "specs" in data:
                params.append(json.dumps(data["specs"]))
                fields.append(f"specs=${len(params)}::jsonb")
            if "default_consumables" in data:
                params.append(json.dumps(data["default_consumables"]))
                fields.append(f"default_consumables=${len(params)}::jsonb")
            if not fields:
                raise HTTPException(status_code=400, detail="수정할 항목이 없습니다")
            params.append(catalog_id)
            row = await conn.fetchrow(
                f"UPDATE equipment_catalog SET {', '.join(fields)}, updated_at=NOW() WHERE id=${len(params)} RETURNING *",
                *params,
            )
            if not row:
                raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다")
            return _row_to_catalog(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{catalog_id}", status_code=204, summary="장비 카탈로그 삭제(비활성)")
async def delete_catalog(catalog_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE equipment_catalog SET is_active=false, updated_at=NOW() WHERE id=$1",
                catalog_id,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/seed", summary="초기 워터닉스 제품 데이터 삽입")
async def seed_catalog():
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            inserted = 0
            for item in WATERNIX_SEED_CATALOG:
                existing = await conn.fetchval(
                    "SELECT id FROM equipment_catalog WHERE model_code=$1", item["model_code"]
                )
                if existing:
                    continue
                cid = str(uuid.uuid4())
                await conn.execute(
                    """INSERT INTO equipment_catalog
                       (id, model_code, model_name, equipment_type, series, category,
                        specs, default_consumables, warranty_months, sell_price)
                       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10)""",
                    cid, item["model_code"], item["model_name"], item["equipment_type"],
                    item.get("series"), item.get("category"),
                    json.dumps(item.get("specs", {})),
                    json.dumps(item.get("default_consumables", [])),
                    item.get("warranty_months", 12), item.get("sell_price"),
                )
                inserted += 1
            return {"inserted": inserted, "total": len(WATERNIX_SEED_CATALOG)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
