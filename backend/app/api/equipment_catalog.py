"""
워터닉스 장비 카탈로그 API (자사 제품 등록/관리)
waternix.com 카탈로그 실제 제원 기반
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

# waternix.com 카탈로그 PDF 기반 실제 제원 데이터
_DCRO_CONS = [
    {"part_no":"DCRO-SD-5","name":"세디먼트 필터 5㎛","interval_days":90},
    {"part_no":"DCRO-CF","name":"카본 블록 필터","interval_days":180},
    {"part_no":"DCRO-MEM","name":"RO/NF 멤브레인","interval_days":1095},
]
_WRO_CONS = [
    {"part_no":"WRO-SD","name":"세디먼트 필터 5㎛","interval_days":90},
    {"part_no":"WRO-CF","name":"카본 블록 필터","interval_days":180},
    {"part_no":"WRO-MEM","name":"RO 멤브레인 (TFC)","interval_days":730},
]
_WDI_CONS = [
    {"part_no":"WDI-SD","name":"세디먼트 필터","interval_days":90},
    {"part_no":"WDI-CF","name":"카본 필터","interval_days":180},
    {"part_no":"WDI-MEM","name":"RO 멤브레인","interval_days":730},
    {"part_no":"WDI-RESIN","name":"이온교환수지 (폴리셔)","interval_days":365},
]
_WSRO_CONS = [
    {"part_no":"WSRO-PF","name":"마이크로 필터","interval_days":90},
    {"part_no":"WSRO-CI","name":"약품주입 키트","interval_days":180},
    {"part_no":"WSRO-MEM","name":"해수 RO 멤브레인","interval_days":1095},
]

WATERNIX_SEED_CATALOG = [
    # ─── DCRO 시리즈 (냉각수 스케일제거) ──────────────────────────────────────
    {
        "model_code":"DCRO-T05","model_name":"DCRO-T05 냉각수 스케일제거 시스템",
        "equipment_type":"cooling","series":"DCRO","category":"냉각수처리",
        "description":"산업용 R/O 정수 필터. EDI 전처리, 금속부품 세척수, 제약, 보일러 급수, 냉각탑 등 응용. 견고한 구성 요소, 8인치 나선형(TFC) 막, 고급 제어 패널, 산업용 워터 펌프 사용.",
        "features":["EDI 전처리 적합","냉각탑 급수","8인치 TFC 막","부식방지 구성"],
        "applications":["냉각탑","보일러 급수","금속부품 세척","제약수처리"],
        "flow_rate_lph":21, "daily_volume_m3":0.5,
        "specs":{"capacity_lph":21,"daily_m3":0.5,"voltage":"220V 60Hz","dimensions":"600×400×900mm","weight_kg":69,"water_quality":"20㎲/cm"},
        "dimensions":"600×400×900mm","weight_kg":69,"power_supply":"220V 60Hz",
        "warranty_months":12,"sell_price":8500000,
        "catalog_page_url":"https://www.waternix.com/waternix_catalog/files/basic-html/page12.html",
        "default_consumables": _DCRO_CONS,
    },
    {
        "model_code":"DCRO-T10","model_name":"DCRO-T10 냉각수 스케일제거 시스템",
        "equipment_type":"cooling","series":"DCRO","category":"냉각수처리",
        "description":"DCRO-T10 산업용 냉각수 스케일제거 시스템. 시간당 42L/h 처리.",
        "features":["냉각수 스케일 99% 제거","TFC 멤브레인","산업용 고압펌프"],
        "flow_rate_lph":42, "daily_volume_m3":1.0,
        "specs":{"capacity_lph":42,"daily_m3":1.0,"voltage":"220V 60Hz","dimensions":"600×400×900mm","weight_kg":69,"water_quality":"20㎲/cm"},
        "dimensions":"600×400×900mm","weight_kg":69,"power_supply":"220V 60Hz",
        "warranty_months":12,"sell_price":12000000,"catalog_page_url":"https://www.waternix.com/waternix_catalog/files/basic-html/page12.html",
        "default_consumables": _DCRO_CONS,
    },
    {
        "model_code":"DCRO-T100","model_name":"DCRO-T100 냉각수 스케일제거 시스템",
        "equipment_type":"cooling","series":"DCRO","category":"냉각수처리",
        "description":"DCRO-T100 중형 냉각수 처리 시스템. 시간당 417L/h, 1일 10,000L 처리.",
        "flow_rate_lph":417, "daily_volume_m3":10.0,
        "specs":{"capacity_lph":417,"daily_m3":10,"voltage":"220V 60Hz","dimensions":"900×500×1700mm","weight_kg":125,"water_quality":"20㎲/cm"},
        "dimensions":"900×500×1700mm","weight_kg":125,"power_supply":"220V 60Hz",
        "warranty_months":12,"sell_price":38000000,"catalog_page_url":"https://www.waternix.com/waternix_catalog/files/basic-html/page12.html",
        "default_consumables": _DCRO_CONS,
    },
    {
        "model_code":"DCRO-T500","model_name":"DCRO-T500 냉각수 스케일제거 시스템",
        "equipment_type":"cooling","series":"DCRO","category":"냉각수처리",
        "flow_rate_lph":2083, "daily_volume_m3":50,
        "specs":{"capacity_lph":2083,"daily_m3":50,"voltage":"380V 60Hz","dimensions":"1500×1000×1500mm","weight_kg":320},
        "dimensions":"1500×1000×1500mm","weight_kg":320,"power_supply":"380V 60Hz",
        "warranty_months":12,"sell_price":95000000,"catalog_page_url":"https://www.waternix.com/waternix_catalog/files/basic-html/page12.html",
        "default_consumables": _DCRO_CONS,
    },
    {
        "model_code":"DCRO-T1000","model_name":"DCRO-T1000 냉각수 스케일제거 시스템",
        "equipment_type":"cooling","series":"DCRO","category":"냉각수처리",
        "flow_rate_lph":4160, "daily_volume_m3":100,
        "specs":{"capacity_lph":4160,"daily_m3":100,"voltage":"380V 60Hz","dimensions":"3000×1400×1600mm","weight_kg":350},
        "dimensions":"3000×1400×1600mm","weight_kg":350,"power_supply":"380V 60Hz",
        "warranty_months":12,"sell_price":175000000,"default_consumables": _DCRO_CONS,
    },
    # ─── WRO 시리즈 (역삼투압) ─────────────────────────────────────────────────
    {
        "model_code":"WRO-T500","model_name":"WRO-T500 역삼투압 정수 시스템",
        "equipment_type":"ro","series":"WRO","category":"역삼투압",
        "description":"워터닉스 역삼투압 정수 시스템. 99% 이상 이온 제거. 식음료, 반도체, 제약, 실험실 등 다양한 산업 적용.",
        "features":["이온제거율 99% 이상","고압 펌프 내장","자동 플러싱","압력 센서 모니터링"],
        "applications":["식품·음료 제조","반도체 세정수","제약 정제수","실험실 순수"],
        "flow_rate_lph":208, "daily_volume_m3":5,
        "specs":{"capacity_lph":208,"daily_m3":5,"voltage":"220V 60Hz","dimensions":"800×450×1700mm","weight_kg":115,"rejection_rate":"99%"},
        "dimensions":"800×450×1700mm","weight_kg":115,"power_supply":"220V 60Hz","removal_rate":"99%",
        "warranty_months":12,"sell_price":22000000,"default_consumables": _WRO_CONS,
    },
    {
        "model_code":"WRO-T1000","model_name":"WRO-T1000 역삼투압 정수 시스템",
        "equipment_type":"ro","series":"WRO","category":"역삼투압",
        "description":"1일 100m³ 처리 역삼투압 시스템. 380V 산업용.",
        "flow_rate_lph":4167, "daily_volume_m3":100,
        "specs":{"capacity_lph":4167,"daily_m3":100,"voltage":"380V 60Hz","dimensions":"3000×1400×1600mm","weight_kg":350,"rejection_rate":"99%"},
        "dimensions":"3000×1400×1600mm","weight_kg":350,"power_supply":"380V 60Hz","removal_rate":"99%",
        "warranty_months":12,"sell_price":175000000,"default_consumables": _WRO_CONS,
    },
    {
        "model_code":"WRO-T5000","model_name":"WRO-T5000 역삼투압 정수 시스템",
        "equipment_type":"ro","series":"WRO","category":"역삼투압",
        "flow_rate_lph":20833, "daily_volume_m3":500,
        "specs":{"capacity_lph":20833,"daily_m3":500,"voltage":"380V 60Hz","dimensions":"5000×1400×1600mm","weight_kg":450,"rejection_rate":"99%"},
        "dimensions":"5000×1400×1600mm","weight_kg":450,"power_supply":"380V 60Hz","removal_rate":"99%",
        "warranty_months":12,"sell_price":480000000,"default_consumables": _WRO_CONS,
    },
    # ─── WDI 시리즈 (초순수/DI) ────────────────────────────────────────────────
    {
        "model_code":"WDI-T05","model_name":"WDI-T05 초순수 제조 시스템",
        "equipment_type":"di","series":"WDI","category":"초순수",
        "description":"순수 시스템(탈이온수기). 98~99% 이온 제거. 스테인레스·티타늄 세척, 병원 중앙공급실, 의료기관, 실험실, 제약, 화장품, 전자부품 공장 등.",
        "features":["이온제거율 98~99%","18.2 MΩ·cm 초순수 생산","폴리셔 수지 내장","전도도 모니터링"],
        "applications":["반도체 세정","병원 중앙공급실","실험실","제약·화장품 공장"],
        "flow_rate_lph":21, "daily_volume_m3":0.5,
        "specs":{"capacity_lph":21,"daily_m3":0.5,"voltage":"220V 60Hz","dimensions":"600×400×900mm","weight_kg":69,"resistivity":"18.2 MΩ·cm"},
        "dimensions":"600×400×900mm","weight_kg":69,"power_supply":"220V 60Hz","removal_rate":"98~99%",
        "warranty_months":12,"sell_price":12000000,"catalog_page_url":"https://www.waternix.com/waternix_catalog/files/basic-html/page14.html",
        "default_consumables": _WDI_CONS,
    },
    {
        "model_code":"WDI-T100","model_name":"WDI-T100 초순수 제조 시스템",
        "equipment_type":"di","series":"WDI","category":"초순수",
        "flow_rate_lph":417, "daily_volume_m3":10,
        "specs":{"capacity_lph":417,"daily_m3":10,"voltage":"220V 60Hz","dimensions":"900×500×1700mm","weight_kg":125,"resistivity":"18.2 MΩ·cm"},
        "dimensions":"900×500×1700mm","weight_kg":125,"power_supply":"220V 60Hz","removal_rate":"98~99%",
        "warranty_months":12,"sell_price":55000000,"default_consumables": _WDI_CONS,
    },
    {
        "model_code":"WDI-T1000","model_name":"WDI-T1000 초순수 제조 시스템",
        "equipment_type":"di","series":"WDI","category":"초순수",
        "flow_rate_lph":4160, "daily_volume_m3":100,
        "specs":{"capacity_lph":4160,"daily_m3":100,"voltage":"380V 60Hz","dimensions":"3000×1400×1600mm","weight_kg":350,"resistivity":"18.2 MΩ·cm"},
        "dimensions":"3000×1400×1600mm","weight_kg":350,"power_supply":"380V 60Hz","removal_rate":"98~99%",
        "warranty_months":12,"sell_price":195000000,"default_consumables": _WDI_CONS,
    },
    # ─── WSRO 시리즈 (해수담수화) ─────────────────────────────────────────────
    {
        "model_code":"WSRO-T05","model_name":"WSRO-T05 해수담수화 시스템",
        "equipment_type":"seawater","series":"WSRO","category":"해수담수화",
        "description":"워터닉스 해수담수화 시스템. 38,000ppm 해수 처리, 99.5% 염분 제거율. 도서·해안 지역 식수 생산.",
        "features":["염분제거율 99.5%","38,000ppm 해수 처리","고압 내식성 펌프","자동 약품 주입"],
        "applications":["도서지역 식수","해안 산업용수","선박 급수","관광시설"],
        "flow_rate_lph":21, "daily_volume_m3":0.5,
        "specs":{"capacity_lph":21,"daily_m3":0.5,"voltage":"220V 60Hz","dimensions":"600×400×900mm","weight_kg":79,"salt_rejection":"99.5%","feed_salinity":"38,000ppm"},
        "dimensions":"600×400×900mm","weight_kg":79,"power_supply":"220V 60Hz","removal_rate":"99.5% (염분)",
        "warranty_months":12,"sell_price":18000000,"catalog_page_url":"https://www.waternix.com/waternix_catalog/files/basic-html/page16.html",
        "default_consumables": _WSRO_CONS,
    },
    {
        "model_code":"WSRO-T100","model_name":"WSRO-T100 해수담수화 시스템",
        "equipment_type":"seawater","series":"WSRO","category":"해수담수화",
        "flow_rate_lph":417, "daily_volume_m3":10,
        "specs":{"capacity_lph":417,"daily_m3":10,"voltage":"220V 60Hz","dimensions":"900×700×900mm","weight_kg":160,"salt_rejection":"99.5%"},
        "dimensions":"900×700×900mm","weight_kg":160,"power_supply":"220V 60Hz","removal_rate":"99.5% (염분)",
        "warranty_months":12,"sell_price":75000000,"default_consumables": _WSRO_CONS,
    },
    {
        "model_code":"WSRO-T500","model_name":"WSRO-T500 해수담수화 시스템",
        "equipment_type":"seawater","series":"WSRO","category":"해수담수화",
        "flow_rate_lph":2083, "daily_volume_m3":50,
        "specs":{"capacity_lph":2083,"daily_m3":50,"voltage":"380V 60Hz","dimensions":"1700×1000×1500mm","weight_kg":470,"salt_rejection":"99.5%"},
        "dimensions":"1700×1000×1500mm","weight_kg":470,"power_supply":"380V 60Hz","removal_rate":"99.5% (염분)",
        "warranty_months":12,"sell_price":185000000,"default_consumables": _WSRO_CONS,
    },
    {
        "model_code":"WSRO-T1000","model_name":"WSRO-T1000 해수담수화 시스템",
        "equipment_type":"seawater","series":"WSRO","category":"해수담수화",
        "flow_rate_lph":4160, "daily_volume_m3":100,
        "specs":{"capacity_lph":4160,"daily_m3":100,"voltage":"380V 60Hz","dimensions":"3000×1400×1600mm","weight_kg":350,"salt_rejection":"99.5%"},
        "dimensions":"3000×1400×1600mm","weight_kg":350,"power_supply":"380V 60Hz","removal_rate":"99.5% (염분)",
        "warranty_months":12,"sell_price":320000000,"default_consumables": _WSRO_CONS,
    },
    {
        "model_code":"WSRO-T5000","model_name":"WSRO-T5000 해수담수화 시스템",
        "equipment_type":"seawater","series":"WSRO","category":"해수담수화",
        "flow_rate_lph":20833, "daily_volume_m3":500,
        "specs":{"capacity_lph":20833,"daily_m3":500,"voltage":"380V 60Hz","dimensions":"5000×1400×1600mm","weight_kg":450,"salt_rejection":"99.5%"},
        "dimensions":"5000×1400×1600mm","weight_kg":450,"power_supply":"380V 60Hz",
        "warranty_months":12,"sell_price":850000000,"default_consumables": _WSRO_CONS,
    },
    # ─── WUF 시리즈 (양액회수·재생) ───────────────────────────────────────────
    {
        "model_code":"WUF-T200","model_name":"WUF-T200 양액회수·재생 시스템",
        "equipment_type":"uf","series":"WUF","category":"양액회수",
        "description":"농업용 양액 회수·재생 시스템. UF 막으로 양액 재사용률 90% 이상. 원수→펌프→마이크로필터→열교환→저장탱크 구성.",
        "features":["양액 재사용률 90%+","UF 분리막 사용","자동화 운전","열교환 시스템"],
        "applications":["수경재배","스마트팜","온실 양액 재이용"],
        "flow_rate_lph":200, "daily_volume_m3":4.8,
        "specs":{"capacity_lph":200,"daily_m3":4.8,"voltage":"220V 60Hz","membrane":"UF"},
        "power_supply":"220V 60Hz","warranty_months":12,"sell_price":25000000,
        "default_consumables":[{"part_no":"WUF-MEM","name":"UF 분리막","interval_days":730}],
    },
    # ─── 소형 시스템 ─────────────────────────────────────────────────────────
    {
        "model_code":"WSRO-T05-S","model_name":"소형 해수담수화 T05 (500L/d)",
        "equipment_type":"small","series":"T","category":"소형시스템",
        "description":"소형 해수담수화 시스템. 220V 가정용 전원. 도서·여행용.",
        "flow_rate_lph":21, "daily_volume_m3":0.5,
        "specs":{"capacity_lph":21,"daily_m3":0.5,"voltage":"220V","dimensions":"600×400×900mm","weight_kg":79},
        "power_supply":"220V","warranty_months":12,"sell_price":4500000,
    },
    # ─── WUV 시리즈 (UV살균) ─────────────────────────────────────────────────
    {
        "model_code":"WUV-50","model_name":"WUV-50 UV살균 시스템 50L/h",
        "equipment_type":"uv","series":"WUV","category":"UV살균",
        "description":"UV 자외선 살균 시스템. 세균·바이러스 99.9% 불활성화. 약품 미사용 친환경 살균.",
        "features":["살균률 99.9%","약품 미사용","저압수은 램프","스테인레스 챔버"],
        "flow_rate_lph":50,"specs":{"capacity_lph":50,"uv_dose":"40 mJ/cm²","voltage":"220V"},
        "power_supply":"220V","warranty_months":12,"sell_price":2800000,
        "default_consumables":[{"part_no":"WUV-LAMP","name":"UV 살균 램프","interval_days":365}],
    },
    # ─── WSF 시리즈 (연수) ───────────────────────────────────────────────────
    {
        "model_code":"WSF-500","model_name":"WSF-500 연수 시스템 500L/h",
        "equipment_type":"softener","series":"WSF","category":"연수처리",
        "description":"이온교환수지 연수 시스템. 경도 99% 제거. 보일러, 냉각탑, 세탁설비 전처리.",
        "features":["경도 제거율 99%","자동 재생 사이클","이온교환수지","유량 모니터링"],
        "flow_rate_lph":500,"specs":{"capacity_lph":500,"hardness_removal":"99%","voltage":"220V"},
        "power_supply":"220V","warranty_months":12,"sell_price":9500000,
        "default_consumables":[
            {"part_no":"WSF-RESIN","name":"이온교환수지","interval_days":1095},
            {"part_no":"WSF-SALT","name":"재생용 소금","interval_days":30},
        ],
    },
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
                         "is_active", "sort_order", "image_url", "catalog_page_url",
                         "dimensions", "weight_kg", "power_supply", "removal_rate",
                         "flow_rate_lph", "daily_volume_m3"]
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


@router.post("/seed", summary="워터닉스 제품 데이터 삽입/갱신 (UPSERT)")
async def seed_catalog():
    """waternix.com 카탈로그 기반 실제 제원 데이터를 삽입하거나 업데이트합니다."""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            inserted = skipped = updated = 0
            for item in WATERNIX_SEED_CATALOG:
                existing = await conn.fetchval(
                    "SELECT id FROM equipment_catalog WHERE model_code=$1", item["model_code"]
                )
                features = item.get("features") or []
                applications = item.get("applications") or []
                if existing:
                    # 기존 데이터 업데이트 (제원 정보 갱신)
                    await conn.execute(
                        """UPDATE equipment_catalog SET
                           model_name=$1, equipment_type=$2, series=$3, category=$4,
                           description=$5, specs=$6::jsonb, default_consumables=$7::jsonb,
                           warranty_months=$8, sell_price=$9, features=$10, applications=$11,
                           dimensions=$12, weight_kg=$13, power_supply=$14, removal_rate=$15,
                           flow_rate_lph=$16, daily_volume_m3=$17, catalog_page_url=$18,
                           updated_at=NOW()
                           WHERE model_code=$19""",
                        item["model_name"], item["equipment_type"],
                        item.get("series"), item.get("category"),
                        item.get("description"),
                        json.dumps(item.get("specs", {})),
                        json.dumps(item.get("default_consumables", [])),
                        item.get("warranty_months", 12), item.get("sell_price"),
                        features, applications,
                        item.get("dimensions"), item.get("weight_kg"),
                        item.get("power_supply"), item.get("removal_rate"),
                        item.get("flow_rate_lph"), item.get("daily_volume_m3"),
                        item.get("catalog_page_url"),
                        item["model_code"],
                    )
                    updated += 1
                else:
                    cid = str(uuid.uuid4())
                    await conn.execute(
                        """INSERT INTO equipment_catalog
                           (id, model_code, model_name, equipment_type, series, category,
                            description, specs, default_consumables, warranty_months, sell_price,
                            features, applications, dimensions, weight_kg, power_supply,
                            removal_rate, flow_rate_lph, daily_volume_m3, catalog_page_url)
                           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,
                                   $12,$13,$14,$15,$16,$17,$18,$19,$20)""",
                        cid, item["model_code"], item["model_name"], item["equipment_type"],
                        item.get("series"), item.get("category"), item.get("description"),
                        json.dumps(item.get("specs", {})),
                        json.dumps(item.get("default_consumables", [])),
                        item.get("warranty_months", 12), item.get("sell_price"),
                        features, applications,
                        item.get("dimensions"), item.get("weight_kg"),
                        item.get("power_supply"), item.get("removal_rate"),
                        item.get("flow_rate_lph"), item.get("daily_volume_m3"),
                        item.get("catalog_page_url"),
                    )
                    inserted += 1
            return {"inserted": inserted, "updated": updated, "skipped": skipped, "total": len(WATERNIX_SEED_CATALOG)}
    except Exception as e:
        logger.error(f"카탈로그 시딩 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{catalog_id}/image", summary="장비 카탈로그 이미지 URL 저장")
async def update_catalog_image(catalog_id: str, data: dict):
    """업로드된 이미지 URL을 카탈로그에 저장"""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            image_url = data.get("image_url")
            row = await conn.fetchrow(
                "UPDATE equipment_catalog SET image_url=$1, updated_at=NOW() WHERE id=$2 RETURNING id, model_code, image_url",
                image_url, catalog_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다")
            return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
