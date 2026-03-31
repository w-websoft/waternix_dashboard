"""
파일 업로드 API (장비 이미지 등)
"""
import os
import uuid
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/uploads", tags=["파일 업로드"])

UPLOAD_DIR = Path("/opt/waternix/uploads")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB


def ensure_dir(subdir: str = "") -> Path:
    target = UPLOAD_DIR / subdir if subdir else UPLOAD_DIR
    target.mkdir(parents=True, exist_ok=True)
    return target


@router.post("/image", summary="이미지 업로드")
async def upload_image(
    file: UploadFile = File(...),
    category: str = "catalog",
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="JPG, PNG, WebP, GIF만 허용됩니다")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다")

    ext = Path(file.filename or "img.jpg").suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    save_dir = ensure_dir(category)
    save_path = save_dir / filename

    with open(save_path, "wb") as f:
        f.write(content)

    url = f"/api/uploads/{category}/{filename}"
    return {"url": url, "filename": filename, "size": len(content)}


@router.get("/{category}/{filename}", summary="이미지 조회", include_in_schema=False)
async def get_image(category: str, filename: str):
    path = UPLOAD_DIR / category / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
    return FileResponse(str(path))
