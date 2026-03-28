"""
워터닉스 IoT 관리 시스템 - FastAPI 메인 애플리케이션
"""
import logging
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api import equipment, companies
from app.api import consumables, maintenance
from app.db.database import init_pool, close_pool

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Socket.IO 서버 (실시간 통신)
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS,
    logger=False,
    engineio_logger=False,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 이벤트"""
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} 시작")

    # DB 연결 풀 초기화
    await init_pool()

    # MQTT 서비스 시작
    from app.services.communication.mqtt_service import MQTTService
    mqtt_service = MQTTService(
        host=settings.MQTT_HOST,
        port=settings.MQTT_PORT if not settings.MQTT_TLS_ENABLED else settings.MQTT_TLS_PORT,
        username=settings.MQTT_USERNAME,
        password=settings.MQTT_PASSWORD,
        tls_enabled=settings.MQTT_TLS_ENABLED,
        topic_prefix=settings.MQTT_TOPIC_PREFIX,
    )

    async def handle_telemetry(company_id: str, equipment_id: str, payload: dict):
        """MQTT 텔레메트리 수신 → DB 저장 → Socket.IO 브로드캐스트"""
        logger.info(f"텔레메트리 수신: {equipment_id}")
        # TODO: TimescaleDB 저장
        # TODO: 알림 조건 체크
        await sio.emit("equipment:sensor_update", {
            "equipment_id": equipment_id,
            "company_id": company_id,
            "data": payload,
        })

    async def handle_alert(company_id: str, equipment_id: str, payload: dict):
        """MQTT 알람 수신 → DB 저장 → 실시간 알림"""
        logger.warning(f"알람 수신: {equipment_id} - {payload}")
        # TODO: DB 저장, SMS/이메일 발송
        await sio.emit("alert:new", {
            "equipment_id": equipment_id,
            "company_id": company_id,
            "alert": payload,
        })

    mqtt_service.on_telemetry(lambda *args: handle_telemetry(*args))
    mqtt_service.on_alert(lambda *args: handle_alert(*args))

    try:
        mqtt_service.start()
        app.state.mqtt = mqtt_service
        logger.info("✅ MQTT 서비스 시작 완료")
    except Exception as e:
        logger.warning(f"MQTT 서비스 시작 실패 (계속 진행): {e}")

    yield

    # 종료
    if hasattr(app.state, 'mqtt'):
        app.state.mqtt.stop()
    await close_pool()
    logger.info("워터닉스 시스템 종료")


# FastAPI 앱 생성
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## 워터닉스 IoT 수처리 장비 통합 관리 시스템 API

### 주요 기능
- 🗺️ 전국 장비 실시간 모니터링 (지도)
- 📡 PLC/Modbus/MQTT/시리얼 통신 연동
- 🔧 유지보수 일정 및 이력 관리
- 💧 필터/소모품 교체 관리
- 🏢 업체(고객사) 관리
- 🚨 실시간 알림/경보 시스템

### 지원 통신 프로토콜
- **Modbus TCP**: 이더넷 연결 PLC/계측기
- **Modbus RTU**: RS485/RS232 직렬 통신
- **MQTT**: IoT 게이트웨이 연동
- **OPC-UA**: 산업용 자동화 시스템
    """,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(equipment.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(consumables.router, prefix="/api")
app.include_router(maintenance.router, prefix="/api")

# Socket.IO ASGI 앱 마운트
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


# Socket.IO 이벤트 핸들러
@sio.event
async def connect(sid, environ, auth):
    logger.info(f"클라이언트 연결: {sid}")
    await sio.emit("connected", {"message": "워터닉스 IoT 시스템 연결됨"}, to=sid)


@sio.event
async def disconnect(sid):
    logger.info(f"클라이언트 연결 해제: {sid}")


@sio.event
async def equipment_subscribe(sid, data):
    """특정 장비 실시간 모니터링 구독"""
    equipment_id = data.get("equipment_id")
    if equipment_id:
        await sio.enter_room(sid, f"equipment_{equipment_id}")
        logger.info(f"장비 구독: {sid} -> {equipment_id}")


# 기본 엔드포인트
@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse({
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/api/docs",
    })


@app.get("/api/health", tags=["시스템"])
async def health_check():
    """시스템 상태 확인"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "mqtt_connected": getattr(app.state, 'mqtt', None) and app.state.mqtt.is_connected,
    }


@app.get("/api/dashboard/summary", tags=["대시보드"])
async def get_dashboard_summary():
    """대시보드 KPI 요약 데이터"""
    # TODO: DB 집계 쿼리
    return {
        "total_equipment": 14,
        "normal_count": 8,
        "warning_count": 3,
        "error_count": 1,
        "offline_count": 1,
        "maintenance_count": 1,
        "total_companies": 8,
        "today_volume": 42690,
        "monthly_volume": 1240500,
        "pending_maintenance": 4,
        "filter_replace": 3,
        "unresolved_alerts": 6,
    }
