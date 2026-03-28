"""
Pydantic 스키마 정의 - API 요청/응답 모델
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
from uuid import UUID


# ─── Enums ───────────────────────────────────────────────────────────────────

class EquipmentType(str, Enum):
    ro = "ro"
    di = "di"
    seawater = "seawater"
    prefilter = "prefilter"
    uv = "uv"
    softener = "softener"
    booster = "booster"


class EquipmentStatus(str, Enum):
    normal = "normal"
    warning = "warning"
    error = "error"
    offline = "offline"
    maintenance = "maintenance"


class CommType(str, Enum):
    modbus_tcp = "modbus_tcp"
    modbus_rtu = "modbus_rtu"
    mqtt = "mqtt"
    serial = "serial"
    opcua = "opcua"
    http = "http"


class FilterType(str, Enum):
    sediment = "sediment"
    carbon = "carbon"
    ro_membrane = "ro_membrane"
    uv = "uv"
    resin = "resin"
    antiscalant = "antiscalant"


class FilterStatus(str, Enum):
    normal = "normal"
    warning = "warning"
    replace = "replace"
    replaced = "replaced"


class MaintenanceType(str, Enum):
    preventive = "preventive"
    corrective = "corrective"
    emergency = "emergency"
    inspection = "inspection"


class MaintenanceStatus(str, Enum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class AlertSeverity(str, Enum):
    critical = "critical"
    warning = "warning"
    info = "info"


class UserRole(str, Enum):
    superadmin = "superadmin"
    admin = "admin"
    technician = "technician"
    viewer = "viewer"


# ─── Company ─────────────────────────────────────────────────────────────────

class CompanyBase(BaseModel):
    name: str = Field(..., max_length=100)
    business_no: Optional[str] = None
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    status: str = "active"


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(CompanyBase):
    name: Optional[str] = None


class CompanyResponse(CompanyBase):
    id: UUID
    equipment_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Equipment ───────────────────────────────────────────────────────────────

class CommConfig(BaseModel):
    """통신 설정 (JSONB 저장)"""
    # Modbus TCP
    host: Optional[str] = None
    port: Optional[int] = None
    slave_id: Optional[int] = 1
    # MQTT
    topic: Optional[str] = None
    qos: Optional[int] = 1
    # Serial (Modbus RTU)
    serial_port: Optional[str] = None  # /dev/ttyUSB0 or COM3
    baudrate: Optional[int] = 19200
    parity: Optional[str] = "N"
    # OPC-UA
    endpoint: Optional[str] = None
    node_ids: Optional[List[str]] = None


class EquipmentBase(BaseModel):
    company_id: UUID
    serial_no: str = Field(..., max_length=50)
    model: str = Field(..., max_length=100)
    equipment_type: EquipmentType
    name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    install_date: Optional[date] = None
    warranty_end: Optional[date] = None
    capacity_lph: Optional[int] = None
    comm_type: Optional[CommType] = None
    comm_config: Optional[CommConfig] = None


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None
    status: Optional[EquipmentStatus] = None
    comm_type: Optional[CommType] = None
    comm_config: Optional[CommConfig] = None


class SensorDataResponse(BaseModel):
    equipment_id: UUID
    timestamp: datetime
    flow_rate: Optional[float] = None
    daily_volume: Optional[float] = None
    inlet_pressure: Optional[float] = None
    outlet_pressure: Optional[float] = None
    inlet_tds: Optional[int] = None
    outlet_tds: Optional[int] = None
    rejection_rate: Optional[float] = None
    temperature: Optional[float] = None
    power_kw: Optional[float] = None
    running_hours: Optional[float] = None
    error_code: Optional[str] = None

    class Config:
        from_attributes = True


class EquipmentResponse(EquipmentBase):
    id: UUID
    status: EquipmentStatus
    last_seen: Optional[datetime] = None
    company_name: Optional[str] = None
    latest_sensor: Optional[SensorDataResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EquipmentMapPoint(BaseModel):
    """지도 표시용 경량 응답"""
    id: UUID
    name: Optional[str]
    model: str
    equipment_type: EquipmentType
    status: EquipmentStatus
    lat: Optional[float]
    lng: Optional[float]
    company_name: Optional[str]
    city: Optional[str]
    last_seen: Optional[datetime]
    flow_rate: Optional[float] = None
    outlet_tds: Optional[int] = None


# ─── Filter ──────────────────────────────────────────────────────────────────

class FilterBase(BaseModel):
    equipment_id: UUID
    filter_type: FilterType
    filter_name: Optional[str] = None
    stage: Optional[int] = None
    install_date: Optional[date] = None
    replace_date: Optional[date] = None
    life_hours: Optional[int] = None
    life_volume: Optional[int] = None
    supplier: Optional[str] = None
    part_no: Optional[str] = None
    cost: Optional[float] = None


class FilterCreate(FilterBase):
    pass


class FilterResponse(FilterBase):
    id: UUID
    used_hours: float = 0
    used_volume: float = 0
    used_percent: Optional[float] = None
    status: FilterStatus
    equipment_name: Optional[str] = None
    company_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Maintenance ─────────────────────────────────────────────────────────────

class MaintenanceBase(BaseModel):
    equipment_id: UUID
    company_id: UUID
    type: MaintenanceType
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    technician: Optional[str] = None
    scheduled_date: Optional[date] = None
    labor_hours: Optional[float] = None
    cost: Optional[float] = None
    next_maintenance: Optional[date] = None


class MaintenanceCreate(MaintenanceBase):
    pass


class MaintenanceComplete(BaseModel):
    completed_date: date
    technician: str
    labor_hours: Optional[float] = None
    cost: Optional[float] = None
    description: Optional[str] = None
    parts_used: Optional[List[Dict[str, Any]]] = None
    next_maintenance: Optional[date] = None


class MaintenanceResponse(MaintenanceBase):
    id: UUID
    status: MaintenanceStatus
    completed_date: Optional[date] = None
    parts_used: Optional[List[Dict[str, Any]]] = None
    equipment_name: Optional[str] = None
    company_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Alert ───────────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: UUID
    equipment_id: UUID
    company_id: UUID
    severity: AlertSeverity
    type: str
    title: str
    message: Optional[str] = None
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    equipment_name: Optional[str] = None
    company_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AlertAcknowledge(BaseModel):
    acknowledged_by: str


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_equipment: int
    normal_count: int
    warning_count: int
    error_count: int
    offline_count: int
    maintenance_count: int
    total_companies: int
    today_volume: float
    monthly_volume: float
    pending_maintenance: int
    filter_replace: int
    unresolved_alerts: int


# ─── Auth ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_role: UserRole
    user_name: str


# ─── Telemetry (MQTT 수신용) ─────────────────────────────────────────────────

class TelemetryPayload(BaseModel):
    """MQTT telemetry 페이로드"""
    ts: Optional[int] = None              # Unix timestamp (ms)
    flow_rate: Optional[float] = None
    daily_volume: Optional[float] = None
    inlet_pressure: Optional[float] = None
    outlet_pressure: Optional[float] = None
    inlet_tds: Optional[int] = None
    outlet_tds: Optional[int] = None
    rejection_rate: Optional[float] = None
    temperature: Optional[float] = None
    power_kw: Optional[float] = None
    running_hours: Optional[float] = None
    error_code: Optional[str] = None
    raw: Optional[Dict[str, Any]] = None
