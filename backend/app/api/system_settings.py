"""
시스템 설정 API - DB 기반 설정 저장/조회
"""
import logging
from fastapi import APIRouter, HTTPException, Depends

from app.db.database import get_pool
from app.api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["시스템 설정"])


@router.get("", summary="전체 설정 조회")
async def get_all_settings():
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM system_settings ORDER BY category, key")
            return {r["key"]: {"value": r["value"], "category": r["category"], "description": r["description"]} for r in rows}
    except Exception as e:
        logger.error(f"설정 조회 오류: {e}")
        return {}


@router.get("/{category}", summary="카테고리별 설정 조회")
async def get_settings_by_category(category: str):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM system_settings WHERE category=$1 ORDER BY key", category
            )
            return {r["key"]: r["value"] for r in rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("", summary="설정 일괄 업데이트")
async def update_settings(payload: dict, current_user: dict = Depends(get_current_user)):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            for key, value in payload.items():
                await conn.execute(
                    """INSERT INTO system_settings (key, value, updated_at)
                       VALUES ($1, $2, NOW())
                       ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()""",
                    key, str(value),
                )
            return {"message": f"{len(payload)}개 설정이 저장되었습니다"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
