# 워터닉스(WATERNIX) IoT 수처리 장비 통합 관리 시스템

> **전국 역삼투압(RO) 및 수처리 장비 실시간 모니터링 · 유지보수 · 업체 관리 통합 플랫폼**

---

## 📋 시스템 소개

워터닉스(주)가 전국에 납품·설치한 수처리 장비(역삼투압 RO, 초순수 DI, 해수담수화, UV 살균 등)를 실시간으로 모니터링하고, PLC/시리얼/MQTT 등 다양한 통신 프로토콜로 데이터를 수집하여 유지보수와 소모품을 효율적으로 관리하는 온라인 통합 관리 시스템입니다.

## 🏗️ 시스템 아키텍처

```
현장 장비 (RO/DI/해수담수화)
    ↓ RS485/RS232/Modbus
현장 IoT 게이트웨이 (Edge Device)
    ↓ MQTT over 4G/LTE/WiFi
MQTT 브로커 (Eclipse Mosquitto)
    ↓
FastAPI 백엔드 (Python 3.11)
    ↓                     ↓
PostgreSQL + TimescaleDB   Socket.IO (WebSocket)
                              ↓
                    Next.js 대시보드 (웹 브라우저)
```

## 🛠️ 기술 스택

### 프론트엔드
- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** 반응형 UI
- **Leaflet** 한국 지도 시각화
- **Recharts** 실시간 센서 차트
- **Socket.IO Client** 실시간 업데이트

### 백엔드
- **FastAPI** (Python 3.11) REST API + WebSocket
- **SQLAlchemy 2.0** + **Alembic** DB ORM/마이그레이션
- **Socket.IO** 실시간 데이터 푸시
- **Celery + Redis** 배경 태스크 (알림 발송, 집계)

### 산업용 통신 (핵심)
| 라이브러리 | 프로토콜 | 용도 |
|-----------|---------|------|
| **pymodbus 3.x** | Modbus TCP/RTU | PLC, 인버터, 계측기 |
| **pyserial** | RS232/RS485 | 직렬 통신 장비 |
| **paho-mqtt** | MQTT v5 | IoT 게이트웨이 |
| **asyncua** | OPC-UA | 산업 자동화 시스템 |

### 데이터베이스
- **PostgreSQL 15** + **TimescaleDB** (시계열 센서 데이터)
- **Redis** 캐시/세션

### 인프라
- **Docker Compose** 컨테이너화
- **Eclipse Mosquitto** MQTT 브로커
- **Nginx** 리버스 프록시

---

## 🚀 빠른 시작

### 개발 환경 (프론트엔드)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### 개발 환경 (백엔드)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env

# 실행
uvicorn app.main:socket_app --reload --port 8000
# → http://localhost:8000/api/docs
```

### Docker Compose (전체 시스템)

```bash
# 전체 시스템 시작
docker-compose up -d

# 서비스 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f backend

# 종료
docker-compose down
```

### 접속 URL
| 서비스 | URL |
|--------|-----|
| 대시보드 | http://localhost:3000 |
| API 문서 (Swagger) | http://localhost:8000/api/docs |
| API 문서 (ReDoc) | http://localhost:8000/api/redoc |
| MQTT 브로커 | mqtt://localhost:1883 |

---

## 📁 프로젝트 구조

```
water_dashboard/
├── docs/
│   └── SYSTEM_DESIGN.md          # 시스템 설계 문서
├── frontend/                      # Next.js 프론트엔드
│   ├── src/
│   │   ├── app/                   # 페이지 (App Router)
│   │   │   ├── page.tsx           # 메인 대시보드
│   │   │   ├── equipment/         # 장비 관리
│   │   │   ├── companies/         # 업체 관리
│   │   │   ├── maintenance/       # 유지보수
│   │   │   ├── consumables/       # 소모품/필터
│   │   │   ├── alerts/            # 알림 관리
│   │   │   ├── reports/           # 보고서
│   │   │   └── settings/          # 시스템 설정
│   │   ├── components/
│   │   │   ├── layout/            # 레이아웃 (Sidebar, Header)
│   │   │   ├── map/               # Leaflet 지도
│   │   │   └── dashboard/         # 대시보드 위젯
│   │   ├── lib/
│   │   │   ├── mock-data.ts       # 샘플 데이터
│   │   │   └── utils.ts           # 유틸리티
│   │   └── types/index.ts         # TypeScript 타입 정의
│   └── package.json
├── backend/                       # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py                # 앱 진입점 + Socket.IO
│   │   ├── core/config.py         # 환경 설정
│   │   ├── api/                   # REST API 라우터
│   │   │   ├── equipment.py       # 장비 API
│   │   │   └── companies.py       # 업체 API
│   │   ├── models/schemas.py      # Pydantic 스키마
│   │   └── services/communication/
│   │       ├── modbus_service.py  # Modbus TCP/RTU
│   │       ├── mqtt_service.py    # MQTT 클라이언트
│   │       └── serial_service.py  # RS232/RS485
│   ├── requirements.txt
│   └── Dockerfile
├── mosquitto/config/              # MQTT 브로커 설정
├── docker-compose.yml
└── README.md
```

---

## 🔌 통신 프로토콜 연동

### Modbus TCP (이더넷 PLC 연동)
```python
from app.services.communication import ModbusTCPService

async with ModbusTCPService(host="192.168.1.100", port=502, slave_id=1) as modbus:
    data = await modbus.read_sensor_data()
    print(data)  # {'flow_rate': 6.85, 'outlet_tds': 12, ...}
    
    # 원격 제어
    await modbus.write_coil("flush")  # 플러싱 실행
```

### Modbus RTU (RS485 연동)
```python
from app.services.communication import ModbusRTUService

async with ModbusRTUService(port="/dev/ttyUSB0", baudrate=19200, slave_id=1) as modbus:
    data = await modbus.read_sensor_data()
```

### MQTT (IoT 게이트웨이)
```python
from app.services.communication import MQTTService

mqtt = MQTTService(host="mqtt.waternix.com", port=8883, tls_enabled=True)

@mqtt.on_telemetry
def handle_data(company_id, equipment_id, payload):
    print(f"장비 {equipment_id}: {payload['flow_rate']} L/min")

mqtt.start()
```

### MQTT 토픽 구조
```
waternix/{company_id}/{equipment_id}/telemetry  ← 센서 (30초)
waternix/{company_id}/{equipment_id}/status     ← 상태 변경
waternix/{company_id}/{equipment_id}/alert      ← 알람
waternix/{company_id}/{equipment_id}/command    → 원격 제어
waternix/{company_id}/{equipment_id}/heartbeat  ← 생존 신호
```

---

## 📊 주요 기능

| 기능 | 설명 |
|------|------|
| 🗺️ 전국 지도 대시보드 | 장비 위치 + 실시간 상태 표시 |
| 📡 실시간 모니터링 | 유량, TDS, 압력, 온도, 전력 |
| 🔧 유지보수 관리 | 작업 일정, 기술자 배정, 이력 |
| 💧 필터/소모품 관리 | 수명 추적, 교체 알림, 재고 |
| 🏢 업체 관리 | 고객사 등록, 계약 관리 |
| 🚨 실시간 알림 | 이상 감지 시 SMS/이메일 |
| 📈 보고서 | 월별 생산량, 유지보수 비용 |
| 🔐 권한 관리 | superadmin/admin/기술자/조회 |

---

## 🔐 환경 변수 (.env)

```env
# 데이터베이스
DATABASE_URL=postgresql+asyncpg://waternix:waternix123@localhost:5432/waternix_db

# Redis
REDIS_URL=redis://localhost:6379/0

# 보안
SECRET_KEY=your-very-secret-key-here

# MQTT
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_TLS_ENABLED=false

# 알림 임계값
ALERT_TDS_WARNING=20
ALERT_TDS_CRITICAL=50
ALERT_FILTER_WARNING_PCT=80
```

---

## 📞 지원

- **워터닉스(주)** 기술지원팀
- 📧 waternix@naver.com
- 📞 051-202-3055
