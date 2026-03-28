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
        from urllib.parse import urlparse, unquote

        raw = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        parsed = urlparse(raw)

        # 비밀번호에 특수문자(# 등)가 있을 때도 안전하게 처리
        _pool = await asyncpg.create_pool(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=unquote(parsed.password) if parsed.password else None,
            database=parsed.path.lstrip("/"),
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
