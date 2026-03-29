"""
인증 API - 로그인/로그아웃/토큰 검증 (users 테이블 연동)
"""
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import settings
from app.db.database import get_pool

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["인증"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

ALGORITHM = "HS256"
ROLE_LABELS = {
    "superadmin": "슈퍼관리자",
    "manager": "관리자",
    "technician": "기술자",
    "viewer": "조회자",
}


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="인증이 필요합니다")
    return verify_token(credentials.credentials)


@router.post("/login", response_model=TokenResponse, summary="로그인")
async def login(data: LoginRequest):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE username = $1 AND is_active = true",
                data.username,
            )

        # users 테이블 미매칭이면 config 관리자 계정으로 fallback
        if not user:
            if data.username == settings.ADMIN_USERNAME and data.password == settings.ADMIN_PASSWORD:
                token = create_access_token(
                    data={"sub": settings.ADMIN_USERNAME, "email": settings.ADMIN_EMAIL,
                          "role": "superadmin", "name": "슈퍼 관리자"},
                )
                return TokenResponse(
                    access_token=token,
                    expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                    user={"username": settings.ADMIN_USERNAME, "email": settings.ADMIN_EMAIL,
                          "name": "슈퍼 관리자", "role": "superadmin"},
                )
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다")

        if not pwd_context.verify(data.password, user["hashed_password"]):
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다")

        token = create_access_token(
            data={
                "sub": user["username"],
                "email": user["email"],
                "role": user["role"],
                "name": user["full_name"] or user["username"],
                "user_id": user["id"],
            },
        )
        return TokenResponse(
            access_token=token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "username": user["username"],
                "email": user["email"],
                "name": user["full_name"] or user["username"],
                "role": user["role"],
                "role_label": ROLE_LABELS.get(user["role"], user["role"]),
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"로그인 오류: {e}")
        raise HTTPException(status_code=500, detail="로그인 처리 중 오류가 발생했습니다")


@router.post("/change-password", summary="비밀번호 변경")
async def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE username = $1",
                current_user.get("sub"),
            )
            if not user:
                raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
            if not pwd_context.verify(data.current_password, user["hashed_password"]):
                raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다")
            if len(data.new_password) < 8:
                raise HTTPException(status_code=400, detail="새 비밀번호는 8자 이상이어야 합니다")
            new_hash = pwd_context.hash(data.new_password)
            await conn.execute(
                "UPDATE users SET hashed_password=$1, updated_at=NOW() WHERE id=$2",
                new_hash, user["id"],
            )
            return {"message": "비밀번호가 변경되었습니다"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me", summary="현재 사용자 정보")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user.get("sub"),
        "email": current_user.get("email"),
        "name": current_user.get("name", "관리자"),
        "role": current_user.get("role", "admin"),
        "role_label": ROLE_LABELS.get(current_user.get("role", ""), "관리자"),
    }


@router.get("/users", summary="사용자 목록 (관리자)")
async def list_users(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("superadmin", "manager"):
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY created_at"
            )
            return [dict(r) | {"created_at": r["created_at"].isoformat() if r["created_at"] else None} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users", status_code=201, summary="사용자 추가")
async def create_user(payload: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="슈퍼관리자만 사용자를 추가할 수 있습니다")
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            hashed = pwd_context.hash(payload.get("password", "Waternix2026!"))
            uid = str(uuid.uuid4())
            row = await conn.fetchrow(
                """INSERT INTO users (id, username, email, hashed_password, full_name, role)
                   VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, username, email, full_name, role, is_active""",
                uid, payload["username"], payload["email"], hashed,
                payload.get("full_name", payload["username"]),
                payload.get("role", "viewer"),
            )
            return dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/users/{user_id}", summary="사용자 수정")
async def update_user(user_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            fields, params = [], []
            for k in ("full_name", "role", "is_active"):
                if k in payload:
                    params.append(payload[k])
                    fields.append(f"{k}=${len(params)}")
            if not fields:
                raise HTTPException(status_code=400, detail="수정할 항목이 없습니다")
            params.append(user_id)
            await conn.execute(
                f"UPDATE users SET {', '.join(fields)}, updated_at=NOW() WHERE id=${len(params)}",
                *params,
            )
            return {"message": "수정되었습니다"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/users/{user_id}", status_code=204, summary="사용자 비활성화")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE users SET is_active=false, updated_at=NOW() WHERE id=$1", user_id
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/logout", summary="로그아웃")
async def logout():
    return {"message": "로그아웃되었습니다"}


@router.post("/verify", summary="토큰 검증")
async def verify(current_user: dict = Depends(get_current_user)):
    return {"valid": True, "user": current_user.get("sub")}
