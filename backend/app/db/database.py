"""
asyncpg 데이터베이스 연결 풀 관리
"""
import asyncpg
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def init_pool() -> None:
    """앱 시작 시 연결 풀 초기화"""
    global _pool
    try:
        db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        _pool = await asyncpg.create_pool(
            db_url,
            min_size=2,
            max_size=10,
            command_timeout=30,
        )
        logger.info("✅ DB 연결 풀 생성 완료")
    except Exception as e:
        logger.error(f"❌ DB 연결 풀 생성 실패: {e}")
        _pool = None


async def close_pool() -> None:
    """앱 종료 시 연결 풀 해제"""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("DB 연결 풀 종료")


async def get_pool() -> asyncpg.Pool:
    """연결 풀 반환 (없으면 재시도)"""
    global _pool
    if _pool is None:
        await init_pool()
    if _pool is None:
        raise RuntimeError("DB 연결 불가")
    return _pool
