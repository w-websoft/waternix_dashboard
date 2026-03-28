"""
업체(고객사) 관리 API 라우터
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from uuid import UUID

from app.models.schemas import CompanyCreate, CompanyUpdate, CompanyResponse, EquipmentResponse

router = APIRouter(prefix="/companies", tags=["업체 관리"])


@router.get("", response_model=List[CompanyResponse], summary="업체 목록")
async def get_companies(
    city: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    return []


@router.post("", response_model=CompanyResponse, status_code=201, summary="업체 등록")
async def create_company(data: CompanyCreate):
    raise HTTPException(status_code=501, detail="미구현")


@router.get("/{company_id}", response_model=CompanyResponse, summary="업체 상세")
async def get_company(company_id: UUID):
    raise HTTPException(status_code=404, detail="업체를 찾을 수 없습니다")


@router.put("/{company_id}", response_model=CompanyResponse, summary="업체 수정")
async def update_company(company_id: UUID, data: CompanyUpdate):
    raise HTTPException(status_code=501, detail="미구현")


@router.get("/{company_id}/equipment", response_model=List[EquipmentResponse], summary="업체별 장비 목록")
async def get_company_equipment(company_id: UUID):
    return []
