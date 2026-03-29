"""
소모품 카탈로그 API - 워터닉스 자사 제품별 소모품 마스터 데이터
"""
import logging
import uuid
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db.database import get_pool

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/catalog", tags=["소모품 카탈로그"])


class CatalogCreate(BaseModel):
    part_no: str
    name: str
    category: Optional[str] = None          # filter/chemical/membrane/pump/sensor/other
    equipment_type: Optional[str] = None    # ro/di/cooling/seawater 등
    compatible_models: Optional[List[str]] = None  # 호환 모델 목록
    unit: str = "개"
    replace_interval_hours: Optional[int] = None  # 교체 주기 (운전시간)
    sell_price: Optional[float] = None      # 판매가
    cost_price: Optional[float] = None      # 원가
    min_order_qty: Optional[int] = 1
    supplier: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True


def _row_to_catalog(row) -> dict:
    d = dict(row)
    if d.get("compatible_models") and isinstance(d["compatible_models"], str):
        import json
        try:
            d["compatible_models"] = json.loads(d["compatible_models"])
        except Exception:
            d["compatible_models"] = []
    if d.get("created_at"):
        d["created_at"] = d["created_at"].isoformat()
    if d.get("updated_at"):
        d["updated_at"] = d["updated_at"].isoformat()
    return d


@router.get("", summary="소모품 카탈로그 목록")
async def get_catalog(
    equipment_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    model: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            conditions = ["is_active = true"]
            params: list = []

            if equipment_type:
                params.append(equipment_type)
                conditions.append(f"equipment_type = ${len(params)}")
            if category:
                params.append(category)
                conditions.append(f"category = ${len(params)}")
            if model:
                params.append(f'%"{model}"%')
                conditions.append(f"compatible_models::text ILIKE ${len(params)}")
            if search:
                params.append(f"%{search}%")
                n = len(params)
                conditions.append(
                    f"(name ILIKE ${n} OR part_no ILIKE ${n} OR supplier ILIKE ${n})"
                )

            where = f"WHERE {' AND '.join(conditions)}"
            offset = (page - 1) * page_size
            params.extend([page_size, offset])

            rows = await conn.fetch(
                f"""
                SELECT * FROM consumable_catalog
                {where}
                ORDER BY equipment_type, name
                LIMIT ${len(params)-1} OFFSET ${len(params)}
                """,
                *params,
            )
            return [_row_to_catalog(r) for r in rows]
    except Exception as e:
        logger.error(f"카탈로그 목록 조회 오류: {e}")
        return []


@router.get("/by-model/{model}", summary="장비 모델별 소모품 조회")
async def get_catalog_by_model(model: str):
    """특정 장비 모델에 호환되는 소모품 목록"""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM consumable_catalog
                WHERE is_active = true
                  AND compatible_models::text ILIKE $1
                ORDER BY name
                """,
                f'%"{model}"%',
            )
            return [_row_to_catalog(r) for r in rows]
    except Exception as e:
        logger.error(f"모델별 카탈로그 조회 오류: {e}")
        return []


@router.post("", status_code=201, summary="소모품 카탈로그 등록")
async def create_catalog(data: CatalogCreate):
    try:
        import json
        pool = await get_pool()
        async with pool.acquire() as conn:
            cid = str(uuid.uuid4())
            compatible_json = json.dumps(data.compatible_models or [])
            row = await conn.fetchrow(
                """
                INSERT INTO consumable_catalog (
                    id, part_no, name, category, equipment_type,
                    compatible_models, unit, replace_interval_hours,
                    sell_price, cost_price, min_order_qty, supplier,
                    description, is_active
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                RETURNING *
                """,
                cid, data.part_no, data.name, data.category, data.equipment_type,
                compatible_json, data.unit, data.replace_interval_hours,
                data.sell_price, data.cost_price, data.min_order_qty or 1,
                data.supplier, data.description, data.is_active,
            )
            return _row_to_catalog(row)
    except Exception as e:
        logger.error(f"카탈로그 등록 오류: {e}")
        raise HTTPException(status_code=500, detail=f"카탈로그 등록 실패: {str(e)}")


@router.put("/{catalog_id}", summary="소모품 카탈로그 수정")
async def update_catalog(catalog_id: str, data: CatalogCreate):
    try:
        import json
        pool = await get_pool()
        async with pool.acquire() as conn:
            compatible_json = json.dumps(data.compatible_models or [])
            row = await conn.fetchrow(
                """
                UPDATE consumable_catalog
                SET part_no=$1, name=$2, category=$3, equipment_type=$4,
                    compatible_models=$5, unit=$6, replace_interval_hours=$7,
                    sell_price=$8, cost_price=$9, min_order_qty=$10, supplier=$11,
                    description=$12, is_active=$13, updated_at=NOW()
                WHERE id=$14
                RETURNING *
                """,
                data.part_no, data.name, data.category, data.equipment_type,
                compatible_json, data.unit, data.replace_interval_hours,
                data.sell_price, data.cost_price, data.min_order_qty or 1,
                data.supplier, data.description, data.is_active, catalog_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="카탈로그 항목을 찾을 수 없습니다")
            return _row_to_catalog(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{catalog_id}", status_code=204, summary="소모품 카탈로그 삭제")
async def delete_catalog(catalog_id: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE consumable_catalog SET is_active=false WHERE id=$1",
                catalog_id
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/seed", summary="초기 카탈로그 데이터 생성 (최초 1회)")
async def seed_catalog():
    """워터닉스 전 제품군 소모품 카탈로그 초기 데이터 생성"""
    import json
    pool = await get_pool()

    CATALOG_DATA = [
        # ── DCRO (냉각수 스케일제거) ──
        ("DCRO-SD-5", "세디먼트 필터 5㎛ (소형)", "filter", "cooling",
         ["DCRO-T50","DCRO-T100"], "개", 2000, None, None),
        ("DCRO-SD-5-L", "세디먼트 필터 5㎛ (대형)", "filter", "cooling",
         ["DCRO-T500","DCRO-T1000"], "개", 1500, None, None),
        ("DCRO-AC", "활성탄 필터 (소형)", "filter", "cooling",
         ["DCRO-T50","DCRO-T100"], "개", 4000, None, None),
        ("DCRO-MEM-NF", "NF 멤브레인 (소형)", "membrane", "cooling",
         ["DCRO-T50","DCRO-T100"], "개", 8760, None, None),
        ("DCRO-MEM-NF4", "NF 멤브레인 4인치", "membrane", "cooling",
         ["DCRO-T500","DCRO-T1000"], "개", 8760, None, None),
        ("DCRO-MEM-NF8", "NF 멤브레인 8인치", "membrane", "cooling",
         ["DCRO-T5000","DCRO-T10000"], "개", 8760, None, None),
        ("DCRO-ANT", "Antiscalant 스케일방지제 (10L)", "chemical", "cooling",
         ["DCRO-T50","DCRO-T100"], "L", 720, None, None),
        ("DCRO-ANT-20L", "Antiscalant 스케일방지제 (20L)", "chemical", "cooling",
         ["DCRO-T500","DCRO-T1000"], "L", 360, None, None),
        ("DCRO-ANT-200L", "Antiscalant 스케일방지제 (200L)", "chemical", "cooling",
         ["DCRO-T5000","DCRO-T10000"], "L", 360, None, None),
        ("DCRO-SEAL", "고압펌프 씰 키트 (소형)", "pump", "cooling",
         ["DCRO-T50","DCRO-T100"], "set", 8760, None, None),
        ("DCRO-SEAL-L", "고압펌프 씰 키트 (중형)", "pump", "cooling",
         ["DCRO-T500","DCRO-T1000"], "set", 8760, None, None),
        ("DCRO-SEAL-XL", "고압펌프 씰 키트 (대형)", "pump", "cooling",
         ["DCRO-T5000","DCRO-T10000"], "set", 8760, None, None),

        # ── WRO (역삼투압) ──
        ("WRO-SD-5", "세디먼트 필터 5㎛", "filter", "ro",
         ["WRO-T50","WRO-T100"], "개", 2000, None, None),
        ("WRO-SD-5-L", "세디먼트 필터 5㎛ (대형)", "filter", "ro",
         ["WRO-T500","WRO-T1000"], "개", 1500, None, None),
        ("WRO-CTO", "활성탄 블록 필터 (CTO)", "filter", "ro",
         ["WRO-T50","WRO-T100"], "개", 4000, None, None),
        ("WRO-MEM-50", "RO 멤브레인 (소형 50L/h)", "membrane", "ro",
         ["WRO-T50"], "개", 8760, None, None),
        ("WRO-MEM-100", "RO 멤브레인 4인치 (100L/h)", "membrane", "ro",
         ["WRO-T100"], "개", 8760, None, None),
        ("WRO-MEM-4", "RO 멤브레인 4인치", "membrane", "ro",
         ["WRO-T500","WRO-T1000"], "개", 8760, None, None),
        ("WRO-MEM-8", "RO 멤브레인 8인치", "membrane", "ro",
         ["WRO-T5000","WRO-T10000"], "개", 8760, None, None),
        ("WRO-POST", "후처리 인라인 필터", "filter", "ro",
         ["WRO-T50","WRO-T100"], "개", 6000, None, None),
        ("WRO-ANT", "스케일 방지제 (10L)", "chemical", "ro",
         ["WRO-T500"], "L", 720, None, None),
        ("WRO-ANT-20", "스케일 방지제 (20L)", "chemical", "ro",
         ["WRO-T1000"], "L", 360, None, None),
        ("WRO-ANT-200", "스케일 방지제 (200L)", "chemical", "ro",
         ["WRO-T5000","WRO-T10000"], "L", 360, None, None),
        ("WRO-SEAL", "고압펌프 씰 키트 (소형)", "pump", "ro",
         ["WRO-T100","WRO-T500"], "set", 8760, None, None),
        ("WRO-SEAL-L", "고압펌프 씰 키트 (중형)", "pump", "ro",
         ["WRO-T1000"], "set", 8760, None, None),
        ("WRO-SEAL-XL", "고압펌프 씰 키트 (대형)", "pump", "ro",
         ["WRO-T5000","WRO-T10000"], "set", 8760, None, None),

        # ── WDI (초순수) ──
        ("WDI-MEM", "RO 멤브레인 (소형)", "membrane", "di",
         ["WDI-T50"], "개", 8760, None, None),
        ("WDI-MEM-4", "RO 멤브레인 4인치", "membrane", "di",
         ["WDI-T100","WDI-T500","WDI-T1000"], "개", 8760, None, None),
        ("WDI-MEM-8", "RO 멤브레인 8인치", "membrane", "di",
         ["WDI-T5000","WDI-T10000"], "개", 8760, None, None),
        ("WDI-RESIN-MB", "혼합 이온교환 수지 (MB) 10L", "chemical", "di",
         ["WDI-T50","WDI-T100"], "L", 4380, None, None),
        ("WDI-RESIN-MB-25", "혼합 이온교환 수지 (MB) 25L", "chemical", "di",
         ["WDI-T500"], "L", 4380, None, None),
        ("WDI-RESIN-MB-50", "혼합 이온교환 수지 (MB) 50L", "chemical", "di",
         ["WDI-T1000"], "L", 4380, None, None),
        ("WDI-RESIN-MB-200", "혼합 이온교환 수지 (MB) 200L", "chemical", "di",
         ["WDI-T5000"], "L", 4380, None, None),
        ("WDI-RESIN-MB-500", "혼합 이온교환 수지 (MB) 500L", "chemical", "di",
         ["WDI-T10000"], "L", 4380, None, None),
        ("WDI-RESIN-C", "양이온 교환 수지 10L", "chemical", "di",
         ["WDI-T50","WDI-T100"], "L", 8760, None, None),
        ("WDI-RESIN-A", "음이온 교환 수지 10L", "chemical", "di",
         ["WDI-T50","WDI-T100"], "L", 8760, None, None),

        # ── WSRO (해수담수화) ──
        ("WSRO-MEM-4", "SWRO 멤브레인 4인치", "membrane", "seawater",
         ["WSRO-T50","WSRO-T100","WSRO-T500","WSRO-T1000"], "개", 8760, None, None),
        ("WSRO-MEM-8", "SWRO 멤브레인 8인치", "membrane", "seawater",
         ["WSRO-T5000","WSRO-T10000"], "개", 8760, None, None),
        ("WSRO-ANT", "Antiscalant 해수용 (10L)", "chemical", "seawater",
         ["WSRO-T50","WSRO-T100"], "L", 720, None, None),
        ("WSRO-ANT-20", "Antiscalant 해수용 (20L)", "chemical", "seawater",
         ["WSRO-T500","WSRO-T1000"], "L", 360, None, None),
        ("WSRO-ANT-200", "Antiscalant 해수용 (200L)", "chemical", "seawater",
         ["WSRO-T5000","WSRO-T10000"], "L", 360, None, None),
        ("WSRO-SD", "세디먼트 필터 5㎛ (해수용)", "filter", "seawater",
         ["WSRO-T50","WSRO-T100","WSRO-T500","WSRO-T1000"], "개", 1000, None, None),
        ("WSRO-SEAL", "고압펌프 씰 키트 (소형)", "pump", "seawater",
         ["WSRO-T50","WSRO-T100","WSRO-T500","WSRO-T1000"], "set", 8760, None, None),
        ("WSRO-SEAL-L", "고압펌프 씰 키트 (중형)", "pump", "seawater",
         ["WSRO-T500","WSRO-T1000"], "set", 8760, None, None),
        ("WSRO-SEAL-XL", "고압펌프 씰 키트 (대형)", "pump", "seawater",
         ["WSRO-T5000","WSRO-T10000"], "set", 8760, None, None),

        # ── WUF (양액회수·재생) ──
        ("WUF-MEM-HF", "UF 중공사 멤브레인 (소형)", "membrane", "uf",
         ["WUF-T50"], "개", 17520, None, None),
        ("WUF-MEM-HF-L", "UF 중공사 멤브레인 (대형)", "membrane", "uf",
         ["WUF-T100"], "개", 17520, None, None),
        ("WUF-CLEAN-ALK", "UF 세정제 알칼리", "chemical", "uf",
         ["WUF-T50","WUF-T100"], "kg", 168, None, None),
        ("WUF-CLEAN-ACD", "UF 세정제 산성", "chemical", "uf",
         ["WUF-T50","WUF-T100"], "kg", 168, None, None),
        ("WUF-UV-LAMP", "UV 살균 램프 (UF용)", "other", "uf",
         ["WUF-T50","WUF-T100"], "개", 8000, None, None),

        # ── Small (소형 시스템) ──
        ("T05-SD", "세디먼트 필터 (T05용)", "filter", "small",
         ["T05"], "개", 2000, None, None),
        ("T05-CTO", "활성탄 블록 필터 (T05용)", "filter", "small",
         ["T05"], "개", 4000, None, None),
        ("T05-MEM", "RO 멤브레인 소형 (T05용)", "membrane", "small",
         ["T05"], "개", 8760, None, None),
        ("T05-POST", "후처리 인라인 필터 (T05용)", "filter", "small",
         ["T05"], "개", 6000, None, None),
        ("T20-SD", "세디먼트 필터 (T20용)", "filter", "small",
         ["T20"], "개", 2000, None, None),
        ("T20-CTO", "활성탄 블록 필터 (T20용)", "filter", "small",
         ["T20"], "개", 4000, None, None),
        ("T20-MEM", "RO 멤브레인 소형 (T20용)", "membrane", "small",
         ["T20"], "개", 8760, None, None),

        # ── WUV (UV살균) ──
        ("WUV-LAMP-10", "UV 살균 램프 (T10용)", "other", "uv",
         ["WUV-T10"], "개", 8000, None, None),
        ("WUV-LAMP-30", "UV 살균 램프 (T30용)", "other", "uv",
         ["WUV-T30"], "개", 8000, None, None),
        ("WUV-LAMP-100", "UV 살균 램프 (T100용)", "other", "uv",
         ["WUV-T100"], "개", 8000, None, None),
        ("WUV-QS-10", "석영 슬리브 Quartz Sleeve (T10)", "other", "uv",
         ["WUV-T10"], "개", 17520, None, None),
        ("WUV-QS-30", "석영 슬리브 Quartz Sleeve (T30)", "other", "uv",
         ["WUV-T30"], "개", 17520, None, None),
        ("WUV-QS-100", "석영 슬리브 Quartz Sleeve (T100)", "other", "uv",
         ["WUV-T100"], "개", 17520, None, None),
        ("WUV-CTRL", "UV 컨트롤러 보드", "other", "uv",
         ["WUV-T100"], "개", 35040, None, None),

        # ── WSF (연수 시스템) ──
        ("WSF-RESIN-NA", "양이온 교환 수지 Na형 10L", "chemical", "softener",
         ["WSF-T100"], "L", 17520, None, None),
        ("WSF-RESIN-NA-50", "양이온 교환 수지 Na형 50L", "chemical", "softener",
         ["WSF-T500"], "L", 17520, None, None),
        ("WSF-RESIN-NA-200", "양이온 교환 수지 Na형 200L", "chemical", "softener",
         ["WSF-T2000"], "L", 17520, None, None),
        ("WSF-SALT", "재생용 소금 (NaCl) 25kg", "chemical", "softener",
         ["WSF-T100","WSF-T500"], "kg", 720, None, None),
        ("WSF-SALT-25", "재생용 소금 (NaCl) 25kg (대용량용)", "chemical", "softener",
         ["WSF-T500","WSF-T2000"], "kg", 360, None, None),

        # ── WFF (여과 시스템) ──
        ("WFF-ANT", "안트라사이트 여과재 25kg", "filter", "filtration",
         ["WFF-T100"], "kg", 26280, None, None),
        ("WFF-ANT-50", "안트라사이트 여과재 50kg", "filter", "filtration",
         ["WFF-T500"], "kg", 26280, None, None),
        ("WFF-ANT-200", "안트라사이트 여과재 200kg", "filter", "filtration",
         ["WFF-T2000"], "kg", 26280, None, None),
        ("WFF-SAND", "샌드 여과재 25kg", "filter", "filtration",
         ["WFF-T100"], "kg", 26280, None, None),
        ("WFF-SAND-50", "샌드 여과재 50kg", "filter", "filtration",
         ["WFF-T500"], "kg", 26280, None, None),
        ("WFF-SAND-200", "샌드 여과재 200kg", "filter", "filtration",
         ["WFF-T2000"], "kg", 26280, None, None),
        ("WFF-BWA", "역세척 보조제 10L", "chemical", "filtration",
         ["WFF-T100","WFF-T500","WFF-T2000"], "L", 8760, None, None),

        # ── WBP (부스터펌프) ──
        ("WBP-SEAL-30", "임펠러 씰 키트 30LPM", "pump", "booster",
         ["WBP-T30"], "set", 8760, None, None),
        ("WBP-SEAL-100", "임펠러 씰 키트 100LPM", "pump", "booster",
         ["WBP-T100"], "set", 8760, None, None),
        ("WBP-SEAL-500", "임펠러 씰 키트 500LPM (대형)", "pump", "booster",
         ["WBP-T500"], "set", 8760, None, None),
        ("WBP-BEARING", "베어링 세트 중형", "pump", "booster",
         ["WBP-T100"], "set", 17520, None, None),
        ("WBP-BEARING-L", "베어링 세트 대형", "pump", "booster",
         ["WBP-T500"], "set", 17520, None, None),
        ("WBP-COUPLING", "커플링", "pump", "booster",
         ["WBP-T30","WBP-T100"], "개", 17520, None, None),

        # ── 전처리 (WPF) ──
        ("WPF-SD-5", "세디먼트 카트리지 5㎛", "filter", "prefilter",
         ["WPF-SD"], "개", 2000, None, None),
        ("WPF-SD-1", "세디먼트 카트리지 1㎛", "filter", "prefilter",
         ["WPF-SD"], "개", 1000, None, None),
        ("WPF-AC-CTO", "활성탄 블록 CTO 카트리지", "filter", "prefilter",
         ["WPF-AC"], "개", 4000, None, None),
        ("WPF-AC-GAC", "입상 활성탄 (GAC) 10kg", "filter", "prefilter",
         ["WPF-AC"], "kg", 8760, None, None),
        ("WPF-MM-ANT", "안트라사이트 멀티미디어", "filter", "prefilter",
         ["WPF-MM"], "kg", 26280, None, None),
        ("WPF-MM-SAND", "샌드 멀티미디어", "filter", "prefilter",
         ["WPF-MM"], "kg", 26280, None, None),
        ("WPF-MM-GRV", "그라벨 멀티미디어", "filter", "prefilter",
         ["WPF-MM"], "kg", 52560, None, None),
    ]

    try:
        async with pool.acquire() as conn:
            # 테이블 존재 확인
            exists = await conn.fetchval(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'consumable_catalog')"
            )
            if not exists:
                return {"status": "error", "message": "consumable_catalog 테이블이 없습니다. DB 마이그레이션을 먼저 실행하세요."}

            inserted = 0
            skipped = 0
            for row_data in CATALOG_DATA:
                part_no, name, category, eq_type, models, unit, hours, sell, cost = row_data
                existing = await conn.fetchval(
                    "SELECT id FROM consumable_catalog WHERE part_no = $1", part_no
                )
                if existing:
                    skipped += 1
                    continue
                cid = str(uuid.uuid4())
                models_json = json.dumps(models)
                await conn.execute(
                    """
                    INSERT INTO consumable_catalog
                    (id, part_no, name, category, equipment_type, compatible_models,
                     unit, replace_interval_hours, sell_price, cost_price,
                     min_order_qty, supplier, is_active)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                    """,
                    cid, part_no, name, category, eq_type, models_json,
                    unit, hours, sell, cost, 1, "워터닉스(자사)", True,
                )
                inserted += 1
            return {"status": "ok", "inserted": inserted, "skipped": skipped}
    except Exception as e:
        logger.error(f"카탈로그 시드 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))
