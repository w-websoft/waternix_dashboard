# 워터닉스(WATERNIX) IoT 장비 통합 관리 시스템
## 시스템 설계 문서 v1.0

---

## 1. 프로젝트 개요

### 1.1 배경
워터닉스(주)는 부산 소재의 수처리 장비 전문 제조업체로, 역삼투압(RO) 정수 시스템, 초순수 제조기(DI), 해수담수화 시스템 등을 전국에 납품·설치하고 있습니다. 전국에 분산된 수백 대의 장비를 실시간으로 모니터링하고 유지보수하기 위한 통합 온라인 관리 시스템이 필요합니다.

### 1.2 목표
- 전국 설치 장비의 실시간 상태 모니터링 (지도 기반)
- PLC / 시리얼 / MQTT 통신을 통한 센서 데이터 수집
- 업체(고객사)별 장비 관리 및 유지보수 이력 관리
- 필터/소모품 교체 주기 알림 및 재고 관리
- 이상 감지 시 즉시 알림 발송

---

## 2. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                     현장 장비 레이어                               │
│                                                                   │
│  [RO 정수기]  [DI 순수기]  [해수담수화]  [전처리 필터]            │
│       │            │            │              │                  │
│  ┌────▼────────────▼────────────▼──────────────▼────┐           │
│  │          현장 IoT 게이트웨이 (Edge Device)          │           │
│  │  - Modbus RTU/TCP (RS485/RS232)                   │           │
│  │  - PLC 통신 (Siemens S7, Mitsubishi Q, LS 등)    │           │
│  │  - OPC-UA                                         │           │
│  │  - 4G/LTE / WiFi / Ethernet 업링크                │           │
│  └─────────────────────┬─────────────────────────────┘           │
└────────────────────────│────────────────────────────────────────┘
                         │ MQTT / HTTPS
┌────────────────────────▼────────────────────────────────────────┐
│                     클라우드/서버 레이어                            │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  MQTT Broker │  │  FastAPI     │  │  TimescaleDB /       │  │
│  │  (Mosquitto) │→ │  Backend     │→ │  PostgreSQL          │  │
│  │  :1883/8883  │  │  :8000       │  │  (시계열 센서 데이터)   │  │
│  └──────────────┘  └──────┬───────┘  └──────────────────────┘  │
│                            │                                      │
│  ┌──────────────────────── ▼ ─────────────────────────────────┐  │
│  │              Next.js Dashboard (웹 프론트엔드)               │  │
│  │              :3000                                          │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 기술 스택

### 3.1 프론트엔드
| 항목 | 기술 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 14 (App Router) | SSR/SSG, TypeScript 지원, 성능 최적화 |
| 언어 | TypeScript | 타입 안전성, 유지보수성 |
| 스타일 | Tailwind CSS + shadcn/ui | 빠른 UI 개발, 일관된 디자인 |
| 지도 | Leaflet + React-Leaflet | 한국 지도 지원, 오픈소스, 커스터마이징 가능 |
| 상태관리 | Zustand + React Query | 클라이언트/서버 상태 분리 |
| 실시간 | Socket.io-client | WebSocket 기반 실시간 업데이트 |
| 차트 | Recharts | 센서 데이터 시각화 |

### 3.2 백엔드
| 항목 | 기술 | 이유 |
|------|------|------|
| 프레임워크 | FastAPI (Python 3.11+) | 비동기 I/O, 산업용 통신 라이브러리 지원 |
| ORM | SQLAlchemy 2.0 + Alembic | 마이그레이션, 비동기 지원 |
| 유효성 검사 | Pydantic v2 | 데이터 모델 정의 |
| 실시간 | Socket.io (python-socketio) | WebSocket 서버 |
| 태스크 큐 | Celery + Redis | 배경 작업 (알림 발송, 데이터 집계) |

### 3.3 통신 레이어 (핵심)
| 프로토콜 | 라이브러리 | 용도 |
|----------|-----------|------|
| Modbus RTU/TCP | pymodbus 3.x | PLC, 인버터, 계측기 통신 |
| RS232/RS485 | pyserial | 직렬 통신 장비 |
| MQTT | paho-mqtt | IoT 게이트웨이 ↔ 서버 |
| OPC-UA | opcua-asyncio | 산업용 자동화 시스템 |
| HTTP/REST | aiohttp | 외부 API 연동 |

### 3.4 데이터베이스
| 항목 | 기술 | 이유 |
|------|------|------|
| 메인 DB | PostgreSQL 15 | 관계형 데이터, JSON 지원 |
| 시계열 확장 | TimescaleDB | 센서 데이터 고성능 저장/조회 |
| 캐시 | Redis | 세션, 실시간 데이터 캐싱 |
| 파일 저장 | MinIO (S3 호환) | 장비 사진, 보고서 |

### 3.5 인프라
| 항목 | 기술 |
|------|------|
| 컨테이너 | Docker + Docker Compose |
| 리버스 프록시 | Nginx |
| 메시지 브로커 | Eclipse Mosquitto (MQTT v5) |
| 모니터링 | Prometheus + Grafana |

---

## 4. 데이터베이스 스키마

### 4.1 핵심 테이블

```sql
-- 업체(고객사) 관리
CREATE TABLE companies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,          -- 업체명
    business_no VARCHAR(20) UNIQUE,             -- 사업자등록번호
    contact     VARCHAR(50),                    -- 담당자
    phone       VARCHAR(20),
    email       VARCHAR(100),
    address     TEXT,
    city        VARCHAR(50),                    -- 시/도
    district    VARCHAR(50),                    -- 구/군
    contract_start DATE,
    contract_end   DATE,
    status      VARCHAR(20) DEFAULT 'active',   -- active/inactive/suspended
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 장비 관리
CREATE TABLE equipment (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID REFERENCES companies(id),
    serial_no       VARCHAR(50) UNIQUE NOT NULL,    -- 장비 시리얼번호
    model           VARCHAR(100) NOT NULL,          -- 모델명 (WRO-T30, WDI-T100 등)
    equipment_type  VARCHAR(50) NOT NULL,           -- ro/di/seawater/prefilter/uv/softener
    name            VARCHAR(100),                   -- 장비 별칭
    lat             DECIMAL(10,7),                  -- 위도
    lng             DECIMAL(10,7),                  -- 경도
    address         TEXT,
    install_date    DATE,
    warranty_end    DATE,
    status          VARCHAR(20) DEFAULT 'normal',   -- normal/warning/error/offline/maintenance
    capacity_lph    INTEGER,                        -- 시간당 생산량 (L/h)
    comm_type       VARCHAR(20),                    -- modbus/mqtt/serial/opcua/http
    comm_config     JSONB,                          -- 통신 설정 (IP, port, slave_id 등)
    last_seen       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 실시간 센서 데이터 (TimescaleDB 하이퍼테이블)
CREATE TABLE sensor_readings (
    time            TIMESTAMPTZ NOT NULL,
    equipment_id    UUID NOT NULL,
    flow_rate       DECIMAL(10,3),      -- 유량 (L/min)
    daily_volume    DECIMAL(10,3),      -- 일일 생산량 (L)
    inlet_pressure  DECIMAL(8,3),       -- 입구 압력 (bar)
    outlet_pressure DECIMAL(8,3),       -- 출구 압력 (bar)
    inlet_tds       INTEGER,            -- 원수 TDS (ppm)
    outlet_tds      INTEGER,            -- 정수 TDS (ppm)
    rejection_rate  DECIMAL(5,2),       -- 오염물 제거율 (%)
    temperature     DECIMAL(5,2),       -- 수온 (°C)
    power_kw        DECIMAL(8,3),       -- 소비 전력 (kW)
    running_hours   DECIMAL(10,2),      -- 누적 가동 시간
    error_code      VARCHAR(20),        -- 에러 코드
    raw_data        JSONB               -- 원시 데이터
);
SELECT create_hypertable('sensor_readings', 'time');

-- 필터/소모품 관리
CREATE TABLE filters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id    UUID REFERENCES equipment(id),
    filter_type     VARCHAR(50) NOT NULL,       -- sediment/carbon/ro_membrane/uv/resin
    filter_name     VARCHAR(100),
    stage           INTEGER,                    -- 필터 단계 (1차, 2차...)
    install_date    DATE,
    replace_date    DATE,                       -- 교체 예정일
    life_hours      INTEGER,                    -- 권장 수명 (시간)
    life_volume     INTEGER,                    -- 권장 처리량 (L)
    used_hours      DECIMAL(10,2) DEFAULT 0,
    used_volume     DECIMAL(10,3) DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'normal', -- normal/warning/replace/replaced
    supplier        VARCHAR(100),
    part_no         VARCHAR(50),
    cost            DECIMAL(10,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 유지보수 이력
CREATE TABLE maintenance_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id    UUID REFERENCES equipment(id),
    company_id      UUID REFERENCES companies(id),
    type            VARCHAR(30),                -- preventive/corrective/emergency/inspection
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    technician      VARCHAR(100),
    scheduled_date  DATE,
    completed_date  DATE,
    status          VARCHAR(20) DEFAULT 'scheduled', -- scheduled/in_progress/completed/cancelled
    parts_used      JSONB,                      -- 사용 부품 목록
    labor_hours     DECIMAL(5,2),
    cost            DECIMAL(10,2),
    next_maintenance DATE,
    photos          TEXT[],                     -- 사진 URL 배열
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 알림/경보 관리
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id    UUID REFERENCES equipment(id),
    company_id      UUID REFERENCES companies(id),
    severity        VARCHAR(20),                -- critical/warning/info
    type            VARCHAR(50),                -- offline/high_tds/low_flow/filter_replace/error
    title           VARCHAR(200),
    message         TEXT,
    acknowledged    BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 소모품 재고
CREATE TABLE consumables (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID REFERENCES companies(id),  -- NULL이면 자사 재고
    name        VARCHAR(100) NOT NULL,
    category    VARCHAR(50),                    -- filter/chemical/membrane/pump/sensor
    part_no     VARCHAR(50),
    brand       VARCHAR(50),
    unit        VARCHAR(20),                    -- 개, kg, L
    stock_qty   DECIMAL(10,2) DEFAULT 0,
    min_qty     DECIMAL(10,2),                  -- 최소 재고 (알림 기준)
    unit_cost   DECIMAL(10,2),
    supplier    VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자/관리자
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID REFERENCES companies(id),  -- NULL이면 워터닉스 관리자
    username    VARCHAR(50) UNIQUE NOT NULL,
    email       VARCHAR(100) UNIQUE,
    password    VARCHAR(200) NOT NULL,           -- bcrypt 해시
    role        VARCHAR(20) DEFAULT 'viewer',   -- superadmin/admin/technician/viewer
    name        VARCHAR(100),
    phone       VARCHAR(20),
    is_active   BOOLEAN DEFAULT TRUE,
    last_login  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. API 설계

### 5.1 RESTful API 엔드포인트

```
[인증]
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh

[대시보드]
GET    /api/dashboard/summary           -- 전체 현황 요약
GET    /api/dashboard/map-data          -- 지도용 장비 위치+상태

[장비]
GET    /api/equipment                   -- 장비 목록 (필터링, 페이징)
POST   /api/equipment                   -- 장비 등록
GET    /api/equipment/{id}              -- 장비 상세
PUT    /api/equipment/{id}              -- 장비 수정
DELETE /api/equipment/{id}              -- 장비 삭제
GET    /api/equipment/{id}/sensors      -- 실시간 센서 데이터
GET    /api/equipment/{id}/history      -- 센서 이력
GET    /api/equipment/{id}/alerts       -- 장비 알림 목록

[업체]
GET    /api/companies                   -- 업체 목록
POST   /api/companies                   -- 업체 등록
GET    /api/companies/{id}              -- 업체 상세
PUT    /api/companies/{id}              -- 업체 수정
GET    /api/companies/{id}/equipment    -- 업체별 장비

[필터]
GET    /api/filters                     -- 필터 목록 (교체 필요 우선)
POST   /api/filters                     -- 필터 등록
PUT    /api/filters/{id}                -- 필터 수정
POST   /api/filters/{id}/replace        -- 필터 교체 처리

[유지보수]
GET    /api/maintenance                 -- 유지보수 목록
POST   /api/maintenance                 -- 유지보수 등록
PUT    /api/maintenance/{id}            -- 유지보수 수정
GET    /api/maintenance/schedule        -- 유지보수 일정

[소모품]
GET    /api/consumables                 -- 소모품 목록
POST   /api/consumables                 -- 소모품 등록
PUT    /api/consumables/{id}/stock      -- 재고 업데이트

[알림]
GET    /api/alerts                      -- 알림 목록
PUT    /api/alerts/{id}/acknowledge     -- 알림 확인
```

### 5.2 WebSocket 이벤트
```
[서버 → 클라이언트]
equipment:status_changed    -- 장비 상태 변경
equipment:sensor_update     -- 실시간 센서 데이터
alert:new                   -- 신규 알림
filter:warning              -- 필터 교체 경고

[클라이언트 → 서버]
equipment:subscribe         -- 특정 장비 모니터링 구독
equipment:unsubscribe       -- 구독 취소
```

---

## 6. 통신 프로토콜 설계

### 6.1 Modbus TCP/RTU (PLC 연동)
```python
# 레지스터 맵 (워터닉스 표준)
REGISTER_MAP = {
    "flow_rate":       (0x0001, "float32"),   # 유량 L/min
    "daily_volume":    (0x0003, "float32"),   # 일일 생산량 L
    "inlet_pressure":  (0x0005, "float32"),   # 입구 압력 bar
    "outlet_pressure": (0x0007, "float32"),   # 출구 압력 bar
    "inlet_tds":       (0x0009, "uint16"),    # 원수 TDS ppm
    "outlet_tds":      (0x000B, "uint16"),    # 정수 TDS ppm
    "temperature":     (0x000D, "float32"),   # 수온 °C
    "power_kw":        (0x000F, "float32"),   # 전력 kW
    "running_hours":   (0x0011, "float32"),   # 가동 시간 h
    "status_bits":     (0x0100, "uint16"),    # 상태 비트 (0:run, 1:fault, 2:low_pressure)
    "error_code":      (0x0101, "uint16"),    # 에러 코드
}

# Coil 맵 (제어)
COIL_MAP = {
    "start":           0x0001,    # 기동
    "stop":            0x0002,    # 정지
    "flush":           0x0003,    # 플러싱
    "alarm_reset":     0x0010,    # 알람 리셋
}
```

### 6.2 MQTT 토픽 구조
```
waternix/{company_id}/{equipment_id}/telemetry    -- 센서 데이터 (30초마다)
waternix/{company_id}/{equipment_id}/status       -- 상태 변경 (이벤트)
waternix/{company_id}/{equipment_id}/alert        -- 알람 발생
waternix/{company_id}/{equipment_id}/command      -- 원격 제어 명령
waternix/{company_id}/{equipment_id}/heartbeat    -- 생존 신호 (60초마다)

[페이로드 예시 - telemetry]
{
    "ts": 1711607400000,
    "flow_rate": 6.85,
    "daily_volume": 1642.5,
    "inlet_pressure": 4.2,
    "outlet_pressure": 3.8,
    "inlet_tds": 487,
    "outlet_tds": 12,
    "rejection_rate": 99.75,
    "temperature": 18.5,
    "power_kw": 0.55
}
```

### 6.3 RS485/시리얼 통신
```
- 보레이트: 9600 / 19200 / 38400 / 115200 bps (설정 가능)
- 데이터 비트: 8
- 패리티: None/Even/Odd
- 정지 비트: 1
- 프로토콜: Modbus RTU 기반
- 멀티드롭: 최대 32대 연결 (RS485)
```

---

## 7. 장비 유형 분류

| 코드 | 장비 유형 | 모델 예시 | 주요 모니터링 항목 |
|------|-----------|---------|-----------------|
| `ro` | 역삼투압 정수기 | WRO-T30, WRO-T100 | 유량, TDS, 압력, 멤브레인 오염도 |
| `di` | 초순수/이온교환 | WDI-T100, WDI-T500 | 비저항(MΩ·cm), 유량, 레진 수명 |
| `seawater` | 해수담수화 | WSRO-T05~T20000 | 염분, 유량, 에너지 회수율 |
| `prefilter` | 전처리 필터 | 멀티미디어, 활성탄 | 압력차(ΔP), 탁도, 교체 수명 |
| `uv` | UV 살균기 | UV-T시리즈 | UV 강도, 램프 수명, 유량 |
| `softener` | 연수기 | WS시리즈 | 경도(gpg), 재생 주기, 소금 잔량 |
| `booster` | 부스터 펌프 | WBP시리즈 | 압력, 유량, 모터 온도 |

---

## 8. 알림/경보 체계

### 8.1 경보 레벨
| 레벨 | 기준 | 알림 방법 |
|------|------|---------|
| **Critical (긴급)** | 장비 정지, 대용량 누수, TDS 급등 | SMS + 앱 푸시 + 이메일 즉시 발송 |
| **Warning (경고)** | 필터 수명 80% 이상, 압력 이상 | 앱 푸시 + 이메일 |
| **Info (정보)** | 정기 점검 예정, 소모품 재고 부족 | 대시보드 알림 |

### 8.2 자동 경보 조건
```python
ALERT_CONDITIONS = {
    "ro": {
        "outlet_tds_high":   lambda r: r.outlet_tds > 50,       # TDS 50ppm 초과
        "rejection_low":     lambda r: r.rejection_rate < 95,   # 제거율 95% 미만
        "low_flow":          lambda r: r.flow_rate < r.rated_flow * 0.7,
        "high_pressure":     lambda r: r.inlet_pressure > 12,   # 12bar 초과
        "offline":           lambda r: r.last_seen_min > 5,     # 5분 이상 무응답
    },
    "filter": {
        "life_warning":      lambda f: f.used_pct > 80,         # 수명 80% 사용
        "life_critical":     lambda f: f.used_pct > 95,         # 수명 95% 사용
    }
}
```

---

## 9. 보안 설계

- JWT 기반 인증 (Access Token 1시간, Refresh Token 30일)
- RBAC (역할 기반 접근 제어): superadmin / admin / technician / viewer
- MQTT TLS 암호화 (포트 8883)
- HTTPS 필수 (Let's Encrypt 자동 갱신)
- API Rate Limiting (100 req/min per IP)
- 데이터베이스 암호화 (at-rest, TDE)
- 감사 로그 (모든 데이터 변경 이력 보관)

---

## 10. 화면 구성

| 화면 | 설명 |
|------|------|
| 메인 대시보드 | 전국 지도 + KPI 카드 + 실시간 알림 |
| 장비 현황 | 지역별/업체별 장비 목록, 상태 필터링 |
| 장비 상세 | 실시간 센서 그래프, 필터 상태, 유지보수 이력 |
| 업체 관리 | 업체 목록/등록/수정, 계약 정보 |
| 유지보수 관리 | 작업 일정, 완료 이력, 기술자 배정 |
| 소모품/재고 | 필터 재고, 소비 현황, 발주 관리 |
| 보고서 | 월별 정수량, 유지보수 비용, 장비 효율 |
| 설정 | 알림 설정, 사용자 관리, 통신 설정 |

---

## 11. 배포 구성

```yaml
# docker-compose.yml 서비스 구성
services:
  - nginx:          리버스 프록시 (80, 443)
  - frontend:       Next.js 앱 (3000)
  - backend:        FastAPI 앱 (8000)
  - postgres:       PostgreSQL + TimescaleDB (5432)
  - redis:          캐시/세션 (6379)
  - mosquitto:      MQTT 브로커 (1883, 8883)
  - celery-worker:  배경 태스크 처리
  - celery-beat:    주기적 스케줄러 (데이터 집계, 알림 체크)
```

---

## 12. 개발 로드맵

| 단계 | 기간 | 내용 |
|------|------|------|
| Phase 1 | 1~2개월 | 기본 대시보드, 장비/업체 CRUD, 지도 시각화 |
| Phase 2 | 3~4개월 | MQTT/Modbus 통신 연동, 실시간 모니터링, 알림 |
| Phase 3 | 5~6개월 | 필터 관리, 유지보수 일정, 소모품 재고 |
| Phase 4 | 7~8개월 | 보고서, 모바일 앱, 고급 분석 (AI 예측 유지보수) |
