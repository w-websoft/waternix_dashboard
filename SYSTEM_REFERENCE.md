# 워터닉스 IoT 관리 시스템 — 파일별 기능 설계 참조서

> **버전**: v4.0.0 | **최종 수정**: 2026-03-29  
> **목적**: 시스템 전체 파일의 역할·구현 방식을 인수인계용으로 정리한 참조 문서  
> **운영 주소**: https://gwaternix.w-websoftsrv.kr  
> **GitHub**: https://github.com/w-websoft/waternix_dashboard.git

---

## 목차

1. [시스템 전체 구조](#1-시스템-전체-구조)
2. [프론트엔드 — 페이지 파일](#2-프론트엔드--페이지-파일)
3. [프론트엔드 — 컴포넌트 파일](#3-프론트엔드--컴포넌트-파일)
4. [프론트엔드 — 공통 라이브러리](#4-프론트엔드--공통-라이브러리)
5. [백엔드 — API 라우터](#5-백엔드--api-라우터)
6. [백엔드 — 핵심 모듈](#6-백엔드--핵심-모듈)
7. [백엔드 — 통신 서비스](#7-백엔드--통신-서비스)
8. [데이터베이스 구조](#8-데이터베이스-구조)
9. [인프라 / 배포](#9-인프라--배포)
10. [API 전체 엔드포인트 목록](#10-api-전체-엔드포인트-목록)

---

## 1. 시스템 전체 구조

```
사용자 브라우저
     │ HTTPS
     ▼
Nginx (aaPanel)  gwaternix.w-websoftsrv.kr
  ├─ /          → proxy → localhost:3010  (Next.js 프론트엔드)
  ├─ /api/      → proxy → localhost:8010/api/  (FastAPI 백엔드)
  └─ /socket.io/→ proxy → localhost:8010/socket.io/  (WebSocket)
         │
   Docker Compose (docker-compose.prod.yml)
   ├── waternix_frontend  (Next.js 16, 포트 3010)
   ├── waternix_backend   (FastAPI, 포트 8010)
   ├── waternix_postgres  (PostgreSQL 15 + TimescaleDB, 포트 5433)
   ├── waternix_redis     (Redis 7, 포트 6382)
   └── waternix_mqtt      (Eclipse Mosquitto 2, 포트 1883/9002)

현장 IoT 장비
  ├── MQTT 게이트웨이 → Mosquitto → FastAPI MQTT 핸들러
  └── Modbus TCP/RTU → FastAPI → DB
```

### 기술 스택 요약

| 영역 | 기술 | 버전 |
|------|------|------|
| 프론트엔드 | Next.js (App Router) | 16.2.1 |
| 언어 | TypeScript | 5.x |
| 스타일 | Tailwind CSS | 4.x |
| 지도 | Leaflet + react-leaflet | 최신 |
| 차트 | Recharts | 최신 |
| 레이아웃 에디터 | @xyflow/react (React Flow) | 최신 |
| 백엔드 | FastAPI | 0.115.6 |
| 언어 | Python | 3.11+ |
| 데이터 검증 | Pydantic v2 | 2.10.4 |
| DB 드라이버 | asyncpg | 최신 |
| 인증 | python-jose (JWT) + passlib (bcrypt) | - |
| 실시간 | python-socketio | 5.11.4 |
| 산업 통신 | pymodbus 3.x / paho-mqtt 2.x / pyserial | - |
| DB | PostgreSQL 15 + TimescaleDB | - |
| 캐시 | Redis 7 | - |

---

## 2. 프론트엔드 — 페이지 파일

### 2-1. `frontend/src/app/layout.tsx` (18줄)

**역할**: 전체 앱의 HTML 루트 레이아웃  
**구현 방식**:
- `<html lang="ko">` 설정으로 한국어 문서 선언
- `<body>` 내부에 `{children}` 렌더링 (각 페이지가 여기 삽입)
- Tailwind의 기본 폰트·배경 적용

---

### 2-2. `frontend/src/app/login/page.tsx` (149줄)

**역할**: 관리자 로그인 페이지 (`/login`)  
**주요 기능**:
- 아이디/비밀번호 입력 → `POST /api/auth/login` 호출
- 성공 시 `localStorage`에 `waternix_token`, `waternix_user` 저장
- 쿠키(`waternix_token`)에도 토큰 설정 → 미들웨어 인증에 활용
- `from` 쿼리 파라미터로 이전 요청 URL 복원 후 리다이렉트
- 비밀번호 표시/숨김 토글, 빈 값 클라이언트 검증

**구현 포인트**:
```typescript
// localStorage + cookie 이중 저장
localStorage.setItem('waternix_token', data.access_token);
document.cookie = `waternix_token=${data.access_token}; path=/`;
```

---

### 2-3. `frontend/src/app/page.tsx` (335줄)

**역할**: 메인 대시보드 (`/`)  
**주요 기능**:
1. **KPI 카드 4종**: 전체 장비 수, 정상 운영률, 오늘 정수량, 미해결 알림
2. **전국 장비 지도**: Leaflet 지도에 장비 마커 표시 (dynamic import)
3. **도넛 차트**: 장비 상태 분포 (정상/경고/오류/오프라인/점검)
4. **볼륨 차트**: 최근 14일 생산량 트렌드
5. **알림 목록**: 최근 미해결 알림 5건

**데이터 흐름**:
```
useEffect → Promise.all([
  dashboardApi.getSummary(),
  equipmentApi.getMapData(),
  alertsApi.list({ unresolved: true })
]) → setState → 화면 렌더링
```

**특이사항**: Leaflet은 SSR 불가 → `dynamic(() => import(), { ssr: false })`로 처리

---

### 2-4. `frontend/src/app/equipment/page.tsx` (326줄)

**역할**: 장비 목록 관리 (`/equipment`)  
**주요 기능**:
- 전체 장비 목록 테이블 (시리얼번호, 모델, 업체, 위치, 상태)
- 상태/유형/도시/검색어 필터링 (프론트엔드 클라이언트 필터)
- **장비 등록 버튼** → `AddEquipmentModal` 열기
- 장비 클릭 → `/equipment/{id}` 상세 페이지 이동
- 삭제 버튼 → `equipmentApi.delete()` 호출

**구현 포인트**: 페이지 진입 시 `equipmentApi.list()` 전체 조회 후 클라이언트에서 필터링 (API에도 서버 필터 파라미터 지원)

---

### 2-5. `frontend/src/app/equipment/[id]/page.tsx` (656줄)

**역할**: 장비 상세 페이지 (`/equipment/{id}`)  
**주요 기능**:
1. **기본 정보**: 모델, 시리얼번호, 위치, 통신 설정, 설치일/보증만료일
2. **실시간 센서**: 유량, 입구TDS, 출구TDS, 압력, 온도, 전력 수치 표시
3. **소모품/필터 목록**: 해당 장비에 등록된 소모품 + 수명 게이지바
4. **유지보수 이력**: 최근 완료/예정 유지보수 목록
5. **시설 배치도 링크**: 레이아웃 에디터로 이동
6. **소모품 등록 버튼** → `AddConsumableModal` 열기

**데이터 흐름**:
```
params.id → Promise.all([
  equipmentApi.get(id),
  filtersApi.list({ equipment_id: id }),
  maintenanceApi.list({ equipment_id: id })
]) → 화면 구성
```

---

### 2-6. `frontend/src/app/equipment/[id]/layout-editor/page.tsx` (659줄)

**역할**: 시설 배치도 에디터 (`/equipment/{id}/layout-editor`)  
**주요 기능**:
- **React Flow** 기반 드래그앤드롭 캔버스
- 노드 유형: `EquipmentNode` (장비), `TextLabelNode` (텍스트), `CustomImageNode` (이미지)
- **도구 패널**: 장비 아이콘 추가, 텍스트 추가, 이미지 업로드
- **엣지 연결**: 장비 간 파이프/통신 라인 연결
- **저장**: 캔버스 상태를 JSON으로 `localStorage`에 저장 (`layout_{equipmentId}`)

**구현 포인트**:
```typescript
// localStorage 기반 저장 (향후 DB 저장 예정)
const key = `layout_${equipmentId}`;
localStorage.setItem(key, JSON.stringify({ nodes, edges }));
```

---

### 2-7. `frontend/src/app/companies/page.tsx` (225줄)

**역할**: 업체 목록 관리 (`/companies`)  
**주요 기능**:
- 업체 카드 리스트 (업체명, 연락처, 지역, 계약 상태, 장비 수)
- 상태/검색 필터링
- **업체 등록 버튼** → `AddCompanyModal` 열기
- 업체 카드 클릭 → `/companies/{id}` 상세 이동

---

### 2-8. `frontend/src/app/companies/[id]/page.tsx` (465줄)

**역할**: 업체 상세 페이지 (`/companies/{id}`)  
**주요 기능**:
1. **기본 정보**: 업체명, 사업자번호, 담당자, 계약 기간 (인라인 편집 가능)
2. **설치 장비 목록**: 해당 업체의 장비 목록 + 상태
3. **장비 추가 버튼**: `AddEquipmentModal` (presetCompanyId 전달)
4. **QR코드**: 업체 ID 기반 QR 코드 자동 생성 (`qrcode.react`)
5. **업체 정보 수정**: 저장 버튼 클릭 시 `companiesApi.update()` 호출

---

### 2-9. `frontend/src/app/catalog/page.tsx` (956줄)

**역할**: 제품 카탈로그 관리 (`/catalog`)  
**주요 기능**:
- **탭 1 — 장비 카탈로그**: 워터닉스 자사 제품 목록 (20개 기본 등록)
  - 행 클릭 시 사양(specs JSON), 기본 소모품, 원가 정보 펼침
  - 신규 등록/수정/비활성화 모달
  - "기본 데이터 로드" → `POST /api/equipment-catalog/seed`
- **탭 2 — 소모품 카탈로그**: 소모품/부품 목록 (89개 기본 등록)
  - 분류·유형 이중 필터 + 검색
  - 신규 등록/수정/비활성화 모달
  - "기본 데이터 로드" → `POST /api/catalog/seed`

**모달 구조**:
```
EquipmentCatalogModal  ← 장비 모델 등록/수정
ConsumableCatalogModal ← 소모품 등록/수정
```

---

### 2-10. `frontend/src/app/maintenance/page.tsx` (299줄)

**역할**: 유지보수 관리 (`/maintenance`)  
**주요 기능**:
- 유지보수 기록 목록 (예정/진행중/완료/취소 탭 분류)
- 장비/업체/기간 필터
- **등록 버튼** → `AddMaintenanceModal` 열기
- 상태 변경 드롭다운 (예정→진행중→완료)
- 삭제 → `maintenanceApi.delete()` 호출

---

### 2-11. `frontend/src/app/consumables/page.tsx` (272줄)

**역할**: 소모품/재고 관리 (`/consumables`)  
**주요 기능**:
- **탭 분기**:
  - `filters` 탭: 설치된 장비별 필터·소모품 수명 모니터링
  - `inventory` 탭: 창고 재고 현황 (부족 알림 포함)
- 필터 탭: 수명 게이지바 + 교체 필요(빨강)/경고(노랑)/정상(초록) 색상
- 재고 탭: 재고량/최소수량 비교, 재고 부족 항목 강조
- 등록 버튼: 탭에 따라 `AddConsumableModal` 또는 `AddInventoryModal` 분기

---

### 2-12. `frontend/src/app/reports/page.tsx` (432줄)

**역할**: 보고서 페이지 (`/reports`)  
**주요 기능**:
1. **기간 필터**: 1개월/3개월/6개월/1년 선택
2. **업체 필터**: 전체 또는 특정 업체
3. **차트 3종**: 월별 정수량 막대, 장비 가동률 막대, 필터 교체 건수 라인
4. **요약 통계 카드**: 총 가동시간, 유지보수 건수, 교체 필터 수, 알림 건수
5. **CSV 내보내기**: 보고서 데이터를 CSV 파일로 다운로드

**구현 포인트**:
```typescript
// 기간별 start_date 동적 계산
function getPeriodStartDate(period: '1m'|'3m'|'6m'|'1y'): string { ... }
// CSV 다운로드
const blob = new Blob([csvContent], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
```

---

### 2-13. `frontend/src/app/alerts/page.tsx` (424줄)

**역할**: 알림 관리 (`/alerts`)  
**주요 기능**:
- 알림 목록 (심각도: 긴급/경고/정보 색상 구분)
- 단계별 처리 관리: 수신확인 → 조치중 → 완료
- 심각도/처리상태/기간 필터
- **일괄 확인 처리** 버튼
- 알림 삭제
- 각 알림에 처리 단계 드롭다운 (process_step 필드)

---

### 2-14. `frontend/src/app/settings/page.tsx` (628줄)

**역할**: 시스템 설정 (`/settings`)  
**탭 구성**:

| 탭 | 기능 |
|----|------|
| 일반 설정 | 회사정보(이름/사업자번호/대표자 등), 데이터 수집 주기 |
| 알림 설정 | TDS/필터 경고·긴급 임계값 설정 |
| 통신 설정 | MQTT 브로커 주소/포트, Modbus 타임아웃, 시리얼 보레이트 |
| 사용자 관리 | 사용자 목록(DB 연동), 추가/비활성화 |
| 보안 | 비밀번호 변경(DB 연동), 세션 타임아웃, 2FA 토글 |

**구현 포인트**:
- 저장 버튼 → `systemSettingsApi.update()` → `PATCH /api/settings`로 DB 저장
- 페이지 로드 시 `systemSettingsApi.getAll()`로 DB에서 현재 값 로드
- 사용자 목록 `authUsersApi.list()` → `GET /api/auth/users`

---

## 3. 프론트엔드 — 컴포넌트 파일

### 3-1. `frontend/src/components/layout/DashboardLayout.tsx` (39줄)

**역할**: 로그인 후 페이지의 공통 레이아웃 래퍼  
**구현 방식**:
- `Sidebar` + `Header` + `main` 영역으로 구성
- 마운트 시 `localStorage.getItem('waternix_token')` 확인 → 없으면 `/login` 리다이렉트
- `title`, `subtitle` prop으로 페이지 헤더 텍스트 주입

```typescript
useEffect(() => {
  const token = localStorage.getItem('waternix_token');
  if (!token) router.push('/login');
}, []);
```

---

### 3-2. `frontend/src/components/layout/Sidebar.tsx` (127줄)

**역할**: 좌측 내비게이션 사이드바  
**주요 기능**:
- 9개 메뉴 링크 (대시보드, 장비, 업체, **카탈로그**, 유지보수, 소모품, 보고서, 알림, 설정)
- 현재 경로(pathname) 하이라이트
- 유지보수/소모품/알림 메뉴에 **동적 배지** (미해결 건수 표시)
- 모바일 오버레이 (토글 방식)
- 로고 및 워터닉스 브랜딩

**배지 데이터**:
```typescript
useEffect(() => {
  dashboardApi.getSummary()
    .then(s => setBadges({
      maintenance: s.pending_maintenance,
      consumables: s.filter_replace,
      alerts: s.unresolved_alerts,
    }));
}, []);
```

---

### 3-3. `frontend/src/components/layout/Header.tsx` (129줄)

**역할**: 상단 헤더 바  
**주요 기능**:
- 햄버거 메뉴 버튼 (모바일 사이드바 토글)
- 페이지 제목/부제목 표시
- 사용자 이름 + 역할 표시 (`localStorage.getItem('waternix_user')`)
- **로그아웃 버튼**: 토큰/유저 정보 삭제 후 `/login` 이동
- 알림 아이콘 (빨간 점 배지)

---

### 3-4. `frontend/src/middleware.ts` (28줄)

**역할**: Next.js 미들웨어 — 인증이 없는 요청을 로그인 페이지로 리다이렉트  
**구현 방식**:
```typescript
export function middleware(request: NextRequest) {
  const token = request.cookies.get('waternix_token');
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login?from=' + pathname, request.url));
  }
}
// 인증 제외 경로: /login, /_next, /favicon.ico, /api
```

---

### 3-5. `frontend/src/components/map/EquipmentMap.tsx` (178줄)

**역할**: 전국 장비 Leaflet 지도  
**구현 방식**:
- `react-leaflet`의 `MapContainer`, `TileLayer`, `Marker`, `Popup`
- OpenStreetMap 타일 사용
- 장비 상태별 커스텀 마커 색상 (초록/노랑/빨강/회색)
- 마커 클릭 → Popup (업체명, 모델, 상태, 설치일 표시)
- `ssr: false` dynamic import 필수 (Leaflet은 브라우저 전용 API)

---

### 3-6. `frontend/src/components/equipment/AddEquipmentModal.tsx` (1,045줄)

**역할**: 장비 신규 등록 5단계 마법사 모달  
**단계 구성**:

| 단계 | 내용 |
|------|------|
| type | 장비 유형 선택 (11종) |
| model | **카탈로그에서 모델 선택** (없으면 하드코딩 목록) |
| company | 업체 선택 (DB 조회) |
| location | 위치 정보 (시/구/주소/좌표) |
| comm | 통신 방식 설정 (Modbus/MQTT/Serial/OPC-UA) |

**카탈로그 연동 핵심 흐름**:
```typescript
// 유형 선택 시 카탈로그 자동 로드
useEffect(() => {
  if (step === 'model' && form.equipmentType) {
    equipmentCatalogApi.list({ equipment_type: form.equipmentType })
      .then(setCatalogItems);
  }
}, [form.equipmentType, step]);

// 모델 선택 시 소모품 자동 등록
const defaultConsumables = selectedCatalogItem?.default_consumables || [];
await Promise.allSettled(defaultConsumables.map(c => filtersApi.create({ ... })));
```

---

### 3-7. `frontend/src/components/equipment/AddConsumableModal.tsx` (268줄)

**역할**: 장비에 소모품/필터 등록 모달  
**주요 기능**:
- 필터명, 필터 유형, 단계, 부품번호, 교체 주기, 공급업체 입력
- 제출 → `filtersApi.create()` → `POST /api/filters`
- `equipmentId`, `equipmentName`, `equipmentCompanyName` prop 주입

---

### 3-8. `frontend/src/components/company/AddCompanyModal.tsx` (334줄)

**역할**: 업체 신규 등록 3단계 마법사 모달  
**단계**: 기본정보(업체명/사업자번호) → 연락처/주소 → 계약 정보  
**제출** → `companiesApi.create()` → `POST /api/companies`

---

### 3-9. `frontend/src/components/maintenance/AddMaintenanceModal.tsx` (326줄)

**역할**: 유지보수 기록 등록 모달  
**주요 기능**:
- 장비 선택(DB 조회), 유지보수 유형(예방/교정/긴급/점검), 제목/내용
- 담당 기술자, 예정일, 사용 부품 목록
- 제출 → `maintenanceApi.create()` → `POST /api/maintenance`

---

### 3-10. `frontend/src/components/consumable/AddInventoryModal.tsx` (264줄)

**역할**: 재고 품목 등록 모달  
**주요 기능**:
- 품목명, 분류, 부품번호, 브랜드, 단위, 재고량, 최소수량, 단가, 공급업체
- 제출 → `consumablesApi.create()` → `POST /api/consumables`

---

### 3-11. `frontend/src/components/dashboard/KpiCard.tsx` (51줄)

**역할**: 대시보드 KPI 수치 카드 UI 컴포넌트  
**Props**: `title`, `value`, `unit`, `icon`, `color`, `trend` (증감률)  
**구현**: 단순 표시용 컴포넌트, 데이터는 부모(page.tsx)에서 주입

---

### 3-12. `frontend/src/components/dashboard/StatusDonut.tsx` (63줄)

**역할**: 장비 상태 도넛 차트 (Recharts PieChart)  
**Props**: `normal`, `warning`, `error`, `offline`, `maintenance` (각 건수)  
**구현**: Recharts `PieChart` + `Cell`로 5가지 색상 도넛 렌더링

---

### 3-13. `frontend/src/components/dashboard/VolumeChart.tsx` (101줄)

**역할**: 14일 생산량 트렌드 막대 차트  
**데이터 로직**:
1. `maintenanceApi.list()`로 최근 14일 유지보수 건수 조회
2. 데이터 있으면 일별 유지보수 건수 표시 (mode: 'maintenance')
3. 데이터 없으면 추정 생산량 값 표시 (mode: 'estimate')

---

### 3-14. `frontend/src/components/dashboard/AlertList.tsx` (67줄)

**역할**: 최근 알림 리스트 컴포넌트  
**Props**: `alerts: AlertPayload[]`, `maxItems?: number`  
**구현**: 심각도 뱃지(긴급/경고/정보) + 장비명 + 알림 메시지 + 시각

---

### 3-15. `frontend/src/components/layout-editor/EquipmentNode.tsx` (199줄)

**역할**: React Flow 캔버스의 장비 노드 커스텀 컴포넌트  
**기능**: 장비 아이콘 + 이름 표시, 선택 시 하이라이트, 핸들(연결점) 표시  
**Props**: ReactFlow `NodeProps` (position, data 등)

---

### 3-16. `frontend/src/components/layout-editor/CustomImageNode.tsx` (42줄)

**역할**: 레이아웃 에디터에서 업로드한 이미지를 노드로 표시  
**구현**: `<img>` 태그로 data URL 렌더링

---

### 3-17. `frontend/src/components/layout-editor/TextLabelNode.tsx` (35줄)

**역할**: 레이아웃 에디터에서 텍스트 라벨 노드  
**구현**: 편집 가능한 `<input>` 또는 `<div>` 텍스트 표시

---

## 4. 프론트엔드 — 공통 라이브러리

### 4-1. `frontend/src/lib/api.ts` (377줄)

**역할**: 백엔드 API 호출을 위한 클라이언트 함수 모음  
**구현 방식**:

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api'; // 프로덕션: Nginx 프록시 통해 같은 도메인

function getAuthHeaders() {
  const token = localStorage.getItem('waternix_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path, options) { ... }
```

**제공 API 객체**:

| 객체 | 엔드포인트 | 설명 |
|------|-----------|------|
| `dashboardApi` | `/dashboard/summary` | 대시보드 KPI |
| `companiesApi` | `/companies` | 업체 CRUD |
| `equipmentApi` | `/equipment` | 장비 CRUD + 지도 데이터 |
| `maintenanceApi` | `/maintenance` | 유지보수 CRUD |
| `alertsApi` | `/alerts` | 알림 CRUD + 처리 |
| `consumablesApi` | `/consumables` | 재고 CRUD |
| `filtersApi` | `/filters` | 소모품/필터 CRUD |
| `equipmentCatalogApi` | `/equipment-catalog` | 장비 카탈로그 CRUD |
| `consumableCatalogApi` | `/catalog` | 소모품 카탈로그 CRUD |
| `systemSettingsApi` | `/settings` | 시스템 설정 |
| `authUsersApi` | `/auth/users` | 사용자 관리 |

---

### 4-2. `frontend/src/lib/utils.ts` (76줄)

**역할**: 공통 유틸리티 함수 및 설정 상수  
**주요 내용**:
- `cn(...classes)`: Tailwind 조건부 클래스 병합 (clsx + tailwind-merge)
- `formatDate(date)`: ISO 날짜 → 한국어 형식 변환
- `STATUS_CONFIG`: 상태별 색상·레이블 (normal/warning/error/offline/maintenance)
- `EQUIPMENT_TYPE_CONFIG`: 장비 유형별 레이블·아이콘·색상 (11종)

---

### 4-3. `frontend/src/lib/mock-data.ts` (104줄)

**역할**: 개발/테스트용 더미 데이터  
**내용**: 14개 장비, 8개 업체 샘플 데이터 (현재는 실제 API 호출로 대체됨)

---

### 4-4. `frontend/src/types/index.ts` (163줄)

**역할**: 프론트엔드 전체에서 사용되는 TypeScript 타입 정의  
**주요 타입**:

| 타입 | 설명 |
|------|------|
| `EquipmentType` | 11가지 장비 유형 유니언 타입 |
| `EquipmentStatus` | 5가지 장비 상태 |
| `CommType` | 6가지 통신 방식 |
| `Equipment` | 장비 인터페이스 (camelCase) |
| `SensorData` | 센서 데이터 인터페이스 |
| `Filter` | 필터/소모품 인터페이스 |
| `MaintenanceRecord` | 유지보수 기록 인터페이스 |
| `Alert` | 알림 인터페이스 |
| `Consumable` | 재고 품목 인터페이스 |

> **주의**: API 응답은 snake_case (`api.ts`의 `*Payload` 인터페이스)이고, 내부 타입은 camelCase. 변환은 각 컴포넌트에서 처리.

---

## 5. 백엔드 — API 라우터

### 5-1. `backend/app/api/auth.py` (252줄)

**역할**: 인증 API (`/api/auth/*`)  
**엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| POST | /auth/login | 로그인 (JWT 발급) |
| GET | /auth/me | 현재 사용자 정보 |
| POST | /auth/logout | 로그아웃 |
| POST | /auth/verify | 토큰 유효성 검증 |
| POST | /auth/change-password | 비밀번호 변경 |
| GET | /auth/users | 사용자 목록 (관리자 전용) |
| POST | /auth/users | 사용자 추가 (슈퍼관리자) |
| PATCH | /auth/users/{id} | 사용자 수정 |
| DELETE | /auth/users/{id} | 사용자 비활성화 |

**인증 흐름**:
```
POST /auth/login
  1. users 테이블에서 username 조회 (is_active=true)
  2. passlib.CryptContext.verify(입력PW, hashed_PW)
  3. 검증 성공 → python-jose로 JWT 생성 (exp: 60분)
  4. Fallback: users 테이블 없으면 config.ADMIN_USERNAME 비교
```

**의존성 주입**:
```python
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    return verify_token(credentials.credentials)
```

---

### 5-2. `backend/app/api/equipment.py` (337줄)

**역할**: 장비 관리 API (`/api/equipment/*`)  
**엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | /equipment | 목록 (필터: company_id, status, equipment_type, city, search, page) |
| GET | /equipment/map | 지도 표시용 좌표 + 상태 데이터 |
| GET | /equipment/{id} | 장비 상세 |
| POST | /equipment | 신규 등록 |
| PUT | /equipment/{id} | 수정 |
| DELETE | /equipment/{id} | 삭제 |

**DB 쿼리 방식**: `asyncpg` raw SQL (SQLAlchemy ORM 미사용)  
**직렬화**: `_row_to_equipment()` 헬퍼로 Row → dict 변환 (날짜 ISO 변환, JSONB 파싱)

---

### 5-3. `backend/app/api/companies.py` (190줄)

**역할**: 업체 관리 API (`/api/companies/*`)  
**엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | /companies | 목록 (status, search, city 필터) |
| GET | /companies/{id} | 상세 |
| POST | /companies | 신규 등록 |
| PUT | /companies/{id} | 수정 |
| DELETE | /companies/{id} | 삭제 |

**특이사항**: `update_company` 실행 시 `equipment` 테이블에서 `COUNT`로 장비 수 실시간 집계하여 `equipment_count` 업데이트

---

### 5-4. `backend/app/api/equipment_catalog.py` (235줄)

**역할**: 워터닉스 장비 카탈로그 API (`/api/equipment-catalog/*`)  
**엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | /equipment-catalog | 목록 (equipment_type, series, search, active_only 필터) |
| GET | /equipment-catalog/series | 시리즈 목록 |
| GET | /equipment-catalog/{model_code} | 모델 상세 |
| POST | /equipment-catalog | 신규 제품 등록 |
| PUT | /equipment-catalog/{id} | 수정 |
| DELETE | /equipment-catalog/{id} | 비활성화 |
| POST | /equipment-catalog/seed | 기본 20개 모델 시딩 |

**시딩 데이터** (`WATERNIX_SEED_CATALOG` 상수):
- DCRO 4종 (150/300/500/1000 L/h)
- WRO 4종 (500/1000/2000/5000 L/h)
- WDI 2종 / WSRO 2종 / WUF 2종
- T 2종 (소형) / WUV 2종 / WSF 2종

---

### 5-5. `backend/app/api/catalog.py` (436줄)

**역할**: 소모품/부품 카탈로그 API (`/api/catalog/*`)  
**엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | /catalog | 목록 (equipment_type, category, search 필터) |
| POST | /catalog | 신규 등록 |
| PUT | /catalog/{id} | 수정 |
| DELETE | /catalog/{id} | 삭제 |
| POST | /catalog/seed | 89개 기본 소모품 시딩 |

**시딩 데이터**: DCRO/WRO/WDI/WSRO/WUF/WUV/WSF/WFF/WBP/WPF 전 제품군 소모품 89종

---

### 5-6. `backend/app/api/filters.py` (162줄)

**역할**: 설치 장비의 소모품/필터 상태 관리 API (`/api/filters/*`)  
**엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | /filters | 목록 (equipment_id, company_id, status 필터) |
| POST | /filters | 등록 (장비 등록 시 자동 호출됨) |
| PUT | /filters/{id} | 수정 (교체 완료 처리 포함) |
| DELETE | /filters/{id} | 삭제 |

**소모품 수명 계산**: `used_percent` = 경과일 / 교체주기일 × 100

---

### 5-7. `backend/app/api/maintenance.py` (193줄)

**역할**: 유지보수 기록 API (`/api/maintenance/*`)  
**엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | /maintenance | 목록 (equipment_id, company_id, status, start_date 필터) |
| POST | /maintenance | 등록 |
| PUT | /maintenance/{id} | 수정 |
| DELETE | /maintenance/{id} | 삭제 (없으면 404) |

---

### 5-8. `backend/app/api/alerts.py` (172줄)

**역할**: 알림/경보 API (`/api/alerts/*`)  
**엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | /alerts | 목록 (equipment_id, severity, unresolved 필터) |
| POST | /alerts | 등록 |
| PUT | /alerts/{id} | 수정 (처리 단계 변경) |
| DELETE | /alerts/{id} | 삭제 (없으면 404) |

**처리 단계** (`process_step`): `received` → `acknowledged` → `in_progress` → `completed`

---

### 5-9. `backend/app/api/consumables.py` (153줄)

**역할**: 창고 재고 관리 API (`/api/consumables/*`)  
**엔드포인트**: GET(목록/상세) / POST(등록) / PUT(수정) / DELETE(삭제)  
**특이사항**: 재고 부족 여부 (`is_low = stock_qty < min_qty`) 집계 포함

---

### 5-10. `backend/app/api/system_settings.py` (55줄)

**역할**: 시스템 설정 DB 저장/조회 API (`/api/settings/*`)  
**엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | /settings | 전체 설정 조회 |
| GET | /settings/{category} | 카테고리별 조회 (general/data/alert) |
| PATCH | /settings | 설정 일괄 업데이트 (인증 필요) |

**구현**: `system_settings` 테이블 key-value 구조 (ON CONFLICT DO UPDATE)

---

## 6. 백엔드 — 핵심 모듈

### 6-1. `backend/app/main.py` (245줄)

**역할**: FastAPI 애플리케이션 진입점  
**주요 구성**:

```python
# 1. Socket.IO 서버 생성 (실시간 통신)
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=...)

# 2. lifespan 컨텍스트 (시작/종료 이벤트)
@asynccontextmanager
async def lifespan(app):
    await init_pool()          # DB 연결 풀 초기화
    mqtt_service.start()       # MQTT 구독 시작
    yield
    mqtt_service.stop()
    await close_pool()

# 3. CORS 미들웨어 등록
# 4. 라우터 등록 (12개)
# 5. /api/dashboard/summary 집계 엔드포인트
# 6. /api/health 상태 체크
# 7. Socket.IO 이벤트 핸들러
```

**등록된 라우터**:
auth, equipment, companies, consumables, maintenance, alerts, filters, catalog, equipment_catalog, system_settings

---

### 6-2. `backend/app/core/config.py` (71줄)

**역할**: `pydantic-settings` 기반 환경변수 설정  
**주요 설정값**:

| 키 | 기본값 | 설명 |
|----|--------|------|
| DATABASE_URL | postgresql+asyncpg://... | PostgreSQL 연결 문자열 |
| SECRET_KEY | (변경 필요) | JWT 서명 키 |
| ACCESS_TOKEN_EXPIRE_MINUTES | 60 | 토큰 유효 시간 |
| MQTT_HOST / PORT | localhost / 1883 | MQTT 브로커 |
| ADMIN_USERNAME | admin | 관리자 계정 (Fallback) |
| ADMIN_PASSWORD | Waternix2026!@ | 관리자 비밀번호 |
| CORS_ORIGINS | localhost, gwaternix... | CORS 허용 도메인 |

**환경 파일**: `.env`에서 오버라이드 가능 (`env_file = ".env"`)

---

### 6-3. `backend/app/db/database.py` (81줄)

**역할**: asyncpg 데이터베이스 연결 풀 관리  
**구현 방식**:

```python
_pool: Optional[asyncpg.Pool] = None

async def init_pool():
    params = _parse_db_url(settings.DATABASE_URL)  # 특수문자 비밀번호 안전 파싱
    _pool = await asyncpg.create_pool(**params, min_size=2, max_size=10)

async def get_pool() -> asyncpg.Pool:
    if _pool is None:
        await init_pool()
    return _pool
```

**특이사항**: 비밀번호에 `#`, `@`, `!` 등 특수문자 포함 시 URL 파싱 오류 방지를 위한 커스텀 `_parse_db_url()` 함수 구현

---

### 6-4. `backend/app/models/schemas.py` (365줄)

**역할**: Pydantic v2 요청/응답 스키마 정의  
**주요 Enum 클래스**:

| Enum | 값 |
|------|----|
| EquipmentType | cooling, ro, di, seawater, uf, small, prefilter, uv, softener, filtration, booster |
| EquipmentStatus | normal, warning, error, offline, maintenance |
| CommType | modbus_tcp, modbus_rtu, mqtt, serial, opcua, http |
| FilterType | sediment, carbon, ro_membrane, uv, resin, antiscalant |
| MaintenanceType | preventive, corrective, emergency, inspection |
| AlertSeverity | critical, warning, info |
| UserRole | superadmin, admin, technician, viewer |

**주요 Pydantic 모델**:
- `EquipmentCreate`, `EquipmentUpdate`
- `CompanyCreate`, `CompanyUpdate`
- `FilterCreate`, `FilterUpdate`
- `MaintenanceCreate`, `MaintenanceUpdate`
- `AlertCreate`, `AlertUpdate`
- `ConsumableCreate`, `ConsumableUpdate`

---

## 7. 백엔드 — 통신 서비스

### 7-1. `backend/app/services/communication/modbus_service.py`

**역할**: Modbus TCP/RTU 통신 서비스  
**주요 클래스**: `ModbusService`  
**워터닉스 표준 레지스터 맵**:

```python
WATERNIX_REGISTER_MAP = {
    "flow_rate":      RegisterDef(0x0001, 2, FLOAT32, "L/min"),
    "daily_volume":   RegisterDef(0x0003, 2, FLOAT32, "L"),
    "inlet_pressure": RegisterDef(0x0005, 2, FLOAT32, "bar"),
    "outlet_tds":     RegisterDef(0x000B, 1, UINT16, "ppm"),
    "running_hours":  RegisterDef(0x0011, 2, FLOAT32, "h"),
    "status_bits":    RegisterDef(0x0100, 1, UINT16, ""),
    "error_code":     RegisterDef(0x0101, 1, UINT16, ""),
    ...
}
```

**주요 기능**:
- `connect_tcp(host, port, slave_id)`: Modbus TCP 연결
- `connect_rtu(port, baudrate, ...)`: Modbus RTU(RS485) 연결
- `read_telemetry()`: 전체 센서값 일괄 읽기 → dict 반환
- `write_coil(name, value)`: 원격 제어 (start/stop/flush)
- `DataType` Enum으로 UINT16/INT16/FLOAT32 자동 디코딩

---

### 7-2. `backend/app/services/communication/mqtt_service.py`

**역할**: MQTT 브로커 연결 및 구독/발행  
**주요 클래스**: `MQTTService`  
**토픽 구조**:
```
waternix/{company_id}/{equipment_id}/telemetry  ← 센서 데이터 (30초)
waternix/{company_id}/{equipment_id}/status     ← 상태 변경
waternix/{company_id}/{equipment_id}/alert      ← 알람
waternix/{company_id}/{equipment_id}/command    → 원격 제어
waternix/{company_id}/{equipment_id}/heartbeat  ← 생존 신호 (60초)
```

**주요 기능**:
- `start()`: 브로커 연결 + 와일드카드 구독 (`waternix/#`)
- `on_telemetry(callback)`: 센서 데이터 수신 콜백 등록
- `on_alert(callback)`: 알람 수신 콜백 등록
- `publish_command(company_id, equipment_id, cmd)`: 원격 제어 명령 발행

---

### 7-3. `backend/app/services/communication/serial_service.py`

**역할**: RS232/RS485 시리얼 통신 서비스  
**주요 클래스**: `SerialService`  
**주요 기능**:
- `pyserial` 기반 동기/비동기 시리얼 읽기/쓰기
- 보레이트/데이터비트/패리티/정지비트 설정
- 워터닉스 자체 프로토콜 프레임 파싱 지원

---

## 8. 데이터베이스 구조

### PostgreSQL 테이블 목록

| 테이블 | 설명 | 행 수(예상) |
|--------|------|------------|
| `companies` | 고객사(업체) | 수백 |
| `equipment` | 설치 장비 | 수천 |
| `filters` | 장비별 설치 소모품 | 수만 |
| `maintenance_records` | 유지보수 기록 | 수만 |
| `alerts` | 알림/경보 기록 | 수만 |
| `consumables` | 창고 재고 | 수백 |
| `sensor_readings` | 시계열 센서 데이터 (TimescaleDB) | 수억 |
| `users` | 관리자 사용자 | 소수 |
| `equipment_catalog` | 워터닉스 장비 카탈로그 | 20+ |
| `consumable_catalog` | 소모품/부품 카탈로그 | 89+ |
| `system_settings` | 시스템 설정 key-value | 14 |

### 주요 관계

```
companies (1) ──< equipment (N)
equipment (1) ──< filters (N)
equipment (1) ──< maintenance_records (N)
equipment (1) ──< alerts (N)
equipment (1) ──< sensor_readings (N) [TimescaleDB]
equipment_catalog (1) ──< equipment.catalog_model_code (N)
consumable_catalog (1) ──< filters.catalog_part_no (N)
```

### 마이그레이션 파일

| 파일 | 내용 |
|------|------|
| `001_consumable_catalog.sql` | consumable_catalog 테이블 + 89개 초기 데이터 |
| `002_equipment_catalog.sql` | equipment_catalog, system_settings 테이블 + 컬럼 추가 |

---

## 9. 인프라 / 배포

### 9-1. `docker-compose.prod.yml`

**역할**: 운영 환경 Docker Compose  
**서비스 구성**:

```yaml
services:
  frontend:  # Next.js
    image: waternix-frontend
    ports: ["127.0.0.1:3010:3000"]  # 로컬호스트만 바인딩 (보안)
  
  backend:   # FastAPI
    image: waternix-backend  
    ports: ["127.0.0.1:8010:8000"]
  
  postgres:  # PostgreSQL + TimescaleDB
    image: timescale/timescaledb:pg15
    ports: ["127.0.0.1:5433:5432"]
    healthcheck: ...
  
  redis:     # Redis
    ports: ["127.0.0.1:6382:6379"]
  
  mqtt:      # Eclipse Mosquitto
    ports: ["1883:1883"]
```

**포트를 127.0.0.1에만 바인딩**: 외부에서 직접 접근 불가, Nginx 프록시를 통해서만 접근

---

### 9-2. Nginx 설정 (`/www/server/panel/vhost/nginx/gwaternix.w-websoftsrv.kr.conf`)

```nginx
server {
    server_name gwaternix.w-websoftsrv.kr;
    
    # API 요청 → FastAPI 백엔드
    location /api/ {
        proxy_pass http://127.0.0.1:8010/api/;
    }
    
    # WebSocket → Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:8010/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
    }
    
    # 나머지 → Next.js
    location / {
        proxy_pass http://127.0.0.1:3010;
    }
}
```

---

### 9-3. `manage.sh` 관리 스크립트

```bash
/opt/waternix/manage.sh status   # 컨테이너 상태 확인
/opt/waternix/manage.sh update   # git pull → 재빌드 → 재시작
/opt/waternix/manage.sh restart  # 컨테이너 재시작
/opt/waternix/manage.sh logs     # 로그 확인
/opt/waternix/manage.sh nginx    # Nginx 재로드
```

---

## 10. API 전체 엔드포인트 목록

### 인증 (`/api/auth`)
```
POST   /api/auth/login              로그인, JWT 발급
GET    /api/auth/me                 현재 사용자 정보
POST   /api/auth/logout             로그아웃
POST   /api/auth/verify             토큰 검증
POST   /api/auth/change-password    비밀번호 변경
GET    /api/auth/users              사용자 목록 (관리자)
POST   /api/auth/users              사용자 추가 (슈퍼관리자)
PATCH  /api/auth/users/{id}         사용자 수정
DELETE /api/auth/users/{id}         사용자 비활성화
```

### 대시보드
```
GET    /api/dashboard/summary       KPI 집계 (장비수, 알림수, 정수량 등)
GET    /api/health                  시스템 상태 체크
```

### 업체 (`/api/companies`)
```
GET    /api/companies               업체 목록
GET    /api/companies/{id}          업체 상세
POST   /api/companies               업체 등록
PUT    /api/companies/{id}          업체 수정
DELETE /api/companies/{id}          업체 삭제
```

### 장비 (`/api/equipment`)
```
GET    /api/equipment               장비 목록 (페이징, 다중 필터)
GET    /api/equipment/map           지도 표시용 좌표+상태 데이터
GET    /api/equipment/{id}          장비 상세
POST   /api/equipment               장비 등록
PUT    /api/equipment/{id}          장비 수정
DELETE /api/equipment/{id}          장비 삭제
```

### 장비 카탈로그 (`/api/equipment-catalog`)
```
GET    /api/equipment-catalog            목록 (유형/시리즈/검색 필터)
GET    /api/equipment-catalog/series     시리즈 목록
GET    /api/equipment-catalog/{code}     모델 상세
POST   /api/equipment-catalog            제품 등록
PUT    /api/equipment-catalog/{id}       제품 수정
DELETE /api/equipment-catalog/{id}       제품 비활성화
POST   /api/equipment-catalog/seed       기본 데이터 시딩 (20개)
```

### 소모품 카탈로그 (`/api/catalog`)
```
GET    /api/catalog                 목록 (유형/분류/검색 필터)
POST   /api/catalog                 소모품 등록
PUT    /api/catalog/{id}            소모품 수정
DELETE /api/catalog/{id}            소모품 삭제
POST   /api/catalog/seed            기본 데이터 시딩 (89개)
```

### 필터/소모품 (`/api/filters`)
```
GET    /api/filters                 목록 (장비ID/업체ID/상태 필터)
POST   /api/filters                 등록
PUT    /api/filters/{id}            수정 (교체 완료 처리)
DELETE /api/filters/{id}            삭제
```

### 유지보수 (`/api/maintenance`)
```
GET    /api/maintenance             목록 (장비ID/업체ID/상태/기간 필터)
POST   /api/maintenance             등록
PUT    /api/maintenance/{id}        수정
DELETE /api/maintenance/{id}        삭제 (없으면 404)
```

### 알림 (`/api/alerts`)
```
GET    /api/alerts                  목록 (장비ID/심각도/미해결 필터)
POST   /api/alerts                  등록
PUT    /api/alerts/{id}             수정 (처리 단계 변경)
DELETE /api/alerts/{id}             삭제 (없으면 404)
```

### 재고 (`/api/consumables`)
```
GET    /api/consumables             목록
POST   /api/consumables             등록
PUT    /api/consumables/{id}        수정
DELETE /api/consumables/{id}        삭제
```

### 시스템 설정 (`/api/settings`)
```
GET    /api/settings                전체 설정 조회
GET    /api/settings/{category}     카테고리별 조회
PATCH  /api/settings                설정 일괄 저장 (인증 필요)
```

---

## 부록 — 코드 규칙 및 주요 패턴

### 백엔드 패턴

1. **asyncpg + raw SQL**: SQLAlchemy ORM 미사용, `asyncpg.Pool` 직접 사용
2. **헬퍼 함수 패턴**: 모든 API 파일에 `_row_to_xxx()` 변환 함수 정의
3. **파라미터화 쿼리**: `$1, $2...` 플레이스홀더로 SQL 인젝션 방지
4. **JSONB 처리**: `comm_config`, `specs`, `default_consumables`는 JSONB 타입 → 직렬화 필요

### 프론트엔드 패턴

1. **API 응답 타입**: snake_case (`*Payload` 인터페이스), 내부 타입: camelCase
2. **Dynamic Import**: Leaflet, React Flow는 `{ ssr: false }`로 클라이언트 전용 로드
3. **인증 토큰**: `localStorage` (클라이언트) + 쿠키 (미들웨어) 이중 저장
4. **에러 처리**: API 호출 시 `try/catch` + `setApiError()` 패턴

### 배포 패턴

1. **로컬 개발 → 빌드 확인** (`npm run build`) → **rsync 업로드** → **Docker 재빌드/재시작**
2. **DB 마이그레이션**: `cat migration.sql | docker exec -i waternix_postgres psql ...`
3. **초기 데이터**: 각 카탈로그 API의 `/seed` 엔드포인트 수동 호출
