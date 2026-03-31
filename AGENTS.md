# AGENTS.md — 워터닉스 IoT 장비 관리 시스템

> AI 에이전트를 위한 프로젝트 메모리 및 컨텍스트 문서

---

## 프로젝트 개요

**프로젝트명**: 워터닉스(WATERNIX) IoT 수처리 장비 통합 관리 시스템  
**버전**: v5.0.0  
**상태**: 백오피스 핵심 모듈 완성 (A/S·견적·계약) (2026-03-28)  
**저장소**: https://github.com/w-websoft/waternix_dashboard.git  
**로컬 경로**: `/Users/wongyun_w/Desktop/water_dashboard`  
**운영 서버**: https://gwaternix.w-websoftsrv.kr  
**서버 코드 경로**: `/opt/waternix`

---

## 🚀 운영 서버 정보 (2026-03-28 배포)

### 서버 접속
| 항목 | 정보 |
|------|------|
| **Host** | 112.162.17.116 |
| **OS** | Ubuntu 22.04.5 LTS x86_64 |
| **패널** | aaPanel 8.0.0 |
| **도메인** | gwaternix.w-websoftsrv.kr (SSL 적용) |
| **코드 경로** | /opt/waternix |
| **관리 스크립트** | /opt/waternix/manage.sh |

### 컨테이너 포트 현황
| 컨테이너 | 이미지 | 로컬 포트 | 설명 |
|----------|--------|----------|------|
| waternix_frontend | waternix-frontend | 3010→3000 | Next.js 앱 |
| waternix_backend | waternix-backend | 8010→8000 | FastAPI |
| waternix_postgres | timescale/timescaledb:pg15 | 5433→5432 | 시계열 DB |
| waternix_redis | redis:7-alpine | 6382→6379 | 캐시 |
| waternix_mqtt | eclipse-mosquitto:2 | 1883, 9002→9001 | MQTT 브로커 |

> 기존 서버 운영 중인 포트 (충돌 회피): 3000(mozips), 6379(mozips-redis), 6381(comit-redis), 8089(comit-nginx), 9001(minio)

### DB 접속 (PostgreSQL)
```
Host: 127.0.0.1:5433
DB: waternix_db
User: waternix
PW: Waternix2026!#
```

### 서버 관리 명령어
```bash
# 상태 확인
/opt/waternix/manage.sh status

# 로그 확인
/opt/waternix/manage.sh logs frontend
/opt/waternix/manage.sh logs backend

# 코드 업데이트 (git pull → 재빌드 → 재시작)
/opt/waternix/manage.sh update

# 서비스 재시작
/opt/waternix/manage.sh restart

# Nginx 리로드
/opt/waternix/manage.sh nginx
# 또는: /www/server/nginx/sbin/nginx -s reload -c /www/server/nginx/conf/nginx.conf
```

### Nginx 가상호스트 파일
```
/www/server/panel/vhost/nginx/gwaternix.w-websoftsrv.kr.conf
```
→ 프론트엔드: proxy_pass http://127.0.0.1:3010  
→ 백엔드 API: proxy_pass http://127.0.0.1:8010/api/  
→ WebSocket: proxy_pass http://127.0.0.1:8010/socket.io/

### 주의사항
- 서버에는 다른 사이트가 운영 중 (mozips, comit, sama 등) - 포트/컨테이너명 충돌 주의
- aaPanel nginx는 `/www/server/nginx/sbin/nginx`로 실행 (시스템 nginx와 별개)
- 코드 업데이트는 반드시 `/opt/waternix/manage.sh update` 사용 (GitHub → 빌드 → 재시작 자동화)

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
├── PRODUCT_CATALOG_DESIGN.md          ← 제품 카탈로그 시스템 설계 (v4.0 신규)
├── BACKOFFICE_DESIGN.md               ← 백오피스 시스템 설계
├── frontend/                          ← Next.js 16 App
│   ├── src/
│   │   ├── app/                       ← 페이지 라우트
│   │   │   ├── page.tsx               ← 메인 대시보드
│   │   │   ├── equipment/page.tsx     ← 장비 관리
│   │   │   ├── companies/page.tsx     ← 업체 관리
│   │   │   ├── catalog/page.tsx       ← 제품 카탈로그 관리 (v4.0 신규)
│   │   │   ├── service/page.tsx       ← A/S 서비스 관리 (v5.0 신규)
│   │   │   ├── quotations/page.tsx    ← 견적서 관리 (v5.0 신규)
│   │   │   ├── contracts/page.tsx     ← 계약 관리 (v5.0 신규)
│   │   │   ├── maintenance/page.tsx   ← 유지보수
│   │   │   ├── consumables/page.tsx   ← 소모품/필터
│   │   │   ├── alerts/page.tsx        ← 알림 관리
│   │   │   ├── reports/page.tsx       ← 보고서
│   │   │   └── settings/page.tsx      ← 시스템 설정 (DB 연동 v4.0)
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
│   │   │   ├── auth.py                ← 인증 API (users 테이블 기반, JWT)
│   │   │   ├── equipment.py           ← 장비 REST API
│   │   │   ├── equipment_catalog.py   ← 워터닉스 장비 카탈로그 API (v4.0 신규)
│   │   │   ├── companies.py           ← 업체 REST API
│   │   │   ├── catalog.py             ← 소모품 카탈로그 API
│   │   │   ├── filters.py             ← 소모품/필터 관리 API
│   │   │   ├── maintenance.py         ← 유지보수 API
│   │   │   ├── alerts.py              ← 알림 API
│   │   │   ├── consumables.py         ← 재고 관리 API
│   │   │   ├── system_settings.py     ← 시스템 설정 DB 저장 API (v4.0 신규)
│   │   │   ├── service_requests.py    ← A/S 서비스 요청 API (v5.0 신규)
│   │   │   ├── quotations.py          ← 견적서 관리 API (v5.0 신규)
│   │   │   └── contracts.py           ← 계약 관리 API (v5.0 신규)
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
- `ro` (역삼투압/WRO), `cooling` (냉각수/DCRO), `di` (초순수/WDI), `seawater` (해수담수화/WSRO)
- `uf` (양액회수/WUF), `small` (소형/T05·T20), `prefilter` (전처리), `uv` (UV살균/WUV)
- `softener` (연수/WSF), `filtration` (여과), `booster` (부스터펌프)

### EquipmentCatalog (워터닉스 자사 제품 카탈로그) [v4.0 신규]
- `model_code` (DCRO-500), `model_name`, `equipment_type`, `series`, `category`
- `specs` (JSONB: capacity_lph, voltage, power_kw...), `default_consumables` (JSONB)
- `warranty_months`, `sell_price`, `cost_price`, `lead_time_days`
- **현재 등록**: 20개 모델 (DCRO 4, WRO 4, WDI 2, WSRO 2, WUF 2, T 2, WUV 2, WSF 2)

### ConsumableCatalog (소모품/부품 카탈로그)
- `part_no` (DCRO-SD-5), `name`, `category` (filter/membrane/chemical/pump/sensor)
- `equipment_type`, `replace_interval_hours`, `sell_price`, `cost_price`
- **현재 등록**: 89개 소모품 (각 제품 시리즈별)

### SystemSettings (시스템 설정 DB) [v4.0 신규]
- key-value 구조로 시스템 설정값 DB 저장
- 재배포 없이 관리자가 설정 변경 가능
- **현재 키**: company_name, collect_interval_sec, alert_tds_warn, alert_filter_warn 등

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

## v4.0 주요 변경사항 (2026-03-29)

### 신규 기능
- **제품 카탈로그 시스템** (`/catalog` 페이지)
  - 장비 카탈로그 탭: 워터닉스 자사 제품 20개 등록/수정/삭제
  - 소모품 카탈로그 탭: 89개 소모품 전체 CRUD
  - 기본 데이터 자동 시딩 버튼 (처음 실행 시)
- **카탈로그 연동 장비 등록**
  - 장비 등록 시 equipment_catalog에서 모델 선택
  - 선택한 모델의 default_consumables 자동 필터 등록
  - 카탈로그 없으면 기존 하드코딩 목록 fallback
- **인증 시스템 DB 연동**
  - users 테이블 기반 로그인 (bcrypt 검증)
  - config 관리자 계정 fallback 유지
  - 사용자 추가/비활성화 API
  - 비밀번호 변경 API
- **시스템 설정 DB 저장**
  - system_settings 테이블 (key-value)
  - 설정 페이지에서 저장 시 즉시 DB 반영
- **사이드바 카탈로그 메뉴 추가**

### DB 마이그레이션
- `002_equipment_catalog.sql`: equipment_catalog, system_settings 테이블 생성
- filters 테이블: replace_interval_days, last_replaced_date, catalog_part_no 컬럼 추가
- equipment 테이블: catalog_model_code, purchase_price, install_by 컬럼 추가

### API 추가
- `GET/POST/PUT/DELETE /api/equipment-catalog` — 장비 카탈로그 CRUD
- `POST /api/equipment-catalog/seed` — 기본 20개 제품 시딩
- `GET/PATCH /api/settings` — 시스템 설정 조회/저장
- `GET/POST/PATCH/DELETE /api/auth/users` — 사용자 관리
- `POST /api/auth/change-password` — 비밀번호 변경

---

## 알려진 이슈 및 TODO

### 완료된 주요 기능
- [x] 전체 프론트엔드 UI (9개 페이지: 대시보드, 장비, 업체, 카탈로그, 유지보수, 소모품, 보고서, 알림, 설정)
- [x] Leaflet 지도 (전국 장비 표시)
- [x] FastAPI 백엔드 전체 API
- [x] PostgreSQL + TimescaleDB 연동
- [x] JWT 인증 (DB users 테이블 기반)
- [x] Docker Compose 배포
- [x] Nginx 리버스 프록시 (aaPanel)
- [x] 제품 카탈로그 시스템
- [x] 소모품 카탈로그 + 자동 등록
- [x] 시스템 설정 DB 저장

### 다음 개발 항목 (Phase 2)
- [ ] 장비 카탈로그에 제품 이미지 업로드 기능
- [ ] 실제 MQTT/Modbus 데이터 수신 → TimescaleDB 저장
- [ ] 실시간 장비 상태 Socket.io 연동
- [ ] 소모품 주문/발주 시스템
- [ ] 모델별 설치 현황 통계 (카탈로그 → 실제 설치 대수)
- [ ] SMS/이메일 알림 발송 (Celery)

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
