"""
장비 관리 API 라우터
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from app.models.schemas import (
    EquipmentCreate, EquipmentUpdate, EquipmentResponse,
    EquipmentMapPoint, SensorDataResponse, AlertResponse
)

router = APIRouter(prefix="/equipment", tags=["장비 관리"])


@router.get("", response_model=List[EquipmentResponse], summary="장비 목록 조회")
async def get_equipment_list(
    company_id: Optional[UUID] = Query(None, description="업체 ID 필터"),
    status: Optional[str] = Query(None, description="상태 필터 (normal/warning/error/offline/maintenance)"),
    equipment_type: Optional[str] = Query(None, description="유형 필터 (ro/di/seawater 등)"),
    city: Optional[str] = Query(None, description="지역 필터"),
    search: Optional[str] = Query(None, description="검색어 (장비명, 모델, 시리얼번호)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """
    장비 목록을 조회합니다.
    - 업체, 상태, 유형, 지역, 검색어로 필터링 가능
    - 페이징 지원
    """
    # TODO: DB 조회 구현
    # 현재는 스텁 반환
    return []


@router.post("", response_model=EquipmentResponse, status_code=201, summary="장비 등록")
async def create_equipment(data: EquipmentCreate):
    """새 장비를 등록합니다."""
    # TODO: DB 저장 구현
    raise HTTPException(status_code=501, detail="미구현")


@router.get("/map-data", response_model=List[EquipmentMapPoint], summary="지도용 장비 데이터")
async def get_map_data(
    company_id: Optional[UUID] = None,
    status: Optional[str] = None,
):
    """
    지도 표시에 최적화된 경량 장비 데이터를 반환합니다.
    최신 센서 데이터(유량, TDS)를 포함합니다.
    """
    # TODO: DB 조회 및 최신 센서 데이터 조인 구현
    return []


@router.get("/{equipment_id}", response_model=EquipmentResponse, summary="장비 상세 조회")
async def get_equipment(equipment_id: UUID):
    """특정 장비의 상세 정보를 조회합니다."""
    # TODO: DB 조회 구현
    raise HTTPException(status_code=404, detail="장비를 찾을 수 없습니다")


@router.put("/{equipment_id}", response_model=EquipmentResponse, summary="장비 수정")
async def update_equipment(equipment_id: UUID, data: EquipmentUpdate):
    """장비 정보를 수정합니다."""
    raise HTTPException(status_code=501, detail="미구현")


@router.delete("/{equipment_id}", status_code=204, summary="장비 삭제")
async def delete_equipment(equipment_id: UUID):
    """장비를 삭제합니다."""
    raise HTTPException(status_code=501, detail="미구현")


@router.get("/{equipment_id}/sensors/latest", response_model=SensorDataResponse, summary="최신 센서 데이터")
async def get_latest_sensor_data(equipment_id: UUID):
    """장비의 최신 실시간 센서 데이터를 반환합니다."""
    raise HTTPException(status_code=501, detail="미구현")


@router.get("/{equipment_id}/sensors/history", response_model=List[SensorDataResponse], summary="센서 이력 조회")
async def get_sensor_history(
    equipment_id: UUID,
    start: datetime = Query(..., description="조회 시작 시간"),
    end: datetime = Query(..., description="조회 종료 시간"),
    interval: str = Query("5m", description="집계 간격 (1m/5m/1h/1d)"),
):
    """
    장비의 센서 데이터 이력을 조회합니다.
    TimescaleDB 시계열 집계를 사용합니다.
    """
    raise HTTPException(status_code=501, detail="미구현")


@router.get("/{equipment_id}/alerts", response_model=List[AlertResponse], summary="장비 알림 목록")
async def get_equipment_alerts(equipment_id: UUID, resolved: bool = False):
    """장비의 알림/경보 목록을 조회합니다."""
    raise HTTPException(status_code=501, detail="미구현")


@router.post("/{equipment_id}/commands/{command}", summary="원격 제어 명령")
async def send_command(equipment_id: UUID, command: str):
    """
    장비에 원격 제어 명령을 전송합니다.
    지원 명령: start, stop, flush, alarm_reset
    MQTT command 토픽으로 발행됩니다.
    """
    valid_commands = ["start", "stop", "flush", "alarm_reset"]
    if command not in valid_commands:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 명령. 가능: {valid_commands}")
    # TODO: MQTT publish 구현
    raise HTTPException(status_code=501, detail="미구현")
