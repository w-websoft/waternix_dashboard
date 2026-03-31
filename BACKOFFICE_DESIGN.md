# BACKOFFICE_DESIGN.md — 워터닉스 백오피스 설계 문서 v5.0

> **최종 수정**: 2026-03-28 (전면 재작성 — 구현 완료 반영)  
> 이 문서는 실제 구현된 코드를 기준으로 작성됩니다.

---

## 1. 시스템 전체 구조

```
워터닉스 통합 관리 시스템
├── [IoT 운영 모듈]
│   ├── 대시보드 (/)
│   ├── 장비 모니터링 (/equipment)
│   ├── 알림 관리 (/alerts)
│   └── 보고서 (/reports)
│
├── [백오피스 모듈] ← 이 문서 범위
│   ├── 업체(고객사) 관리 (/companies)
│   ├── 카탈로그 관리 (/catalog)  - 장비·소모품 제품 등록
│   ├── A/S 서비스 관리 (/service) ← v5.0 신규
│   ├── 견적서 관리 (/quotations) ← v5.0 신규
│   ├── 계약 관리 (/contracts)   ← v5.0 신규
│   ├── 소모품/재고 (/consumables)
│   ├── 유지보수 (/maintenance)
│   └── 시스템 설정 (/settings)  - 사용자 관리 포함
```

### 접근 제어 (인증)
- JWT 기반 로그인 → `localStorage` 저장
- Next.js Middleware로 `/login` 이외 모든 경로 보호
- 역할: `superadmin` / `manager` / `technician` / `viewer`
- 로그인: `POST /api/auth/login`
- 계정 관리: `GET/POST/PATCH/DELETE /api/auth/users`

---

## 2. 모듈별 설계 상세

---

### 2-A. 업체(고객사) 관리 `/companies`

#### 데이터 모델 (`companies` 테이블)

```sql
id               VARCHAR(36) PK
name             VARCHAR(200) NOT NULL
business_no      VARCHAR(30)
contact          VARCHAR(100)   -- 담당자명
phone            VARCHAR(30)
email            VARCHAR(200)
address          TEXT
city             VARCHAR(50)
district         VARCHAR(50)
lat / lng        NUMERIC        -- 지도 좌표
status           VARCHAR(20) DEFAULT 'active'
contract_start   DATE
contract_end     DATE
notes            TEXT
-- v5.0 신규 컬럼 (003_backoffice_extensions.sql)
customer_grade       VARCHAR(10) DEFAULT 'B'   -- VIP/A/B/C
contract_type        VARCHAR(30)               -- supply/maintenance/full_service
assigned_sales_id    VARCHAR(36)
assigned_tech_id     VARCHAR(36)
customer_rating      NUMERIC(3,1) DEFAULT 0
created_at / updated_at TIMESTAMPTZ
```

#### 업체 상세 탭 구성 (`/companies/[id]`)

| 탭 | 내용 |
|----|------|
| 업체 정보 | 기본 정보, 계약 기간, 담당자 |
| 설치 장비 | 해당 업체 소속 장비 목록 |
| 필터 현황 | 소모품 교체 현황 시각화 |
| 유지보수 | 유지보수 이력 |
| **계약** | contracts 테이블 연결 (v5.0 신규) |
| **A/S** | service_requests 테이블 연결 (v5.0 신규) |

---

### 2-B. 카탈로그 관리 `/catalog`

Waternix가 제조·판매하는 장비와 소모품을 **제품**처럼 등록/관리합니다.

#### 장비 카탈로그 (`equipment_catalog` 테이블)

```sql
id               VARCHAR(36) PK
model_code       VARCHAR(50) UNIQUE NOT NULL  -- e.g. "WRO-200"
model_name       VARCHAR(200)
equipment_type   VARCHAR(50)  -- ro / di / softener 등
category         VARCHAR(100)
specs            JSONB        -- {capacity_lph, pressure_bar, ...}
default_consumables JSONB     -- [{name, part_no, replace_interval_days}]
sell_price       BIGINT
warranty_months  INTEGER
description      TEXT
is_active        BOOLEAN DEFAULT TRUE
```

#### 소모품 카탈로그 (`consumable_catalog` 테이블)

```sql
id               VARCHAR(36) PK
part_no          VARCHAR(100) UNIQUE
name             VARCHAR(300)
category         VARCHAR(100)
equipment_type   VARCHAR(50)
compatible_models TEXT[]
unit             VARCHAR(20)
replace_interval_hours INTEGER
sell_price / cost_price BIGINT
min_order_qty    INTEGER DEFAULT 1
supplier         VARCHAR(200)
description      TEXT
is_active        BOOLEAN DEFAULT TRUE
```

#### 기본 데이터 시딩
- `POST /api/equipment-catalog/seed` → 20개 워터닉스 모델 삽입
- `POST /api/catalog/seed` → 89개 소모품 삽입

---

### 2-C. A/S 서비스 관리 `/service` ✅ v5.0 구현완료

#### 데이터 모델 (`service_requests` 테이블)

```sql
id                     VARCHAR(36) PK DEFAULT gen_random_uuid()
request_no             VARCHAR(30) UNIQUE  -- SR-YYYYMMDD-NNNN
equipment_id           VARCHAR(36)
company_id             VARCHAR(36)
equipment_name         VARCHAR(200)
company_name           VARCHAR(200)
request_type           VARCHAR(30)     -- breakdown/inspection/consumable/install/other
priority               VARCHAR(20)     -- urgent/normal/scheduled
title                  VARCHAR(300)
description            TEXT
assigned_technician_id VARCHAR(36)
technician_name        VARCHAR(100)
status                 VARCHAR(30)     -- received/dispatched/on_route/arrived/working/completed/cancelled
scheduled_date         DATE
arrived_at             TIMESTAMPTZ
completed_at           TIMESTAMPTZ
parts_used             JSONB           -- [{name, qty, unit_price}]
labor_hours            NUMERIC(5,2)
labor_cost / parts_cost / total_cost  BIGINT
report_notes           TEXT
customer_rating        INTEGER (1~5)
customer_feedback      TEXT
created_at / updated_at TIMESTAMPTZ
```

#### A/S 처리 플로우

```
접수(received)
  → 배차완료(dispatched)  [PATCH /service-requests/{id}/dispatch]
  → 이동중(on_route)      [PATCH /service-requests/{id}/status]
  → 현장도착(arrived)     [PATCH /service-requests/{id}/status → arrived_at 자동 기록]
  → 작업중(working)
  → 완료(completed)       [PATCH /service-requests/{id}/complete → 비용·보고서 기록]
```

#### API 목록

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/service-requests` | 목록 (필터: status, priority, request_type, search) |
| GET | `/api/service-requests/stats` | KPI 통계 |
| GET | `/api/service-requests/{id}` | 상세 |
| POST | `/api/service-requests` | 접수 |
| PATCH | `/api/service-requests/{id}/dispatch` | 기사 배차 |
| PATCH | `/api/service-requests/{id}/status` | 상태 변경 |
| PATCH | `/api/service-requests/{id}/complete` | 완료 처리 |
| PUT | `/api/service-requests/{id}` | 수정 |
| DELETE | `/api/service-requests/{id}` | 삭제 |

#### 프론트엔드 (`/service`)
- KPI 카드: 처리중 / 긴급 / 배차대기 / 이번달 / 완료
- 필터: 상태 / 우선순위 / 유형 / 검색
- 테이블: 클릭 → 우측 슬라이드 상세 패널
- 상태 변경 버튼 (in-place)
- 완료 처리 모달 (비용, 작업보고서, 고객 평점)

---

### 2-D. 견적서 관리 `/quotations` ✅ v5.0 구현완료

#### 데이터 모델 (`quotations` 테이블)

```sql
id              VARCHAR(36) PK
quote_no        VARCHAR(30) UNIQUE   -- Q-YYYY-NNNN
company_id      VARCHAR(36)
company_name    VARCHAR(200)
contact_name / contact_email / contact_phone
items           JSONB                -- [{type, model_code, name, qty, unit_price, amount}]
subtotal        BIGINT
tax             BIGINT               -- subtotal × 10%
total           BIGINT
valid_until     DATE
status          VARCHAR(20)          -- draft/sent/accepted/rejected/expired
notes           TEXT
created_by      VARCHAR(100)
created_at / updated_at TIMESTAMPTZ
```

#### 견적 → 계약 자동 변환 플로우

```
draft (작성) → [발송] → sent → [수락] → accepted
                                    ↓
                              contracts 테이블에 계약 자동 생성
```

#### API 목록

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/quotations` | 목록 (필터: status, search) |
| GET | `/api/quotations/{id}` | 상세 |
| POST | `/api/quotations` | 작성 (subtotal/tax/total 자동 계산) |
| PUT | `/api/quotations/{id}` | 수정 |
| PATCH | `/api/quotations/{id}/send` | 발송 처리 |
| PATCH | `/api/quotations/{id}/accept` | 수락 → 계약 자동생성 |
| DELETE | `/api/quotations/{id}` | 삭제 |

#### 프론트엔드 (`/quotations`)
- 품목 동적 추가/삭제 (소계·부가세·합계 실시간 계산)
- 발송/수락 버튼 in-table
- 우측 슬라이드 패널 — 품목 테이블 + 금액 요약

---

### 2-E. 계약 관리 `/contracts` ✅ v5.0 구현완료

#### 데이터 모델 (`contracts` 테이블)

```sql
id                VARCHAR(36) PK
contract_no       VARCHAR(30) UNIQUE   -- C-YYYY-NNNN
company_id / company_name
quotation_id      VARCHAR(36)          -- 견적서에서 생성된 경우
contract_type     VARCHAR(30)          -- supply/maintenance/full_service
title             VARCHAR(300)
start_date / end_date DATE
amount            BIGINT
payment_terms     TEXT
scope             TEXT
status            VARCHAR(20)          -- draft/active/expired/cancelled
assigned_sales_id / sales_name
notes             TEXT
created_at / updated_at TIMESTAMPTZ
-- 조회 시 days_remaining 동적 계산 (Python)
```

#### 만료 관리

- `GET /api/contracts/expiring` → 90일 이내 만료 예정 계약
- 프론트엔드에서 상단 경고 배너로 표시
- D-Day 색상 코드: `< 0` 빨강·굵게 / `< 30` 빨강 / `< 60` 노랑 / `< 90` 주황 / 이상 초록

#### API 목록

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/contracts` | 목록 (필터: status, contract_type, expiring_soon, search) |
| GET | `/api/contracts/expiring` | 90일 이내 만료 목록 |
| GET | `/api/contracts/{id}` | 상세 |
| POST | `/api/contracts` | 등록 |
| PUT | `/api/contracts/{id}` | 수정 |
| DELETE | `/api/contracts/{id}` | 삭제 |

---

### 2-F. 소모품/재고 관리 `/consumables`

기존 구현 (`filters` 테이블 기반) + `consumable_catalog` 연계

```sql
-- filters 테이블 (기존 + v4.0 확장)
id / equipment_id / company_id
filter_name / filter_type / stage
install_date / replace_date / last_replaced
capacity_liters / used_liters / used_percent
status          -- normal/warning/replace/replaced
supplier / cost
replace_interval_days   -- v4.0 추가
catalog_part_no         -- v4.0 추가
```

#### 소모품 자동 등록
장비 등록 시 카탈로그의 `default_consumables`에서 자동으로 `filters` 레코드 생성

---

### 2-G. 유지보수 `/maintenance`

```sql
-- maintenance_records 테이블
id / equipment_id / company_id
title / type / description
technician / vendor
status          -- scheduled/in_progress/completed
scheduled_date / completed_date
cost / notes
```

---

### 2-H. 시스템 설정 `/settings`

#### 사용자 관리

```sql
-- users 테이블
id (UUID) / username / email / full_name
hashed_password (bcrypt)
role            -- superadmin/manager/technician/viewer
is_active       BOOLEAN
created_at / updated_at
```

- `GET /api/auth/users` — 목록 (manager 이상)
- `POST /api/auth/users` — 생성 (superadmin만)
- `PATCH /api/auth/users/{id}` — 수정 (is_active 포함)
- `DELETE /api/auth/users/{id}` — 비활성화
- `POST /api/auth/change-password` — 본인 비밀번호 변경

#### 시스템 설정 (DB Key-Value 저장)

```sql
-- system_settings 테이블
key / value / category / description
```

카테고리: `general` / `data` / `alert`  
API: `GET /api/settings` / `PATCH /api/settings`

---

## 3. DB 마이그레이션 이력

| 파일 | 내용 |
|------|------|
| `001_initial.sql` | 기본 테이블 전체 생성 |
| `002_equipment_catalog.sql` | equipment_catalog, consumable_catalog, system_settings |
| `003_backoffice_extensions.sql` | service_requests, quotations, contracts, inventory_transactions<br>+ equipment.asset_status, companies.customer_grade 등 신규 컬럼 |

---

## 4. 프론트엔드 라우팅 구조

| 경로 | 컴포넌트 | 모듈 |
|------|----------|------|
| `/` | DashboardPage | KPI 요약·지도 |
| `/equipment` | EquipmentPage | 장비 목록·지도 |
| `/equipment/[id]` | EquipmentDetailPage | 장비 상세 |
| `/equipment/[id]/layout-editor` | LayoutEditorPage | 시설 배치도 |
| `/companies` | CompaniesPage | 업체 목록 |
| `/companies/[id]` | CompanyDetailPage | 업체 상세 (6탭) |
| `/catalog` | CatalogPage | 장비·소모품 카탈로그 |
| `/service` | ServicePage | A/S 관리 ✅ v5.0 |
| `/quotations` | QuotationsPage | 견적서 관리 ✅ v5.0 |
| `/contracts` | ContractsPage | 계약 관리 ✅ v5.0 |
| `/maintenance` | MaintenancePage | 유지보수 이력 |
| `/consumables` | ConsumablesPage | 소모품/재고 |
| `/reports` | ReportsPage | 보고서 |
| `/alerts` | AlertsPage | 알림 관리 |
| `/settings` | SettingsPage | 시스템 설정·사용자 |
| `/login` | LoginPage | 인증 |

---

## 5. 미구현 항목 (Phase 3 과제)

### 5-1. 장비 자산 상태 관리 (부분 구현)
DB 컬럼(`asset_status`)은 추가되었으나 UI는 미구현.  
**현재**: equipment.status = IoT 운영 상태  
**필요**: asset_status = `[제조→재고→예약→납품→운영→A/S→폐기]` 별도 관리

### 5-2. 재고 입출고 이력
`inventory_transactions` 테이블은 생성되었으나 API·UI 없음.  
→ 소모품 교체 시 자동 입출고 기록 연계 필요

### 5-3. 모바일 기사 앱 / 현장 리포트
- 기사 현장 도착 → 사진 업로드 → 전자 서명 처리
- 현재: 텍스트 기반 처리만 가능

### 5-4. 자동 발주 시스템
- 소모품 재고 임계치 도달 시 자동 발주 알림
- 공급업체 연동 API

### 5-5. 정기 보고서 자동 발송
- 월간 A/S 현황 / 장비 가동률 / 계약 만료 예정
- 이메일/SMS 자동 발송 (Celery task 필요)

### 5-6. 청구서·세금계산서 발행
- 계약 기반 청구서 자동 생성
- 전자세금계산서 API 연동

---

## 6. 보안 고려사항

| 항목 | 현황 |
|------|------|
| 인증 | JWT (HS256) — 운영 시 RS256 권장 |
| 비밀번호 | bcrypt 해싱 |
| CORS | 환경변수로 화이트리스트 관리 |
| Rate Limit | 미구현 — 운영 전 nginx 레벨 적용 권장 |
| HTTPS | Nginx + Let's Encrypt (gwaternix.w-websoftsrv.kr) |
| API 인가 | 현재 로그인 여부만 체크 — 역할 기반 권한 강화 필요 |

---

## 7. 운영 서버 정보

| 항목 | 값 |
|------|-----|
| 도메인 | https://gwaternix.w-websoftsrv.kr |
| 서버 IP | 112.162.17.116 |
| 코드 경로 | `/opt/waternix` |
| 배포 방법 | `manage.sh update` (git pull → 빌드 → 재시작) |
| 프론트 포트 | 3010 (Nginx → 3010) |
| 백엔드 포트 | 8010 (Nginx → 8010/api, /socket.io) |
