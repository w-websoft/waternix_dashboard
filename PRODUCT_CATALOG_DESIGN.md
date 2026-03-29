# 워터닉스 제품 카탈로그 시스템 설계서

> **작성일**: 2026-03-29  
> **버전**: v1.0  
> **목적**: 워터닉스가 자체 제작하는 장비 및 소모품을 "제품 등록" 개념으로 관리하는 시스템 설계

---

## 1. 시스템 개요

### 1.1 핵심 목적

워터닉스의 제품 라인업을 **상품 등록 시스템**으로 관리하여:
- 고객사에 장비 설치 시 카탈로그에서 모델을 선택 → 표준화된 정보 자동 입력
- 각 장비 모델별 기본 소모품이 자동으로 등록되어 교체 주기 추적 가능
- 원가/판매가 정보 보관으로 견적·매출 분석 기반 마련
- 전체 설치 장비의 모델별 분포 현황 파악

### 1.2 2-테이블 구조

```
equipment_catalog        ← 워터닉스 자사 제품 카탈로그 (장비)
consumable_catalog       ← 워터닉스 소모품/부품 카탈로그
        ↕ default_consumables (JSONB 참조)
equipment (설치 장비)    ← catalog_model_code 참조
filters (설치 소모품)    ← catalog_part_no 참조
```

---

## 2. 데이터 모델

### 2.1 equipment_catalog (장비 카탈로그)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | VARCHAR(36) PK | UUID |
| model_code | VARCHAR(100) UNIQUE | 모델 코드 (예: DCRO-500) |
| model_name | VARCHAR(300) | 제품명 |
| equipment_type | VARCHAR(50) | 장비 유형 (ro/cooling/di/...) |
| series | VARCHAR(100) | 시리즈명 (DCRO/WRO/WDI...) |
| category | VARCHAR(100) | 분류명 |
| description | TEXT | 제품 설명 |
| specs | JSONB | 사양 {capacity_lph, voltage, power_kw, ...} |
| default_consumables | JSONB | 기본 소모품 [{part_no, name, interval_days}] |
| warranty_months | INTEGER | 보증 기간(월), 기본 12 |
| sell_price | BIGINT | 판매가 (원) |
| cost_price | BIGINT | 원가 (원) |
| lead_time_days | INTEGER | 납기 (일) |
| is_active | BOOLEAN | 활성 여부 |
| sort_order | INTEGER | 정렬 순서 |

### 2.2 consumable_catalog (소모품 카탈로그)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | VARCHAR(36) PK | UUID |
| part_no | VARCHAR(100) UNIQUE | 부품번호 (예: DCRO-SD-5) |
| name | VARCHAR(300) | 품목명 |
| category | VARCHAR(50) | filter/membrane/chemical/pump/sensor |
| equipment_type | VARCHAR(50) | 호환 장비 유형 |
| compatible_models | JSONB | 호환 모델 목록 |
| unit | VARCHAR(20) | 단위 (개/L/kg/set) |
| replace_interval_hours | INTEGER | 교체 주기 (운전 시간) |
| sell_price | NUMERIC | 판매가 |
| cost_price | NUMERIC | 원가 |
| min_order_qty | INTEGER | 최소 주문 수량 |
| supplier | VARCHAR(200) | 공급업체 |
| is_active | BOOLEAN | 활성 여부 |

---

## 3. 워터닉스 제품 라인업 (초기 등록 데이터)

### 3.1 장비 카탈로그 (20개 모델)

| 시리즈 | 모델 코드 | 용량 | 유형 | 판매가 |
|--------|-----------|------|------|--------|
| DCRO | DCRO-150 | 150 L/h | cooling | 12,000,000원 |
| DCRO | DCRO-300 | 300 L/h | cooling | 18,000,000원 |
| DCRO | DCRO-500 | 500 L/h | cooling | 28,000,000원 |
| DCRO | DCRO-1000 | 1,000 L/h | cooling | 45,000,000원 |
| WRO | WRO-500 | 500 L/h | ro | 15,000,000원 |
| WRO | WRO-1000 | 1,000 L/h | ro | 22,000,000원 |
| WRO | WRO-2000 | 2,000 L/h | ro | 38,000,000원 |
| WRO | WRO-5000 | 5,000 L/h | ro | 75,000,000원 |
| WDI | WDI-100 | 100 L/h | di | 25,000,000원 |
| WDI | WDI-500 | 500 L/h | di | 60,000,000원 |
| WSRO | WSRO-1000 | 1,000 L/h | seawater | 85,000,000원 |
| WSRO | WSRO-3000 | 3,000 L/h | seawater | 180,000,000원 |
| WUF | WUF-200 | 200 L/h | uf | 18,000,000원 |
| WUF | WUF-500 | 500 L/h | uf | 35,000,000원 |
| T | T05 | 5 L/h | small | 850,000원 |
| T | T20 | 20 L/h | small | 1,800,000원 |
| WUV | WUV-50 | 50 L/h | uv | 2,500,000원 |
| WUV | WUV-200 | 200 L/h | uv | 5,800,000원 |
| WSF | WSF-500 | 500 L/h | softener | 8,000,000원 |
| WSF | WSF-2000 | 2,000 L/h | softener | 22,000,000원 |

---

## 4. API 설계

### 4.1 장비 카탈로그 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/equipment-catalog | 전체 목록 (필터: equipment_type, series) |
| GET | /api/equipment-catalog/{model_code} | 모델 상세 |
| POST | /api/equipment-catalog | 신규 제품 등록 |
| PUT | /api/equipment-catalog/{id} | 제품 정보 수정 |
| DELETE | /api/equipment-catalog/{id} | 비활성화 |
| POST | /api/equipment-catalog/seed | 기본 데이터 시딩 |

### 4.2 소모품 카탈로그 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/catalog | 목록 (필터: equipment_type, category, search) |
| POST | /api/catalog | 신규 등록 |
| PUT | /api/catalog/{id} | 수정 |
| DELETE | /api/catalog/{id} | 삭제 |
| POST | /api/catalog/seed | 초기 데이터 시딩 (89개) |

### 4.3 시스템 설정 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/settings | 전체 설정 조회 |
| GET | /api/settings/{category} | 카테고리별 조회 |
| PATCH | /api/settings | 설정 일괄 업데이트 |

---

## 5. 프론트엔드 화면

### 5.1 카탈로그 관리 페이지 (`/catalog`)

**탭 1: 장비 카탈로그**
- 모델 목록 테이블 (모델코드, 제품명, 유형, 시리즈, 판매가, 보증, 상태)
- 행 클릭 → 상세 펼침 (사양 JSON, 기본 소모품 목록, 원가 정보)
- 신규 등록 모달 (기본 소모품 항목 추가/삭제 기능)
- 유형 필터, 검색, 기본 데이터 로드 버튼

**탭 2: 소모품 카탈로그**
- 소모품 목록 테이블 (부품번호, 품목명, 분류, 호환 유형, 판매가, 교체주기)
- 분류/유형 이중 필터
- 신규 소모품 등록 모달

### 5.2 장비 등록 모달 (카탈로그 연동)

장비 유형 선택 → **카탈로그에서 모델 자동 로드**:
1. `GET /api/equipment-catalog?equipment_type={type}`
2. 모델 선택 → 모델코드, 처리용량, 보증기간 자동 입력
3. 등록 완료 시 → `default_consumables`에 정의된 소모품 자동으로 `filters` 테이블에 생성

카탈로그에 모델이 없는 경우 → 기존 하드코딩 목록으로 fallback

---

## 6. 인증 시스템 개선

### 6.1 users 테이블 기반 인증

기존 `config.py` 하드코딩 제거 → `users` 테이블에서 로그인 검증:

```
POST /api/auth/login
  → users 테이블에서 username 조회
  → passlib bcrypt 비밀번호 검증
  → JWT 토큰 발급 (sub, email, role, name 포함)
  → config 관리자 계정은 fallback으로 유지
```

### 6.2 역할 기반 접근 제어

| 역할 | 한글명 | 권한 |
|------|--------|------|
| superadmin | 슈퍼관리자 | 모든 기능 |
| manager | 관리자 | 사용자 조회, 설정 변경 |
| technician | 기술자 | 장비/유지보수 등록 |
| viewer | 조회자 | 읽기 전용 |

---

## 7. 시스템 설정 DB 연동

### 7.1 system_settings 테이블

모든 시스템 설정을 DB에 저장하여 재배포 없이 변경 가능:

| key | 기본값 | 설명 |
|-----|--------|------|
| company_name | (주)워터닉스 | 회사명 |
| collect_interval_sec | 30 | 센서 수집 주기 |
| alert_tds_warn | 20 | TDS 경고 기준 |
| alert_filter_warn | 80 | 필터 수명 경고 |

---

## 8. 향후 개발 계획

### Phase 2 (다음 단계)
- [ ] 장비 카탈로그에 실제 제품 이미지 업로드
- [ ] 소모품 주문 연동 (발주 요청 → 재고 차감)
- [ ] 모델별 설치 현황 통계 (카탈로그 → 실제 설치 대수)
- [ ] 고객사별 설치 장비 + 소모품 구매 이력

### Phase 3 (장기)
- [ ] 견적서 자동 생성 (카탈로그 단가 기반)
- [ ] 소모품 자동 발주 트리거 (재고 부족 시)
- [ ] 워터닉스 자체 쇼핑몰 연동 API
