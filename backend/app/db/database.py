"""
asyncpg 데이터베이스 연결 풀 관리
"""
import asyncpg
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


def _parse_db_url(url: str) -> dict:
    """
    비밀번호에 특수문자(#, @, ! 등)가 포함된 DB URL 안전 파싱
    형식: postgresql[+asyncpg]://user:password@host:port/dbname
    """
    import re
    # scheme 제거
    url = re.sub(r'^postgresql(\+asyncpg)?://', '', url)
    # user:password@host:port/dbname 구조 파싱
    # @를 가장 마지막 기준으로 분리 (비밀번호에 @ 포함 가능성)
    at_idx = url.rfind('@')
    credentials = url[:at_idx]
    hostpart = url[at_idx + 1:]

    colon_idx = credentials.index(':')
    user = credentials[:colon_idx]
    password = credentials[colon_idx + 1:]

    # host:port/dbname
    slash_idx = hostpart.index('/')
    host_port = hostpart[:slash_idx]
    dbname = hostpart[slash_idx + 1:]

    if ':' in host_port:
        host, port_str = host_port.rsplit(':', 1)
        port = int(port_str)
    else:
        host = host_port
        port = 5432

    return dict(host=host, port=port, user=user, password=password, database=dbname)


async def init_pool() -> None:
    """앱 시작 시 연결 풀 초기화"""
    global _pool
    try:
        params = _parse_db_url(settings.DATABASE_URL)
        _pool = await asyncpg.create_pool(
            **params,
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
