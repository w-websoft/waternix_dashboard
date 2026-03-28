# AGENTS.md — 워터닉스 IoT 장비 관리 시스템

> AI 에이전트를 위한 프로젝트 메모리 및 컨텍스트 문서

---

## 프로젝트 개요

**프로젝트명**: 워터닉스(WATERNIX) IoT 수처리 장비 통합 관리 시스템  
**버전**: v1.0.0  
**상태**: Phase 1 개발 완료 (프론트엔드 전체, 백엔드 구조 설계)  
**저장소**: https://github.com/w-websoft/waternix_dashboard.git  
**로컬 경로**: `/Users/wongyun_w/Desktop/water_dashboard`

### 클라이언트 정보
- **회사**: 워터닉스(주) (부산 소재, 수처리 장비 제조)
- **주요 제품**: WRO 시리즈(역삼투압), WDI 시리즈(초순수), WSRO 시리즈(해수담수화)
- **연락처**: 051-202-3055 / waternix@naver.com
- **요구사항**: 전국 설치 장비 실시간 모니터링, PLC/시리얼/MQTT 통신 연동, 업체/유지보수/소모품 관리

---

## 기술 스택

### 프론트엔드
| 항목 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.2.1 |
| 언어 | TypeScript | 5.x |
| 스타일 | Tailwind CSS | 4.x |
| 지도 | Leaflet + react-leaflet | 최신 |
| 차트 | Recharts | 최신 |
| 상태 | React 내장 useState/useEffect | - |
| 패키지 | npm | 11.x |

### 백엔드
| 항목 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | FastAPI | 0.115.6 |
| 언어 | Python | 3.11+ |
| 데이터 검증 | Pydantic v2 | 2.10.4 |
| ORM | SQLAlchemy | 2.0.36 |
| 마이그레이션 | Alembic | 1.14.0 |
| 실시간 | python-socketio | 5.11.4 |
| 태스크 | Celery + Redis | 5.4.0 |

### 산업용 통신 라이브러리
| 라이브러리 | 프로토콜 | 목적 |
|-----------|---------|------|
| pymodbus 3.7.4 | Modbus TCP/RTU | PLC, 인버터, 계측기 |
| pyserial 3.5 | RS232/RS485 | 직렬 통신 장비 |
| paho-mqtt 2.1.0 | MQTT v5 | IoT 게이트웨이 |
| asyncua 1.1.5 | OPC-UA | 산업 자동화 시스템 |

### 데이터베이스
| 항목 | 기술 | 포트 |
|------|------|------|
| 메인 DB | PostgreSQL 15 | 5432 |
| 시계열 확장 | TimescaleDB | - |
| 캐시 | Redis 7 | 6379 |
| MQTT 브로커 | Eclipse Mosquitto 2 | 1883/8883 |

### 인프라
- Docker + Docker Compose
- Nginx 리버스 프록시
- Node.js 25.x (Homebrew 설치)

---

## 프로젝트 구조

```
water_dashboard/
├── AGENTS.md                          ← 이 파일 (AI 메모리)
├── README.md                          ← 프로젝트 설명
├── docker-compose.yml                 ← 전체 서비스 정의
├── setup.sh                           ← 원클릭 설치 스크립트
├── .gitignore
├── .cursor/rules/                     ← Cursor 규칙
│   └── waternix.mdc
├── docs/
│   └── SYSTEM_DESIGN.md               ← 상세 시스템 설계 문서
├── frontend/                          ← Next.js 16 App
│   ├── src/
│   │   ├── app/                       ← 페이지 라우트
│   │   │   ├── page.tsx               ← 메인 대시보드
│   │   │   ├── equipment/page.tsx     ← 장비 관리
│   │   │   ├── companies/page.tsx     ← 업체 관리
│   │   │   ├── maintenance/page.tsx   ← 유지보수
│   │   │   ├── consumables/page.tsx   ← 소모품/필터
│   │   │   ├── alerts/page.tsx        ← 알림 관리
│   │   │   ├── reports/page.tsx       ← 보고서
│   │   │   └── settings/page.tsx      ← 시스템 설정
│   │   ├── components/
│   │   │   ├── layout/                ← Sidebar, Header, DashboardLayout
│   │   │   ├── map/                   ← EquipmentMap (Leaflet)
│   │   │   └── dashboard/             ← KpiCard, AlertList, VolumeChart, StatusDonut
│   │   ├── lib/
│   │   │   ├── mock-data.ts           ← 샘플 데이터 (14개 장비, 8개 업체)
│   │   │   └── utils.ts               ← cn(), formatDate(), STATUS_CONFIG 등
│   │   └── types/index.ts             ← 모든 TypeScript 타입 정의
│   ├── next.config.ts                 ← turbopack: {} 설정
│   ├── package.json
│   └── Dockerfile
├── backend/                           ← FastAPI Python
│   ├── app/
│   │   ├── main.py                    ← FastAPI + Socket.IO 앱 진입점
│   │   ├── core/config.py             ← pydantic-settings 환경설정
│   │   ├── api/
│   │   │   ├── equipment.py           ← 장비 REST API
│   │   │   └── companies.py           ← 업체 REST API
│   │   ├── models/schemas.py          ← Pydantic v2 스키마 (모든 모델)
│   │   └── services/communication/
│   │       ├── __init__.py
│   │       ├── modbus_service.py      ← Modbus TCP/RTU 서비스
│   │       ├── mqtt_service.py        ← MQTT 클라이언트 서비스
│   │       └── serial_service.py      ← RS232/RS485 시리얼 서비스
│   ├── requirements.txt
│   └── Dockerfile
└── mosquitto/
    └── config/mosquitto.conf          ← MQTT 브로커 설정
```

---

## 핵심 데이터 모델

### Equipment (장비)
- `id`, `company_id`, `serial_no`, `model`, `equipment_type`
- `lat`, `lng` (지도 좌표), `address`, `city`, `district`
- `status`: normal | warning | error | offline | maintenance
- `comm_type`: modbus_tcp | modbus_rtu | mqtt | serial | opcua | http
- `comm_config`: JSONB (IP, port, slave_id 등 통신 설정)

### EquipmentType
- `ro` (역삼투압), `di` (초순수), `seawater` (해수담수화)
- `prefilter` (전처리), `uv` (UV살균), `softener` (연수기), `booster` (부스터펌프)

### SensorData (시계열, TimescaleDB)
- `flow_rate` (L/min), `daily_volume` (L), `inlet/outlet_pressure` (bar)
- `inlet/outlet_tds` (ppm), `rejection_rate` (%), `temperature` (°C), `power_kw`

### Modbus 레지스터 맵 (워터닉스 표준)
```
0x0001-0x0002: flow_rate (FLOAT32)
0x0003-0x0004: daily_volume (FLOAT32)
0x0005-0x0006: inlet_pressure (FLOAT32)
0x0007-0x0008: outlet_pressure (FLOAT32)
0x0009: inlet_tds (UINT16)
0x000B: outlet_tds (UINT16)
0x000D-0x000E: temperature (FLOAT32)
0x000F-0x0010: power_kw (FLOAT32)
0x0011-0x0012: running_hours (FLOAT32)
0x0100: status_bits (UINT16)
0x0101: error_code (UINT16)
```

### MQTT 토픽 구조
```
waternix/{company_id}/{equipment_id}/telemetry  ← 30초 센서 데이터
waternix/{company_id}/{equipment_id}/status     ← 상태 변경 이벤트
waternix/{company_id}/{equipment_id}/alert      ← 알람 발생
waternix/{company_id}/{equipment_id}/command    → 원격 제어
waternix/{company_id}/{equipment_id}/heartbeat  ← 60초 생존 신호
```

---

## 샘플 데이터 현황 (mock-data.ts)

- **업체**: 8개 (삼성바이오로직스, 한국수자원공사, 대구경북의료재단, LG화학, 부산진해경자청, KCC, 강원도개발공사, 포스코)
- **장비**: 14대 (서울 3, 인천 2, 충북 1, 대구 2, 경남 2, 전남 2, 전북 1, 강원 1)
- **필터**: 8개 (교체 필요 2개 - 포스코 멤브레인 99.2%, 삼성 멤브레인 97.5%)
- **유지보수**: 7건 (진행 중 2, 예정 3, 완료 2)
- **알림**: 8건 (긴급 2, 경고 4, 미처리 6)
- **소모품**: 10종 (재고부족 3종 - 20μm 필터, 8040 멤브레인, 해수담수화 멤브레인)

---

## 알림 임계값

| 조건 | 경고 | 긴급 |
|------|------|------|
| 정수 TDS | > 20 ppm | > 50 ppm |
| 오염물 제거율 | < 95% | < 90% |
| 입구 압력 | > 10 bar | > 12 bar |
| 필터 수명 | > 80% | > 95% |
| 오프라인 | > 5분 | > 30분 |

---

## 개발 환경 설정

```bash
# Node.js 설치 경로 (Homebrew)
export PATH="/opt/homebrew/bin:$PATH"

# 프론트엔드 개발 서버
cd frontend && npm run dev   # → http://localhost:3000

# 백엔드 개발 서버  
cd backend && uvicorn app.main:socket_app --reload --port 8000

# 전체 도커 실행
docker-compose up -d
```

---

## 알려진 이슈 및 TODO

### Phase 1 완료
- [x] 전체 프론트엔드 UI (8개 페이지)
- [x] Leaflet 지도 (전국 장비 표시)
- [x] FastAPI 백엔드 구조
- [x] 통신 레이어 (Modbus, MQTT, Serial)
- [x] Docker Compose 설정
- [x] 시스템 설계 문서

### Phase 2 예정
- [ ] DB 연동 (현재 mock-data 사용, SQLAlchemy 쿼리 구현 필요)
- [ ] 실제 MQTT 수신 → TimescaleDB 저장
- [ ] JWT 인증 시스템
- [ ] Celery 알림 발송 (SMS, 이메일)
- [ ] 장비 상세 페이지 (실시간 그래프)
- [ ] 모바일 반응형 최적화
- [ ] 카카오맵 API 연동 (현재 OpenStreetMap)

---

## 중요 설계 결정 사항

1. **Next.js 16** 사용 → `turbopack: {}` 설정 필수 (webpack 설정 불가)
2. **Leaflet은 dynamic import** 필수 (`ssr: false`) - 브라우저 전용 API
3. **Recharts ResponsiveContainer**는 SSR 시 width/height 경고 발생 → 정상 (브라우저에서 정상 렌더링)
4. **pymodbus 3.x**는 AsyncModbusTcpClient 사용 (2.x와 API 변경됨)
5. **paho-mqtt 2.x**는 CallbackAPIVersion.VERSION2 필수
6. **TimescaleDB**는 PostgreSQL 확장으로 `create_hypertable('sensor_readings', 'time')` 호출 필요

---

## Git 커밋 컨벤션

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
chore: 설정/빌드 변경
```
