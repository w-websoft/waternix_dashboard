# 워터닉스(Waternix) 통합 백오피스 시스템 설계 문서

> 작성일: 2026-03-28  
> 버전: v1.0  
> 대상: 개발팀, 기획팀, 운영팀 인수인계용

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [현재 시스템 구성](#2-현재-시스템-구성)
3. [확장 백오피스 시스템 설계](#3-확장-백오피스-시스템-설계)
4. [핵심 모듈별 기능 명세](#4-핵심-모듈별-기능-명세)
5. [데이터 모델 설계](#5-데이터-모델-설계)
6. [API 설계](#6-api-설계)
7. [시스템 연동 흐름](#7-시스템-연동-흐름)
8. [워터닉스 제품 카탈로그](#8-워터닉스-제품-카탈로그)
9. [개발 우선순위 로드맵](#9-개발-우선순위-로드맵)
10. [기술 스택 및 인프라](#10-기술-스택-및-인프라)

---

## 1. 시스템 개요

### 목적

워터닉스(주)의 **수처리 장비 통합 관리 플랫폼**으로, 다음 두 가지 핵심 축으로 운영됩니다.

| 축 | 설명 |
|---|---|
| **B2B 고객사 장비 관리** | 전국 고객사(업체)에 납품된 워터닉스 장비의 상태 모니터링, 유지보수, 소모품 교체 이력 관리 |
| **워터닉스 자산·사업 관리** | 자사 보유 장비 자산, 재고·소모품 관리, 견적/수주/납품/AS 수익 관리 |

### 비전

```
[고객사 현장 장비] ──IoT 통신──▶ [워터닉스 대시보드] ──▶ [자동 알림/A/S 배차]
                                        │
                            ┌───────────┼───────────────┐
                            ▼           ▼               ▼
                       [장비 관리]  [소모품 주문]  [수익/보고서]
```

---

## 2. 현재 시스템 구성

### 2.1 기술 스택

| 계층 | 기술 |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Backend API** | FastAPI (Python 3.11+), asyncpg |
| **Database** | PostgreSQL 15 + TimescaleDB |
| **실시간 통신** | Socket.io, MQTT (Eclipse Mosquitto) |
| **산업 통신** | Modbus TCP/RTU, OPC-UA, RS232/RS485 |
| **캐시/큐** | Redis, Celery |
| **인프라** | Docker Compose, Nginx (aaPanel), Ubuntu 22.04 |

### 2.2 현재 구현된 기능

| 모듈 | 상태 | 비고 |
|---|---|---|
| 대시보드 (전국 현황) | ✅ 완료 | 실시간 지도, 통계 카드 |
| 장비 목록/상세 | ✅ 완료 | CRUD, 시설배치도 에디터 |
| 업체 관리 | ✅ 완료 | 등록, 상세, 장비 연결 |
| 유지보수 관리 | ✅ 완료 | 작업 등록, 완료 처리 |
| 소모품/필터 관리 | ✅ 완료 | 등록, 상태 관리 |
| 알림 관리 | ✅ 완료 | 단계별 처리 (5단계) |
| 보고서 | ✅ 완료 | 업체별 필터링, 차트 |
| 모바일 반응형 | ✅ 완료 | lg 기준 사이드바 전환 |

---

## 3. 확장 백오피스 시스템 설계

### 3.1 전체 모듈 구성도

```
┌─────────────────────────────────────────────────────────────────┐
│                    워터닉스 통합 백오피스                          │
├─────────────────┬───────────────────────┬───────────────────────┤
│   A. 고객사 관리  │    B. 장비 자산 관리    │   C. 사업 운영 관리    │
├─────────────────┼───────────────────────┼───────────────────────┤
│ • 업체 등록/관리  │ • 자사 재고 장비        │ • 견적서 발행          │
│ • 계약 관리      │ • 고객사 납품 장비       │ • 수주/계약서          │
│ • 고객 담당자    │ • 장비 IoT 모니터링     │ • 납품 처리           │
│ • 서비스 이력    │ • 시설 배치도           │ • 세금계산서/영수증     │
│ • 만족도 관리    │ • 소모품 수명 추적      │ • 매출/수익 분석       │
├─────────────────┼───────────────────────┼───────────────────────┤
│   D. A/S 관리   │   E. 소모품/부품 관리   │   F. 인사/조직 관리    │
├─────────────────┼───────────────────────┼───────────────────────┤
│ • A/S 접수      │ • 소모품 카탈로그        │ • 직원 관리           │
│ • 기사 배차      │ • 발주/구매            │ • 권한 관리           │
│ • 작업 이력      │ • 재고 현황            │ • 업무 일지           │
│ • 부품 청구      │ • 고객사 소모품 주문     │ • 교육/자격 관리       │
└─────────────────┴───────────────────────┴───────────────────────┘
```

### 3.2 신규 개발 대상 모듈

현재 구현된 기능을 기반으로, 아래 모듈을 추가 개발해야 합니다.

---

## 4. 핵심 모듈별 기능 명세

### 4.1 MODULE A: 고객사(업체) 관리 (현재 기본 구현됨)

**현재 구현:**
- 업체 기본 정보 등록 (상호, 사업자번호, 연락처, 주소)
- 업체별 장비 목록 조회
- 유지보수 이력 조회

**추가 개발 필요:**

```
계약 관리
├── 계약서 첨부 (PDF 업로드)
├── 계약 기간 (시작일 ~ 종료일)
├── 계약 유형 (단순납품 / 유지보수 포함 / 완전위탁)
├── 계약 금액 및 지불 조건
└── 계약 갱신 알림 (만료 90일 전 자동 알림)

담당자 다중 등록
├── 업체 담당자 (구매/기술/경영진)
├── 워터닉스 담당 영업/기술 직원 지정
└── 비상연락처

서비스 이력 통합 뷰
├── 납품 이력
├── A/S 이력
├── 소모품 구매 이력
└── 고객 만족도 점수
```

### 4.2 MODULE B: 워터닉스 자사 장비 자산 관리

**목적:** 워터닉스가 제조·보유한 장비를 **자사 자산**으로 등록하고 고객사 납품까지 추적

```
자산 번호 체계
├── 제조 관리번호: WNX-YYYY-NNNN (예: WNX-2025-0001)
├── 제품군 코드: DCRO / WRO / WDI / WSRO / WUF
└── 시리얼 번호: {제품코드}-{연도}-{순번}

장비 상태 전이
[재고] → [견적/예약] → [납품준비] → [납품완료] → [운영중] → [A/S] → [폐기]

자산 정보
├── 제조일, 제조 로트 번호
├── BOM (부품 구성)
├── 제조원가
├── 납품가
├── 현재 위치 (창고/고객사 현장)
└── 보증 기간
```

### 4.3 MODULE C: 고객 소모품 주문 시스템

**목적:** 고객사가 사용 중인 장비의 소모품을 웹에서 직접 주문할 수 있는 B2B 쇼핑 기능

```
주문 흐름
고객사 담당자 로그인
    │
    ▼
내 장비 소모품 목록 조회
(현재 교체 필요한 소모품 우선 표시)
    │
    ▼
장바구니 담기
(수량 지정, 배송지 지정)
    │
    ▼
주문서 확인 (견적가 자동 계산)
    │
    ▼
주문 확정 (이메일/SMS 자동 발송)
    │
    ▼
워터닉스 주문 접수 → 출고 처리 → 배송 추적 → 설치 확인

데이터 모델 (orders 테이블)
├── id (UUID)
├── company_id (FK)
├── equipment_id (FK, 장착 대상 장비)
├── ordered_by (담당자명)
├── items (JSONB: [{consumable_id, qty, unit_price}])
├── total_amount
├── status (접수/처리중/출고/배송중/완료/취소)
├── delivery_address
├── tracking_no
├── created_at
└── delivered_at
```

### 4.4 MODULE D: A/S 접수 및 기사 배차 시스템

```
A/S 접수 채널
├── 전화 접수 (운영자 직접 입력)
├── 웹 자동 접수 (고객사 포털)
└── IoT 자동 접수 (장비 이상 감지 → 자동 A/S 생성)

배차 로직
접수 건 생성
    │
    ▼
지역/기술등급 기준 기사 매칭
(담당 기사 없으면 가용 기사 자동 배정)
    │
    ▼
기사 앱 푸시 알림
    │
    ▼
현장 출발 → 도착 확인 → 작업 완료 → 사진/서명 첨부
    │
    ▼
사용 부품 청구 → 수리 보고서 자동 생성

데이터 모델 (service_requests 테이블)
├── id (UUID)
├── equipment_id (FK)
├── company_id (FK)
├── request_type (고장/점검/소모품교체/설치)
├── priority (긴급/보통/예약)
├── description
├── assigned_technician_id (FK → users)
├── status (접수/배차/출발/도착/작업중/완료/취소)
├── scheduled_date
├── arrived_at
├── completed_at
├── parts_used (JSONB)
├── labor_cost
├── parts_cost
├── total_cost
├── photos (JSONB: [url])
├── signature_url
└── report_pdf_url
```

### 4.5 MODULE E: 소모품 카탈로그 및 재고 관리

**목적:** 워터닉스 자사 창고 재고와 발주를 통합 관리

```
소모품 카탈로그 구조
├── 제품군 (DCRO / WRO / WDI / WSRO / WUF / Small / UV / 연수 / 여과)
├── 파트 번호 (예: DCRO-MEM-NF4)
├── 제품명 (예: DCRO 4인치 NF 멤브레인)
├── 호환 장비 모델 목록
├── 권장 교체 주기 (운전시간 기준)
├── 판매 단가
├── 최소 발주 단위
└── 제조사/공급처

재고 관리
├── 현재 재고 수량
├── 최소 재고 기준 (reorder point)
├── 자동 발주 트리거 (재고 < 최소 기준 → 알림)
└── 입고/출고 이력

발주 관리
├── 발주서 자동 생성
├── 납품처 관리
├── 입고 확인
└── 단가 계약 관리
```

### 4.6 MODULE F: 견적/수주/납품 관리 (영업 파이프라인)

```
영업 파이프라인
[리드 등록] → [상담] → [현장 조사] → [견적 발행] → [수주] → [납품] → [A/S 계약]

견적서 자동 생성
입력: 고객사, 장비 모델, 수량, 설치 조건
    │
    ▼
장비 판매가 + 설치비 + 부속품 + 세금 자동 계산
    │
    ▼
PDF 생성 (로고/워터마크 포함)
    │
    ▼
이메일 자동 발송 (고객사 담당자)

수주 관리
├── 수주번호 자동 채번
├── 납기일 설정
├── 결제 조건 (선불/중도금/잔금)
├── 납품 진행 단계 추적
└── 세금계산서 연동
```

---

## 5. 데이터 모델 설계

### 5.1 신규 테이블 목록

```sql
-- 소모품 카탈로그 (현재 filters 테이블 확장 또는 별도 생성)
CREATE TABLE consumable_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50), -- filter/chemical/membrane/pump/sensor
    compatible_models TEXT[], -- 호환 장비 모델 배열
    equipment_type VARCHAR(50),
    unit VARCHAR(20) DEFAULT '개',
    replace_interval_hours INTEGER,
    sell_price NUMERIC(12, 2),
    cost_price NUMERIC(12, 2),
    min_order_qty INTEGER DEFAULT 1,
    supplier VARCHAR(200),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 재고
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID REFERENCES consumable_catalog(id),
    stock_qty INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 5,
    warehouse_location VARCHAR(100),
    last_restocked_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 재고 입출고 이력
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID REFERENCES consumable_catalog(id),
    transaction_type VARCHAR(20), -- in/out/adjust
    qty INTEGER NOT NULL,
    reference_id UUID, -- 주문ID 또는 서비스요청ID
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 고객 주문
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(30) UNIQUE NOT NULL,
    company_id UUID REFERENCES companies(id),
    equipment_id UUID REFERENCES equipment(id),
    ordered_by VARCHAR(100),
    items JSONB NOT NULL, -- [{catalog_id, name, qty, unit_price}]
    subtotal NUMERIC(12, 2),
    tax NUMERIC(12, 2),
    total_amount NUMERIC(12, 2),
    status VARCHAR(30) DEFAULT 'pending',
    -- pending/confirmed/processing/shipped/delivered/cancelled
    delivery_address TEXT,
    tracking_no VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- A/S 서비스 요청
CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_no VARCHAR(30) UNIQUE NOT NULL,
    equipment_id UUID REFERENCES equipment(id),
    company_id UUID REFERENCES companies(id),
    request_type VARCHAR(30), -- breakdown/inspection/consumable/install
    priority VARCHAR(20) DEFAULT 'normal', -- urgent/normal/scheduled
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_technician_id UUID REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'received',
    -- received/dispatched/on_route/arrived/working/completed/cancelled
    scheduled_date DATE,
    arrived_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    parts_used JSONB, -- [{catalog_id, name, qty, unit_price}]
    labor_hours NUMERIC(5, 2),
    labor_cost NUMERIC(12, 2),
    parts_cost NUMERIC(12, 2),
    total_cost NUMERIC(12, 2),
    photos TEXT[], -- 작업 사진 URL 배열
    signature_url TEXT,
    report_pdf_url TEXT,
    customer_rating INTEGER, -- 1~5
    customer_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 계약
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_no VARCHAR(30) UNIQUE NOT NULL,
    company_id UUID REFERENCES companies(id),
    contract_type VARCHAR(30), -- supply/maintenance/full_service
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount NUMERIC(14, 2),
    payment_terms TEXT, -- 지불 조건
    scope TEXT, -- 계약 범위
    status VARCHAR(20) DEFAULT 'active', -- active/expired/cancelled
    attachment_url TEXT, -- PDF 계약서
    assigned_sales_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 견적서
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_no VARCHAR(30) UNIQUE NOT NULL,
    company_id UUID REFERENCES companies(id),
    contact_name VARCHAR(100),
    contact_email VARCHAR(200),
    items JSONB NOT NULL, -- [{type, model, qty, unit_price, description}]
    subtotal NUMERIC(14, 2),
    tax NUMERIC(14, 2),
    total NUMERIC(14, 2),
    valid_until DATE,
    status VARCHAR(20) DEFAULT 'draft', -- draft/sent/accepted/rejected/expired
    notes TEXT,
    pdf_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 (직원)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(30) DEFAULT 'viewer',
    -- superadmin/admin/sales/technician/viewer
    phone VARCHAR(30),
    region VARCHAR(50), -- 담당 지역
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
```

### 5.2 기존 테이블 수정

```sql
-- equipment 테이블에 컬럼 추가
ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS asset_no VARCHAR(30),     -- 자산 관리번호
  ADD COLUMN IF NOT EXISTS manufacture_date DATE,    -- 제조일
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2), -- 제조원가
  ADD COLUMN IF NOT EXISTS sell_price NUMERIC(12,2), -- 판매가
  ADD COLUMN IF NOT EXISTS asset_status VARCHAR(30) DEFAULT 'deployed';
  -- manufactured/in_stock/reserved/deployed/maintenance/retired

-- companies 테이블에 컬럼 추가
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS contract_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS contract_start DATE,
  ADD COLUMN IF NOT EXISTS contract_end DATE,
  ADD COLUMN IF NOT EXISTS assigned_sales_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_technician_id UUID,
  ADD COLUMN IF NOT EXISTS customer_grade VARCHAR(10) DEFAULT 'B';
  -- VIP/A/B/C
```

---

## 6. API 설계

### 6.1 소모품 카탈로그 API

```
GET    /api/v1/catalog                  # 전체 소모품 카탈로그 목록
POST   /api/v1/catalog                  # 소모품 등록
GET    /api/v1/catalog/{id}             # 단건 조회
PUT    /api/v1/catalog/{id}             # 수정
DELETE /api/v1/catalog/{id}             # 삭제
GET    /api/v1/catalog/by-model/{model} # 특정 장비 모델 호환 소모품
GET    /api/v1/catalog/by-type/{type}   # 장비 유형별 소모품
```

### 6.2 주문 API

```
GET    /api/v1/orders                   # 주문 목록 (관리자용)
POST   /api/v1/orders                   # 주문 생성
GET    /api/v1/orders/{id}             # 주문 상세
PATCH  /api/v1/orders/{id}/status      # 주문 상태 변경
GET    /api/v1/orders/by-company/{id}  # 업체별 주문 이력
POST   /api/v1/orders/{id}/ship        # 출고 처리 (tracking_no 입력)
```

### 6.3 서비스 요청(A/S) API

```
GET    /api/v1/service-requests               # 목록
POST   /api/v1/service-requests               # A/S 접수
GET    /api/v1/service-requests/{id}          # 상세
PATCH  /api/v1/service-requests/{id}/assign   # 기사 배차
PATCH  /api/v1/service-requests/{id}/status   # 상태 변경
POST   /api/v1/service-requests/{id}/complete # 작업 완료 (사진, 부품 청구)
GET    /api/v1/service-requests/technician/{uid} # 특정 기사 배정 목록
```

### 6.4 견적/계약 API

```
GET    /api/v1/quotations              # 견적서 목록
POST   /api/v1/quotations              # 견적서 생성
GET    /api/v1/quotations/{id}         # 상세
POST   /api/v1/quotations/{id}/send   # 이메일 발송
POST   /api/v1/quotations/{id}/accept # 견적 승인 → 계약 자동 생성

GET    /api/v1/contracts              # 계약 목록
POST   /api/v1/contracts              # 계약 등록
GET    /api/v1/contracts/{id}         # 상세
PATCH  /api/v1/contracts/{id}         # 수정
GET    /api/v1/contracts/expiring     # 만료 예정 계약 목록
```

### 6.5 재고 API

```
GET    /api/v1/inventory              # 재고 현황
GET    /api/v1/inventory/low-stock    # 부족 재고 목록
POST   /api/v1/inventory/restock      # 입고 처리
GET    /api/v1/inventory/transactions # 입출고 이력
```

---

## 7. 시스템 연동 흐름

### 7.1 소모품 교체 자동화 흐름

```
[장비 IoT 센서]
    │
    │ (운전시간 누적 / 센서 수치 이상)
    ▼
[TimescaleDB 시계열 데이터 저장]
    │
    │ (Celery 주기 작업: 매일 02:00)
    ▼
[소모품 수명 계산 엔진]
    │
    ├──▶ 교체 필요 소모품 발견
    │         │
    │         ├──▶ [알림 테이블] alert 자동 생성
    │         │
    │         ├──▶ [SMS/이메일] 고객사 담당자에게 교체 알림
    │         │
    │         └──▶ [주문 추천] 대시보드에 "소모품 주문 필요" 카드 표시
    │
    └──▶ 재고 부족 소모품 발견
              │
              └──▶ [발주 알림] 워터닉스 구매담당자에게 발주 요청
```

### 7.2 A/S 자동 접수 흐름

```
[장비 에러 코드 수신]
    │
    ▼
[알림 생성] severity: critical
    │
    │ (process_step: 1 → 에러 확인됨)
    ▼
[서비스 요청 자동 생성]
service_requests.request_type = 'breakdown'
service_requests.priority = 'urgent'
    │
    ▼
[담당 기사 자동 매칭]
(지역 기준 → 가용 기사 중 최근 배차 건 적은 순)
    │
    ▼
[기사에게 Push 알림]
    │
    ▼
[기사: 출발 → 도착 → 완료 처리]
    │
    ▼
[완료 보고서 자동 생성]
[고객 만족도 SMS 발송]
```

### 7.3 견적 → 납품 흐름

```
견적서 생성 (sales 직원)
    │
    ▼
PDF 자동 생성 → 이메일 발송
    │
    │ (고객 승인)
    ▼
수주 등록 → 계약서 생성
    │
    ▼
재고 확인 → 없으면 제조 발주 또는 구매 발주
    │
    ▼
장비 제조 완료 → 자산 등록 (asset_status: in_stock)
    │
    ▼
납품 준비 → 설치 일정 확정
    │
    ▼
설치 완료 → 장비 등록 (equipment 테이블, asset_status: deployed)
    │
    ▼
IoT 연동 설정 → 모니터링 시작
    │
    ▼
A/S 계약 자동 시작
```

---

## 8. 워터닉스 제품 카탈로그

### 8.1 전체 제품군 및 모델

| 카테고리 | 코드 | 모델 목록 | 처리 용량 |
|---|---|---|---|
| 냉각수 스케일제거 | DCRO | T50, T100, T500, T1000, T5000, T10000 | 50~10,000 L/h |
| 역삼투압 시스템 | WRO | T50, T100, T500, T1000, T5000, T10000 | 50~10,000 L/h |
| 초순수 시스템 | WDI | T50, T100, T500, T1000, T5000, T10000 | 50~10,000 L/h |
| 해수담수화 시스템 | WSRO | T50, T100, T500, T1000, T5000, T10000 | 50~10,000 L/h |
| 양액회수·재생 | WUF | T50, T100 | 50~100 L/h |
| 소형 시스템 | - | T05 (20L/h), T20 | - |
| UV살균 시스템 | WUV | T10, T30, T100 | 10~100 LPM |
| 연수 시스템 | WSF | T100, T500, T2000 | 100~2,000 L/h |
| 여과 시스템 | WFF | T100, T500, T2000 | 100~2,000 L/h |
| 전처리 필터 | WPF | SD, AC, MM | - |
| 부스터펌프 | WBP | T30, T100, T500 | 30~500 LPM |

### 8.2 제품별 핵심 소모품

| 장비 유형 | 주요 소모품 | 교체 주기 |
|---|---|---|
| DCRO (냉각수) | NF 멤브레인, Antiscalant, 세디먼트 필터 | 1년 / 1개월 / 3개월 |
| WRO (역삼투압) | RO 멤브레인, 세디먼트, CTO 활성탄, 스케일 방지제 | 1년 / 3개월 / 6개월 |
| WDI (초순수) | RO 멤브레인, 혼합 이온교환 수지, 양이온/음이온 수지 | 1년 / 6개월 / 1년 |
| WSRO (해수담수화) | SWRO 멤브레인, Antiscalant, 세디먼트 | 1년 / 1개월 / 1개월 |
| WUF (양액회수) | UF 중공사 멤브레인, 세정제(알칼리/산), UV 램프 | 2년 / 1주 / 1년 |
| WUV (UV살균) | UV 살균 램프, 석영 슬리브 | 1년 / 2년 |
| WSF (연수) | Na형 이온교환 수지, 재생 소금 | 2년 / 매월 |

---

## 9. 개발 우선순위 로드맵

### Phase 1 (즉시 구현 가능 - 현 시스템 확장) - 1~2개월

| 우선순위 | 기능 | 설명 |
|---|---|---|
| P1 | 소모품 카탈로그 DB | 전 제품군 소모품 master 데이터 구축 |
| P1 | 장비 등록 시 소모품 자동 등록 | 모델 선택 → 기본 소모품 일괄 등록 |
| P2 | 계약 관리 기본 기능 | 계약 기간, 유형, 만료 알림 |
| P2 | 재고 현황 대시보드 | 소모품 재고 현황 및 부족 알림 |
| P3 | 고객 포털 기초 | 고객사 담당자 로그인, 내 장비 조회 |

### Phase 2 (중기 개발) - 3~4개월

| 우선순위 | 기능 | 설명 |
|---|---|---|
| P1 | 소모품 주문 시스템 | 고객사 온라인 주문, 재고 연동 |
| P1 | A/S 접수 및 배차 | IoT 자동 접수, 기사 배차 |
| P2 | 견적서 생성 | PDF 자동 생성, 이메일 발송 |
| P2 | 직원 관리 | 역할별 권한, 기사 스케줄 |
| P3 | 발주 관리 | 소모품 자동 발주 트리거 |

### Phase 3 (장기 개발) - 5~6개월

| 우선순위 | 기능 | 설명 |
|---|---|---|
| P1 | 수주/납품 파이프라인 | 영업 CRM 기능 |
| P1 | 매출 분석 대시보드 | 제품별/지역별/고객별 수익 |
| P2 | 고객 만족도 관리 | A/S 완료 후 자동 평점 수집 |
| P2 | 모바일 앱 (기사용) | 현장 A/S 앱 (React Native) |
| P3 | AI 예측 유지보수 | 센서 데이터 기반 교체 시기 예측 |

---

## 10. 기술 스택 및 인프라

### 10.1 현재 인프라 정보

| 항목 | 정보 |
|---|---|
| **서버 IP** | 112.162.17.116 |
| **OS** | Ubuntu 22.04.5 LTS |
| **호스팅 패널** | aaPanel 8.0.0 |
| **컨테이너** | Docker Compose |
| **도메인** | https://gwaternix.w-websoftsrv.kr/ |
| **DB 이름** | sql_gwaternix |
| **배포 경로** | /opt/waternix |
| **FTP ID** | ftp_gwaternix |

### 10.2 서비스 포트 구성

| 서비스 | 내부 포트 | 비고 |
|---|---|---|
| Frontend (Next.js) | 3000 | Nginx 리버스 프록시 |
| Backend API (FastAPI) | 8000 | /api prefix |
| PostgreSQL | 5432 | 내부 전용 |
| Redis | 6379 | 내부 전용 |
| MQTT Broker | 1883 | 장비 IoT 통신 |
| Socket.io | 8000 | API 서버와 동일 |

### 10.3 Phase 2 추가 스택

```
신규 추가 예정
├── AWS S3 또는 MinIO    → 파일 스토리지 (계약서 PDF, 작업 사진)
├── SendGrid / 네이버 SMTP → 이메일 자동 발송
├── 알리고 또는 NHN Cloud → SMS/카카오 알림톡
├── WeasyPrint (Python)  → PDF 자동 생성 (견적서, 보고서)
└── JWT 인증 강화         → 고객 포털 분리 인증
```

### 10.4 코드 베이스 구조

```
water_dashboard/
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router 페이지
│   │   │   ├── page.tsx            # 메인 대시보드
│   │   │   ├── equipment/          # 장비 관리
│   │   │   ├── companies/          # 업체 관리
│   │   │   ├── maintenance/        # 유지보수
│   │   │   ├── inventory/          # 소모품/재고
│   │   │   ├── alerts/             # 알림 관리
│   │   │   └── reports/            # 보고서
│   │   ├── components/             # 재사용 컴포넌트
│   │   │   ├── equipment/          # 장비 관련 모달 등
│   │   │   ├── company/            # 업체 관련 모달
│   │   │   ├── maintenance/        # 유지보수 모달
│   │   │   └── layout/             # Header, Sidebar
│   │   ├── lib/
│   │   │   ├── api.ts              # API 클라이언트
│   │   │   └── utils.ts            # 유틸리티, 상수
│   │   └── types/
│   │       └── index.ts            # TypeScript 타입 정의
│   └── Dockerfile
├── backend/
│   ├── app/
│   │   ├── api/                    # FastAPI 라우터
│   │   │   ├── equipment.py
│   │   │   ├── companies.py
│   │   │   ├── maintenance.py
│   │   │   ├── filters.py
│   │   │   ├── alerts.py
│   │   │   └── dashboard.py
│   │   ├── models/
│   │   │   └── schemas.py          # Pydantic 스키마
│   │   ├── communication/          # 산업 통신 모듈
│   │   └── main.py                 # FastAPI 앱 진입점
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml              # 로컬 개발
├── docker-compose.prod.yml         # 프로덕션
├── AGENTS.md                       # AI 에이전트 메모리
├── BACKOFFICE_DESIGN.md            # 본 문서
└── manage.sh                       # 서버 관리 스크립트
```

---

## 부록: 용어 정의

| 용어 | 정의 |
|---|---|
| **업체(Company)** | 워터닉스 제품을 도입한 고객사 |
| **장비(Equipment)** | 현장에 설치된 워터닉스 수처리 장비 단위 |
| **소모품(Consumable/Filter)** | 정기 교체가 필요한 필터, 멤브레인, 약품 등 |
| **A/S 요청(Service Request)** | 고장, 점검, 소모품 교체 등의 현장 서비스 |
| **견적(Quotation)** | 신규 장비 또는 소모품 공급 견적서 |
| **자산(Asset)** | 워터닉스가 제조·보유한 장비 자산 |
| **카탈로그(Catalog)** | 워터닉스 소모품 전체 제품 목록 |

---

*본 문서는 워터닉스 대시보드 시스템의 설계 기준 문서입니다. 개발 진행에 따라 지속 업데이트됩니다.*
