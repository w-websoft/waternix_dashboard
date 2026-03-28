"""
소모품/재고 관리 API 라우터
"""
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/consumables", tags=["소모품/재고"])


class ConsumableCreate(BaseModel):
    name: str
    category: str
    part_no: Optional[str] = None
    brand: Optional[str] = None
    unit: str = "ea"
    stock_qty: int = 0
    min_qty: int = 0
    unit_cost: Optional[float] = None
    supplier: Optional[str] = None
    description: Optional[str] = None


def _row_to_consumable(row) -> dict:
    d = dict(row)
    d["id"] = str(d["id"])
    if d.get("created_at"):
        d["created_at"] = d["created_at"].isoformat()
    if d.get("updated_at"):
        d["updated_at"] = d["updated_at"].isoformat()
    return d


@router.get("", summary="소모품 목록")
async def get_consumables(
    category: Optional[str] = None,
    search: Optional[str] = None,
    low_stock: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    try:
        from app.db.database import get_pool
        pool = await get_pool()
        async with pool.acquire() as conn:
            conditions = []
            params: list = []

            if category:
                params.append(category)
                conditions.append(f"category = ${len(params)}")
            if search:
                params.append(f"%{search}%")
                n = len(params)
                conditions.append(
                    f"(name ILIKE ${n} OR part_no ILIKE ${n} OR brand ILIKE ${n} OR supplier ILIKE ${n})"
                )
            if low_stock:
                conditions.append("stock_qty <= min_qty AND min_qty > 0")

            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            offset = (page - 1) * page_size
            params.extend([page_size, offset])

            rows = await conn.fetch(
                f"""
                SELECT * FROM consumables
                {where}
                ORDER BY name
                LIMIT ${len(params)-1} OFFSET ${len(params)}
                """,
                *params,
            )
            return [_row_to_consumable(r) for r in rows]
    except Exception as e:
        logger.error(f"소모품 목록 조회 오류: {e}")
        return []


@router.post("", status_code=201, summary="소모품 등록")
async def create_consumable(data: ConsumableCreate):
    try:
        from app.db.database import get_pool
        pool = await get_pool()
        async with pool.acquire() as conn:
            cid = str(uuid.uuid4())
            row = await conn.fetchrow(
                """
                INSERT INTO consumables (
                    id, name, category, part_no, brand, unit,
                    stock_qty, min_qty, unit_cost, supplier, description
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                RETURNING *
                """,
                cid,
                data.name,
                data.category,
                data.part_no,
                data.brand,
                data.unit,
                data.stock_qty,
                data.min_qty,
                data.unit_cost,
                data.supplier,
                data.description,
            )
            return _row_to_consumable(row)
    except Exception as e:
        logger.error(f"소모품 등록 오류: {e}")
        raise HTTPException(status_code=500, detail=f"소모품 등록 실패: {str(e)}")


@router.put("/{consumable_id}", summary="소모품 수정")
async def update_consumable(consumable_id: str, data: ConsumableCreate):
    try:
        from app.db.database import get_pool
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE consumables
                SET name=$1, category=$2, part_no=$3, brand=$4, unit=$5,
                    stock_qty=$6, min_qty=$7, unit_cost=$8, supplier=$9,
                    description=$10, updated_at=NOW()
                WHERE id=$11
                RETURNING *
                """,
                data.name, data.category, data.part_no, data.brand, data.unit,
                data.stock_qty, data.min_qty, data.unit_cost, data.supplier,
                data.description, consumable_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="소모품을 찾을 수 없습니다")
            return _row_to_consumable(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{consumable_id}", status_code=204, summary="소모품 삭제")
async def delete_consumable(consumable_id: str):
    try:
        from app.db.database import get_pool
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM consumables WHERE id = $1", consumable_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
