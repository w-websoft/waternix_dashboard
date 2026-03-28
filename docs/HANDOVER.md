# 워터닉스(WATERNIX) IoT 장비 통합 관리 시스템
## 이관 문서 (Handover Document) v2.0

> **작성일**: 2026-03-28  
> **GitHub**: https://github.com/w-websoft/waternix_dashboard  
> **상태**: Phase 1 개발 완료 (프론트엔드 UI + 백엔드 스켈레톤 + 통신 서비스)

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택 요약](#2-기술-스택-요약)
3. [전체 디렉토리 구조](#3-전체-디렉토리-구조)
4. [파일별 상세 설명](#4-파일별-상세-설명)
   - 4.1 [프론트엔드 (Next.js)](#41-프론트엔드-nextjs)
   - 4.2 [백엔드 (FastAPI)](#42-백엔드-fastapi)
   - 4.3 [인프라 및 설정 파일](#43-인프라-및-설정-파일)
5. [데이터 모델 (타입 정의)](#5-데이터-모델-타입-정의)
6. [주요 화면 및 기능 흐름](#6-주요-화면-및-기능-흐름)
7. [통신 프로토콜 연동 현황](#7-통신-프로토콜-연동-현황)
8. [환경변수 설정 가이드](#8-환경변수-설정-가이드)
9. [실행 방법](#9-실행-방법)
10. [Phase 2 개발 예정 사항](#10-phase-2-개발-예정-사항)
11. [알려진 이슈 및 주의사항](#11-알려진-이슈-및-주의사항)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 클라이언트 | 워터닉스(주) |
| 소재 | 부산광역시 |
| 사업 영역 | 역삼투압(RO) 정수기, 초순수 제조기(DI), 해수담수화 시스템 제조·납품·설치 |
| 시스템 목적 | 전국에 분산된 수처리 장비 실시간 모니터링 + 온라인 유지보수 전산화 |
| 개발 범위 | 관리자 대시보드 (웹) + 백엔드 API + 산업용 통신 모듈 |

### 핵심 요구사항

- 지도 기반 전국 장비 현황 실시간 모니터링
- 업체(고객사)별 장비 등록 및 관리
- 필터·소모품 교체 주기 관리 및 자동 알림
- 유지보수 이력 온라인 전산화
- Modbus TCP/RTU, MQTT, RS232/RS485, OPC-UA, HTTP 연동
- 시설 배치도 편집 (React Flow 기반 드래그앤드롭 캔버스)

---

## 2. 기술 스택 요약

### 프론트엔드
| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| Next.js | 16.2.1 | React 프레임워크 (App Router) |
| TypeScript | ^5 | 타입 안정성 |
| Tailwind CSS | ^4 | 유틸리티 CSS |
| Recharts | ^3.8.1 | 센서 데이터 차트 |
| Leaflet / react-leaflet | ^1.9.4 / ^5 | 지도 시각화 |
| @xyflow/react | ^12.10.2 | 시설 배치도 노드 에디터 |
| qrcode.react | ^4.2.0 | 장비 QR 코드 생성 |
| socket.io-client | ^4.8.3 | 실시간 WebSocket |
| zustand | ^5.0.12 | 클라이언트 상태 관리 |
| lucide-react | ^1.7.0 | 아이콘 |
| date-fns | ^4.1.0 | 날짜 처리 |

### 백엔드
| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| FastAPI | 0.115.6 | REST API + WebSocket 서버 |
| SQLAlchemy | 2.0.36 | ORM (비동기) |
| Alembic | 1.14.0 | DB 마이그레이션 |
| Pydantic | 2.10.4 | 데이터 검증 |
| python-socketio | 5.11.4 | Socket.IO 서버 |
| Celery | 5.4.0 | 백그라운드 태스크 |
| **pymodbus** | **3.7.4** | **Modbus TCP/RTU (PLC 통신)** |
| **pyserial** | **3.5** | **RS232/RS485 시리얼 통신** |
| **paho-mqtt** | **2.1.0** | **MQTT 브로커 연동** |
| **asyncua** | **1.1.5** | **OPC-UA 프로토콜** |

### 인프라
| 서비스 | 이미지 | 역할 |
|--------|--------|------|
| PostgreSQL + TimescaleDB | timescale/timescaledb:latest-pg15 | 시계열 센서 데이터 저장 |
| Redis | redis:7-alpine | 캐시 + Celery 브로커 |
| Eclipse Mosquitto | eclipse-mosquitto:2 | MQTT 브로커 |
| Nginx | nginx:alpine | 리버스 프록시 + SSL |

---

## 3. 전체 디렉토리 구조

```
water_dashboard/                    ← 프로젝트 루트
├── docs/
│   ├── SYSTEM_DESIGN.md            ← 시스템 설계 문서
│   └── HANDOVER.md                 ← 이관 문서 (현재 파일)
├── frontend/                       ← Next.js 프론트엔드
│   ├── src/
│   │   ├── app/                    ← Next.js App Router (페이지)
│   │   │   ├── layout.tsx          ← 루트 레이아웃
│   │   │   ├── page.tsx            ← 메인 대시보드
│   │   │   ├── globals.css         ← 전역 스타일
│   │   │   ├── equipment/
│   │   │   │   ├── page.tsx        ← 장비 목록
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    ← 장비 상세
│   │   │   │       └── layout-editor/
│   │   │   │           └── page.tsx ← 시설 배치도 에디터
│   │   │   ├── companies/page.tsx  ← 업체 관리
│   │   │   ├── maintenance/page.tsx ← 유지보수
│   │   │   ├── consumables/page.tsx ← 소모품 관리
│   │   │   ├── alerts/page.tsx     ← 알림 관리
│   │   │   ├── reports/page.tsx    ← 보고서
│   │   │   └── settings/page.tsx   ← 설정
│   │   ├── components/             ← 재사용 컴포넌트
│   │   │   ├── layout/             ← 레이아웃 컴포넌트
│   │   │   ├── dashboard/          ← 대시보드 위젯
│   │   │   ├── map/                ← 지도 컴포넌트
│   │   │   ├── equipment/          ← 장비 관련 모달
│   │   │   └── layout-editor/      ← 배치도 노드 컴포넌트
│   │   ├── lib/
│   │   │   ├── mock-data.ts        ← 목업 데이터
│   │   │   └── utils.ts            ← 유틸리티 함수
│   │   └── types/
│   │       └── index.ts            ← TypeScript 타입 정의
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── backend/                        ← FastAPI 백엔드
│   ├── app/
│   │   ├── main.py                 ← 앱 진입점
│   │   ├── core/config.py          ← 환경변수 설정
│   │   ├── models/schemas.py       ← Pydantic 스키마
│   │   ├── api/
│   │   │   ├── equipment.py        ← 장비 API 라우터
│   │   │   └── companies.py        ← 업체 API 라우터
│   │   └── services/communication/
│   │       ├── modbus_service.py   ← Modbus TCP/RTU
│   │       ├── mqtt_service.py     ← MQTT 클라이언트
│   │       └── serial_service.py   ← RS232/RS485
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── mosquitto/config/
│   └── mosquitto.conf              ← MQTT 브로커 설정
├── docker-compose.yml              ← 전체 서비스 오케스트레이션
├── setup.sh                        ← 원클릭 설치 스크립트
├── .gitignore
├── README.md
└── AGENTS.md                       ← AI 에이전트 메모리
```

---

## 4. 파일별 상세 설명

---

### 4.1 프론트엔드 (Next.js)

---

#### `frontend/src/types/index.ts`
> **역할**: 프론트엔드 전체에서 사용하는 TypeScript 타입·인터페이스 중앙 정의 파일

| 타입명 | 설명 |
|--------|------|
| `EquipmentType` | 장비 유형: `ro` \| `di` \| `seawater` \| `prefilter` \| `uv` \| `softener` \| `booster` |
| `EquipmentStatus` | 장비 상태: `normal` \| `warning` \| `error` \| `offline` \| `maintenance` |
| `FilterStatus` | 필터 상태: `normal` \| `warning` \| `replace` \| `replaced` |
| `AlertSeverity` | 알림 심각도: `critical` \| `warning` \| `info` |
| `CommType` | 통신 방식: `modbus_tcp` \| `modbus_rtu` \| `mqtt` \| `serial` \| `opcua` \| `http` |
| `Company` | 업체(고객사) 인터페이스 |
| `Equipment` | 장비 인터페이스 (위치, 통신설정, 센서데이터 포함) |
| `SensorData` | 실시간 센서 데이터 (유량, TDS, 압력, 온도, 전력, 가동시간 등) |
| `Filter` | 필터·소모품 인터페이스 (교체 주기, 사용량, 상태) |
| `MaintenanceRecord` | 유지보수 이력 인터페이스 |
| `Alert` | 알림 인터페이스 (심각도, 확인 여부) |
| `Consumable` | 재고 소모품 인터페이스 |
| `DashboardSummary` | 대시보드 요약 통계 인터페이스 |

**주의사항**: 백엔드 `schemas.py`와 필드명을 맞춰야 API 연동 시 오류가 없음

---

#### `frontend/src/lib/mock-data.ts`
> **역할**: 백엔드 API 연동 전 UI 개발을 위한 목업 데이터 제공

포함 데이터:
- `mockCompanies` — 8개 업체 (삼성바이오, 한국수자원공사, LG화학, 포스코 등 실제 참고 데이터)
- `mockEquipment` — 14대 장비 (서울/인천/대구/부산/전남/전북/강원 지역 분산)
- `mockFilters` — 필터·소모품 교체 데이터
- `mockMaintenanceRecords` — 유지보수 이력
- `mockAlerts` — 알림 데이터
- `mockConsumables` — 창고 재고 소모품
- `mockDashboardSummary` — KPI 요약 수치

**Phase 2 작업**: 이 파일의 데이터를 실제 API 호출로 교체해야 함  
→ `@tanstack/react-query` 훅 사용 권장

---

#### `frontend/src/lib/utils.ts`
> **역할**: 공통 유틸리티 함수 및 UI 설정값 모음

주요 내용:
- `cn(...)` — `clsx` + `tailwind-merge` 조합으로 클래스명 병합
- `formatDate(dateStr)` — ISO 날짜 → `YYYY.MM.DD` 형식
- `formatRelativeTime(dateStr)` — 상대 시간 표시 (`3분 전`, `1시간 전`)
- `STATUS_CONFIG` — 장비 상태별 라벨, 색상, dot CSS 클래스 맵
- `EQUIPMENT_TYPE_CONFIG` — 장비 유형별 라벨, 색상, 이모지 아이콘 맵
- `FILTER_STATUS_CONFIG` — 필터 상태별 라벨, 색상 맵

---

#### `frontend/src/app/layout.tsx`
> **역할**: Next.js App Router 루트 레이아웃

- `<html lang="ko">` 설정
- 전역 메타데이터 (title, description) 정의
- `globals.css` 임포트

---

#### `frontend/src/app/globals.css`
> **역할**: 전역 CSS 스타일

주요 내용:
- Tailwind CSS v4 임포트 (`@import "tailwindcss"`)
- CSS 변수 정의 (`--background`, `--foreground`)
- Leaflet 지도 컨테이너 z-index 오버라이드 (모달과 충돌 방지)
- 커스텀 스크롤바 스타일 (다크 계열)
- `@keyframes pulse-ring` — critical 알림 배지 애니메이션

---

#### `frontend/src/components/layout/Sidebar.tsx`
> **역할**: 좌측 네비게이션 사이드바

메뉴 구성:
| 메뉴 | 경로 | 배지 |
|------|------|------|
| 대시보드 | `/` | — |
| 장비 관리 | `/equipment` | — |
| 업체 관리 | `/companies` | — |
| 유지보수 | `/maintenance` | 진행중 건수 |
| 소모품 관리 | `/consumables` | 교체필요 건수 |
| 보고서 | `/reports` | — |
| 알림 | `/alerts` | 미처리 건수 (빨간 배지) |
| 설정 | `/settings` | — |

---

#### `frontend/src/components/layout/Header.tsx`
> **역할**: 상단 헤더 (제목, 현재 시각, 검색, 새로고침, 알림 벨)

- 현재 시각 1초마다 업데이트 (`useEffect` + `setInterval`)
- 알림 배지: 미처리 알림 수 표시
- 검색창: 기능 UI만 구현 (실제 검색 로직은 각 페이지에서 처리)

---

#### `frontend/src/components/layout/DashboardLayout.tsx`
> **역할**: 전체 페이지 공통 레이아웃 래퍼

- `Sidebar` + `Header` + `children` 조합
- `title`, `subtitle` props로 헤더 텍스트 제어
- 모바일 사이드바 토글 (`isMobileOpen` state)

---

#### `frontend/src/app/page.tsx` ← 메인 대시보드
> **역할**: 시스템 홈 화면 — 전체 현황 실시간 모니터링

주요 구성 요소:
| 섹션 | 컴포넌트 / 설명 |
|------|----------------|
| 실시간 상태 바 | 실시간 연결 표시, 장비 등록 버튼, 미처리 알림 수 |
| KPI 카드 (8개) | 전체 장비수, 정상, 이상/오프, 정수량(실시간), 경고, 유지보수, 소모품, 알림 |
| 전국 장비 지도 | Leaflet 지도 (동적 임포트, SSR 비활성화) |
| 장비 상태 도넛 차트 | Recharts PieChart |
| 알림 목록 | 최근 알림 5건 |
| 장비 현황 테이블 | 상태, 유량, TDS, 마지막 수신, 배치도 링크 |
| 예정 유지보수 | 다음 5건 |
| 월별 정수량 추이 | AreaChart |

**실시간 기능**: `useEffect` + `setInterval` 4초 간격으로 오늘 정수량 자동 증가 시뮬레이션  
**장비 등록**: `AddEquipmentModal` 연동 완료

---

#### `frontend/src/app/equipment/page.tsx` ← 장비 목록
> **역할**: 전체 장비 목록 조회, 필터링, 지도 뷰 전환

기능:
- **목록/지도 뷰 토글** — 테이블 또는 Leaflet 지도
- **상태 필터** — 정상/경고/오류/오프라인/유지보수 버튼 (각 건수 표시)
- **유형 필터** — select 드롭다운
- **텍스트 검색** — 장비명, 모델, 시리얼번호, 업체명, 지역 동시 검색
- **CSV 내보내기** — 현재 필터 결과를 BOM 포함 UTF-8 CSV로 다운로드 (Excel 한글 호환)
- **신규 장비 등록** — `AddEquipmentModal` 팝업 연동
- 테이블 각 행: 장비 상세 링크 + 배치도 편집 링크

**컬럼**: 장비명/모델, 업체, 지역, 유형, 통신, 상태, 유량, TDS, 오늘 생산량, 마지막 수신, 배치도

---

#### `frontend/src/app/equipment/[id]/page.tsx` ← 장비 상세
> **역할**: 개별 장비의 상세 정보 — 실시간 센서, 필터, 유지보수, 알림, 사양

**동적 라우트**: `params.id`로 `mockEquipment` 배열에서 해당 장비 조회 (없으면 `notFound()`)

탭 구조:
| 탭 | 내용 |
|-----|------|
| 실시간 현황 | 24h 유량/TDS/압력/전력 Recharts 차트 4개 |
| 소모품·필터 | 단계별 필터 카드, 사용량 프로그레스바, 소모품 등록 버튼 |
| 유지보수 | 이력 타임라인, 작업 등록 버튼 |
| 알림 | 이 장비 관련 미처리 알림 목록 |
| 장비 사양 | 기본정보, 설치위치, 통신설정, 계약/보증 상세 |

**실시간 시뮬레이션**:
- `isLive` 상태 토글 (실시간 ON/OFF)
- 3초 간격 jitter: 유량 ±0.2, TDS ±0.5, 압력 ±0.1, 온도 ±0.15, 전력 ±0.025

**QR 코드**:
- `qrcode.react`의 `QRCodeSVG` 컴포넌트 사용
- 장비 URL 인코딩 → 현장 스캔 시 바로 이 페이지로 이동
- 브라우저 `window.print()` 인쇄 기능

**미처리 알림 배지**: 헤더에 알림 건수 빨간 배지로 표시

---

#### `frontend/src/app/equipment/[id]/layout-editor/page.tsx` ← 시설 배치도 에디터
> **역할**: 장비가 설치된 시설의 배치도를 드래그앤드롭으로 편집하는 인터랙티브 캔버스

**사용 라이브러리**: `@xyflow/react` (React Flow v12)

핵심 기능:
| 기능 | 설명 |
|------|------|
| 노드 드래그 | 장비/이미지/텍스트 노드 자유 배치 |
| 엣지 연결 | 노드 간 라인 연결 (파이프 타입별 색상 구분) |
| 파이프 타입 | 수관(청색), 배수관(회색), 통신선(청록), 전력선(황색), 약품라인(보라) |
| 이미지 업로드 | PNG/JPG/SVG 파일 → 캔버스 노드로 배치 |
| 텍스트 라벨 | 구역명, 공정 표시 텍스트 노드 |
| 저장/불러오기 | `localStorage`에 JSON 직렬화 저장 |
| 내보내기 | `JSON.stringify`로 파일 다운로드 |
| 미니맵 | 전체 배치 조감도 패널 |
| 도움말 패널 | 단축키 안내 |

**커스텀 노드 타입** (별도 컴포넌트):
- `equipment` → `EquipmentNode.tsx`
- `image` → `CustomImageNode.tsx`
- `label` → `TextLabelNode.tsx`

**레이아웃**: `ReactFlowProvider` 래퍼 → `LayoutEditorInner` 실제 에디터

**주의**: `Date.now()`, `Math.random()` 호출은 `react-hooks/purity` ESLint 규칙 때문에 컴포넌트 외부 순수 함수(`generateNodeId`, `randomPosition`)로 분리

---

#### `frontend/src/components/layout-editor/EquipmentNode.tsx`
> **역할**: 배치도 캔버스 내 장비를 표현하는 React Flow 커스텀 노드

시각 요소:
- 장비 유형별 이모지/아이콘
- 상태 기반 글로우 효과 (정상=청록, 경고=황색, 오류=적색+pulse 애니메이션)
- 상태 도트 (우상단)
- 실시간 센서값 표시: 유량(L/min), TDS(ppm)
- 통신 방식 배지 (MQTT, Modbus 등)
- `selected` 상태 시 테두리 강조

**핸들**: 4방향 (top, bottom, left, right) — 파이프/통신선 연결점

---

#### `frontend/src/components/layout-editor/CustomImageNode.tsx`
> **역할**: 사용자가 업로드한 이미지를 캔버스에 표시하는 React Flow 커스텀 노드

- `data.imageUrl` (File API `createObjectURL`) 렌더링
- `data.width`, `data.height` 커스텀 사이즈 지원
- `data.label` 하단 오버레이 라벨
- `selected` 상태 시 테두리 강조

---

#### `frontend/src/components/layout-editor/TextLabelNode.tsx`
> **역할**: 배치도에 텍스트 라벨(구역명, 공정명 등)을 표시하는 React Flow 커스텀 노드

- `data.label` 텍스트 렌더링
- `data.fontSize`, `data.color`, `data.background` 스타일 설정 지원
- 핸들 없음 (연결 불필요한 라벨 전용)

---

#### `frontend/src/components/equipment/AddEquipmentModal.tsx`
> **역할**: Waternix 자사 장비를 시스템에 신규 등록하는 5단계 위저드 모달

**단계별 구성**:

| 단계 | 내용 |
|------|------|
| 1. 장비 유형 | 7가지 Waternix 제품군 카드 선택 |
| 2. 모델 선택 | 유형별 Waternix 제품 모델 목록 (30개), 처리 용량 표시, 장비 별칭 입력 |
| 3. 업체 연결 | 등록된 업체 목록에서 설치 업체 선택 |
| 4. 설치 위치 | 시/도, 구/군, 상세 주소, 위도/경도, 설치일, 보증 만료일 |
| 5. 통신 설정 | 통신 방식 선택 → 방식별 세부 설정 (IP, 포트, 슬레이브ID, 보레이트, MQTT 토픽) |
| 확인 | 입력 정보 최종 확인 → 등록 완료 애니메이션 |

**내장 제품 카탈로그** (`WATERNIX_MODELS`):
- RO: WRO-T10/T30/T100/T500/T1000/T5000
- DI: WDI-T30/T100/T500/T1000/T2000
- 해수: WSRO-T500/T2000/T10000
- 전처리: WPF-SD/AC/MM
- UV: WUV-T10/T30/T100
- 연수기: WSF-T100/T500/T2000
- 부스터: WBP-T30/T100/T500

**시리얼 번호 자동 생성**: `generateSerialNo(type)` → `WRO-2026-XXX` 형식

**주의**: 현재 등록 시 `mockEquipment` 배열에 실제 반영되지 않음 (Phase 2: API 연동 필요)

---

#### `frontend/src/components/equipment/AddConsumableModal.tsx`
> **역할**: 특정 장비에 필터·소모품을 등록하는 모달

**소모품 유형 6가지**:
| 유형 | 파트 접두사 | 기본 수명 |
|------|------------|---------|
| 세디먼트 필터 | WN-SF | 4,380h |
| 활성탄 블록 필터 | WN-AC | 4,380h |
| RO 멤브레인 | WN-RM | 26,280h |
| UV 램프 | WN-UV | 8,760h |
| 이온교환수지 | WN-IX | 17,520h |
| 스케일 억제제 | WN-AS | 유량 기준 |

**자동 계산**: 설치일 + 수명 → 교체 예정일 자동 계산  
**교체 경고**: `AlertTriangle` 아이콘 + 안내 문구 표시  
**공급업체**: 워터닉스(자사), Toray, Filmtec/DuPont, Hydranautics, Purolite 등 9개

---

#### `frontend/src/components/map/EquipmentMap.tsx`
> **역할**: 전국 장비 위치를 Leaflet 지도에 표시하는 컴포넌트

**중요**: `dynamic(() => import(...), { ssr: false })` 로 임포트해야 함  
→ Leaflet은 브라우저 전용 API를 사용하므로 SSR에서 오류 발생

기능:
- 장비 상태별 커스텀 마커 색상 (정상=녹, 경고=황, 오류=적, 오프=회, 유지보수=청)
- 마커 클릭 시 팝업 (장비명, 모델, 상태, 유량, TDS)
- `onSelect` 콜백으로 상위 컴포넌트에 선택된 장비 전달
- 지도 타일: OpenStreetMap

---

#### `frontend/src/components/dashboard/KpiCard.tsx`
> **역할**: 대시보드 KPI 수치 카드 컴포넌트

Props:
- `title` — 카드 제목
- `value` — 주요 수치
- `unit` — 단위 (대, L, 건 등)
- `icon` — lucide-react 아이콘 컴포넌트
- `iconColor`, `iconBg` — 아이콘 색상 테마
- `trend` — 증감 추세 표시 (optional)
- `urgent` — 긴급 강조 스타일 (optional)
- `subtitle` — 부가 설명 텍스트 (optional)

---

#### `frontend/src/components/dashboard/AlertList.tsx`
> **역할**: 대시보드 알림 목록 위젯

- 심각도별 아이콘/색상 (critical=적, warning=황, info=청)
- 알림 제목, 장비명, 업체명, 상대 시간 표시
- 빈 목록 시 정상 아이콘 + 안내 메시지

---

#### `frontend/src/components/dashboard/StatusDonut.tsx`
> **역할**: 장비 상태 분포를 보여주는 도넛 차트

- Recharts `PieChart` + `Cell` 활용
- 상태별 색상: 정상(emerald), 경고(amber), 오류(red), 오프라인(slate), 유지보수(blue)
- 중앙에 총 장비 수 표시
- 하단 범례

---

#### `frontend/src/components/dashboard/VolumeChart.tsx`
> **역할**: 최근 14일 일별 정수량 AreaChart

- Recharts `AreaChart` + 그라디언트 fill
- 목업 데이터 (실제 연동 시 API 교체 필요)

---

#### 페이지별 간략 설명

| 파일 | 설명 |
|------|------|
| `app/companies/page.tsx` | 업체(고객사) 목록. 카드 뷰, 시/도 필터, 검색, 계약 상태 표시 |
| `app/maintenance/page.tsx` | 유지보수 이력 목록. 상태/유형 필터, 담당자·비용·날짜 표시 |
| `app/consumables/page.tsx` | 소모품 재고 관리. 필터현황/재고현황 탭, 저재고 경고 |
| `app/alerts/page.tsx` | 알림 목록. 심각도 필터, 확인 처리, 해결 여부 표시 |
| `app/reports/page.tsx` | 월별 정수량·유지보수 차트, 장비 유형 분포, 효율 추이 |
| `app/settings/page.tsx` | 일반 설정, 알림 임계값, 통신 기본값, 사용자 관리(플레이스홀더) |

---

### 4.2 백엔드 (FastAPI)

---

#### `backend/app/main.py`
> **역할**: FastAPI 애플리케이션 진입점

주요 구성:
- `lifespan` 컨텍스트 매니저: 앱 시작 시 MQTT 서비스 연결, 종료 시 해제
- CORS 미들웨어: 프론트엔드 오리진 허용
- API 라우터 마운트: `/api/equipment`, `/api/companies`
- Socket.IO ASGI 마운트: 실시간 WebSocket
- `/health` 엔드포인트: 헬스체크
- `/api/dashboard/summary` 엔드포인트: 대시보드 요약 (현재 목업 데이터 반환)
- Socket.IO 이벤트: `connect`, `disconnect`, `subscribe_equipment`

---

#### `backend/app/core/config.py`
> **역할**: 환경변수 기반 앱 설정 (Pydantic Settings)

| 설정 그룹 | 항목 |
|-----------|------|
| 앱 기본 | `APP_NAME`, `DEBUG`, `SECRET_KEY` |
| 데이터베이스 | `DATABASE_URL` (PostgreSQL+asyncpg) |
| Redis | `REDIS_URL` |
| MQTT | `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASS`, `MQTT_TLS` |
| Modbus 기본값 | `MODBUS_DEFAULT_PORT`, `MODBUS_TIMEOUT`, `MODBUS_RETRIES` |
| 시리얼 기본값 | `SERIAL_DEFAULT_BAUDRATE`, `SERIAL_DEFAULT_PARITY` |
| 알림 임계값 | `ALERT_TDS_THRESHOLD`, `ALERT_PRESSURE_MIN/MAX`, `ALERT_FLOW_MIN` |
| CORS | `CORS_ORIGINS` |

`.env` 파일에서 오버라이드 가능

---

#### `backend/app/models/schemas.py`
> **역할**: FastAPI 요청/응답 데이터 검증을 위한 Pydantic v2 스키마 정의

주요 스키마 클래스:

| 클래스 | 용도 |
|--------|------|
| `CompanyBase`, `CompanyCreate`, `CompanyResponse` | 업체 CRUD |
| `EquipmentBase`, `EquipmentCreate`, `EquipmentResponse` | 장비 CRUD |
| `SensorDataCreate`, `SensorDataResponse` | 센서 데이터 수집/조회 |
| `FilterBase`, `FilterCreate`, `FilterResponse` | 필터 관리 |
| `MaintenanceCreate`, `MaintenanceResponse` | 유지보수 |
| `AlertCreate`, `AlertResponse` | 알림 |
| `DashboardSummaryResponse` | 대시보드 요약 |
| `TelemetryMessage` | MQTT/WebSocket 텔레메트리 메시지 구조 |
| `ModbusCommandRequest`, `MqttCommandRequest` | 장비 원격 명령 |
| `LoginRequest`, `TokenResponse` | JWT 인증 |
| `UserResponse` | 사용자 정보 |

---

#### `backend/app/api/equipment.py`
> **역할**: 장비 관련 REST API 라우터 (`/api/equipment`)

| 엔드포인트 | 메서드 | 상태 | 설명 |
|-----------|--------|------|------|
| `/api/equipment` | GET | 목업 | 장비 목록 (상태/유형 필터) |
| `/api/equipment` | POST | 미구현(501) | 장비 등록 |
| `/api/equipment/map-data` | GET | 목업 | 지도용 경량 데이터 |
| `/api/equipment/{id}` | GET | 미구현(501) | 장비 상세 |
| `/api/equipment/{id}` | PUT | 미구현(501) | 장비 수정 |
| `/api/equipment/{id}` | DELETE | 미구현(501) | 장비 삭제 |
| `/api/equipment/{id}/sensors` | GET | 미구현(501) | 센서 이력 |
| `/api/equipment/{id}/alerts` | GET | 미구현(501) | 장비 알림 목록 |
| `/api/equipment/{id}/command` | POST | 미구현(501) | 원격 명령 발송 |

---

#### `backend/app/api/companies.py`
> **역할**: 업체 관련 REST API 라우터 (`/api/companies`)

| 엔드포인트 | 메서드 | 상태 | 설명 |
|-----------|--------|------|------|
| `/api/companies` | GET | 빈 배열 | 업체 목록 |
| `/api/companies` | POST | 미구현(501) | 업체 등록 |
| `/api/companies/{id}` | GET | 미구현(501) | 업체 상세 |
| `/api/companies/{id}` | PUT | 미구현(501) | 업체 수정 |
| `/api/companies/{id}/equipment` | GET | 빈 배열 | 업체별 장비 목록 |

---

#### `backend/app/services/communication/modbus_service.py`
> **역할**: Modbus TCP/RTU 통신 서비스 (PLC, 인버터, 계측기 연동)

**클래스**: `ModbusService`

| 메서드 | 설명 |
|--------|------|
| `connect()` | Modbus TCP 또는 RTU 연결 (async) |
| `disconnect()` | 연결 해제 |
| `read_sensor_data(register_map)` | 레지스터 맵 기반 일괄 센서 읽기 |
| `read_coil(address, count)` | 코일 읽기 |
| `write_coil(address, value)` | 코일 쓰기 (장비 ON/OFF 제어) |
| `write_register(address, value)` | 레지스터 쓰기 (설정값 변경) |

**Waternix 표준 레지스터 맵** (`WATERNIX_REGISTER_MAP`):
| 레지스터 | 주소 | 단위 | 비율 |
|---------|------|------|------|
| `flow_rate` | 0x0001 | L/min | ÷10 |
| `daily_volume` | 0x0002 | L | ÷1 |
| `inlet_pressure` | 0x0003 | bar | ÷10 |
| `outlet_pressure` | 0x0004 | bar | ÷10 |
| `inlet_tds` | 0x0010 | ppm | ÷1 |
| `outlet_tds` | 0x0011 | ppm | ÷1 |
| `temperature` | 0x0020 | °C | ÷10 |
| `power_kw` | 0x0030 | kW | ÷100 |
| `running_hours` | 0x0040 | h | ÷1 |
| `error_code` | 0x0050 | — | — |

---

#### `backend/app/services/communication/mqtt_service.py`
> **역할**: MQTT 클라이언트 서비스 (IoT 게이트웨이, 스마트 장비 연동)

**클래스**: `MqttService`

| 메서드 | 설명 |
|--------|------|
| `start()` | MQTT 브로커 연결 및 백그라운드 루프 시작 |
| `stop()` | 연결 종료 |
| `publish(topic, payload)` | 토픽에 메시지 발행 (장비 명령) |
| `on_telemetry(handler)` | 텔레메트리 데이터 수신 핸들러 등록 |
| `on_status(handler)` | 장비 상태 변경 핸들러 등록 |
| `on_alert(handler)` | 알림 메시지 핸들러 등록 |

**MQTT 토픽 구조**:
```
waternix/devices/{serial}/telemetry   ← 센서 데이터 수신
waternix/devices/{serial}/status      ← 장비 상태 수신
waternix/devices/{serial}/alerts      ← 알림 수신
waternix/devices/{serial}/heartbeat   ← 하트비트
waternix/devices/{serial}/commands    ← 명령 발송 (발행)
waternix/system/broadcast             ← 전체 방송
```

---

#### `backend/app/services/communication/serial_service.py`
> **역할**: RS232/RS485 시리얼 통신 서비스 (레거시 장비, 계측기 연동)

**클래스**: `SerialService`

| 메서드 | 설명 |
|--------|------|
| `open()` | 시리얼 포트 열기 |
| `close()` | 포트 닫기 |
| `send_receive(data, expected_len, timeout)` | 송신 후 응답 수신 |
| `build_modbus_rtu_packet(slave_id, func_code, start_addr, count)` | Modbus RTU 패킷 생성 |
| `parse_modbus_rtu_response(response)` | RTU 응답 파싱 |
| `calculate_crc16(data)` | CRC-16/IBM 체크섬 계산 |
| `read_registers_rtu(slave_id, start_addr, count)` | RTU 레지스터 읽기 |

---

#### `backend/app/services/communication/__init__.py`
> **역할**: communication 패키지 초기화, 클래스 노출

```python
from .modbus_service import ModbusService
from .mqtt_service import MqttService
from .serial_service import SerialService
```

---

### 4.3 인프라 및 설정 파일

---

#### `docker-compose.yml`
> **역할**: 전체 시스템 Docker Compose 오케스트레이션

| 서비스 | 포트 | 설명 |
|--------|------|------|
| `postgres` | 5432 | TimescaleDB (PostgreSQL 15) |
| `redis` | 6379 | 캐시 + Celery 브로커 (비밀번호 설정) |
| `mosquitto` | 1883, 8883, 9001 | MQTT 브로커 (MQTT, TLS, WebSocket) |
| `backend` | 8000 | FastAPI + Socket.IO |
| `celery_worker` | — | Celery 백그라운드 워커 |
| `frontend` | 3000 | Next.js |
| `nginx` | 80, 443 | 리버스 프록시 + SSL |

볼륨: `postgres_data`, `redis_data` (데이터 영속성)

---

#### `backend/Dockerfile`
> **역할**: FastAPI 백엔드 Docker 이미지 빌드

- 베이스: `python:3.11-slim`
- 의존성 캐시 레이어 분리 (`requirements.txt` 먼저 COPY)
- 포트 8000 노출
- 실행 명령: `uvicorn app.main:socket_app --host 0.0.0.0 --port 8000`

---

#### `frontend/Dockerfile`
> **역할**: Next.js 프론트엔드 Docker 이미지 빌드 (멀티스테이지)

- `builder` 스테이지: `node:20-alpine` + `npm ci` + `next build`
- `runner` 스테이지: `node:20-alpine` + standalone 빌드 결과만 복사
- `next.config.ts`에 `output: "standalone"` 설정 필요

---

#### `mosquitto/config/mosquitto.conf`
> **역할**: Eclipse Mosquitto MQTT 브로커 설정

```conf
listener 1883         # MQTT
listener 9001         # WebSocket
protocol websockets
allow_anonymous true  # 개발용 (운영 시 false + 인증 설정)
persistence true
```

운영 환경: `allow_anonymous false` + `password_file` + TLS 인증서 설정 필요

---

#### `setup.sh`
> **역할**: 원클릭 개발/Docker 환경 구축 스크립트

사용법:
```bash
chmod +x setup.sh
./setup.sh dev    # 로컬 개발 환경 (Node.js + Python 가상환경)
./setup.sh docker # Docker Compose 전체 구동
```

수행 작업:
1. Node.js (v20+) / Python (3.11+) 설치 여부 확인
2. `.env` 파일 자동 생성 (기본값)
3. `npm install` / `pip install -r requirements.txt`
4. Docker 모드: `docker compose up -d --build`

---

#### `backend/.env.example` / `frontend/.env.example`
> **역할**: 환경변수 템플릿 파일

실제 운영 시 복사 후 값 수정:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

---

#### `.cursor/rules/waternix.mdc`
> **역할**: Cursor AI 에이전트용 프로젝트 컨텍스트 규칙

AI 코딩 시 참고하는 프로젝트 규칙, 코딩 컨벤션, 프레임워크 특수 사항 정의

---

#### `AGENTS.md`
> **역할**: AI 에이전트 메모리 파일 (개발 히스토리, 설계 결정 기록)

---

#### `docs/SYSTEM_DESIGN.md`
> **역할**: 시스템 아키텍처 및 설계 문서

포함 내용: 프로젝트 배경, 아키텍처 다이어그램, DB 스키마 SQL, API 설계, Modbus 레지스터 맵, MQTT 토픽 구조

---

## 5. 데이터 모델 (타입 정의)

### 핵심 엔티티 관계

```
Company (업체)
  └── Equipment[] (장비, 1:N)
        ├── SensorData[] (센서 이력, 시계열)
        ├── Filter[] (필터·소모품, N개)
        ├── MaintenanceRecord[] (유지보수 이력)
        └── Alert[] (알림)

Consumable (소모품 재고, 독립 테이블)
```

### Equipment 필드 요약

```typescript
{
  id: string                    // UUID
  companyId: string             // 업체 FK
  serialNo: string              // 예: WRO-2026-001
  model: string                 // 예: WRO-T100
  equipmentType: EquipmentType  // ro | di | seawater | ...
  name?: string                 // 별칭 (예: 강남 #1)
  lat: number                   // 위도
  lng: number                   // 경도
  status: EquipmentStatus       // normal | warning | error | offline | maintenance
  capacityLph?: number          // 시간당 처리 용량 (L/h)
  commType?: CommType           // modbus_tcp | mqtt | serial | ...
  commConfig?: Record<...>      // 통신 설정 JSON (IP, 포트, 슬레이브ID 등)
  sensorData?: SensorData       // 최신 센서값 (JOIN)
}
```

---

## 6. 주요 화면 및 기능 흐름

### 신규 장비 등록 흐름

```
[대시보드 or 장비 목록] → [장비 등록 버튼 클릭]
→ AddEquipmentModal 오픈
  → Step 1: 장비 유형 선택 (7종)
  → Step 2: Waternix 모델 선택 + 별칭 입력 → 시리얼번호 자동 생성
  → Step 3: 설치 업체 선택
  → Step 4: 설치 위치 입력 (주소, GPS)
  → Step 5: 통신 방식 + 세부 설정
  → 확인 → 등록 완료 (현재: 로컬 state, Phase 2: POST /api/equipment)
```

### 소모품 등록 흐름

```
[장비 상세] → [소모품·필터 탭] → [소모품 등록 버튼]
→ AddConsumableModal 오픈
  → 소모품 유형 선택 → 상세 정보 입력
  → 설치일 입력 → 교체예정일 자동 계산
  → 등록 (현재: 로컬 state, Phase 2: POST /api/filters)
```

### 배치도 편집 흐름

```
[장비 상세] → [시설 배치도 편집 버튼]
→ /equipment/{id}/layout-editor 페이지
  → localStorage에서 저장된 레이아웃 로드
  → 좌측 패널에서 노드 추가 (장비/이미지/텍스트)
  → 노드 드래그앤드롭 배치
  → 노드 간 파이프/통신선 연결
  → 저장 버튼 → localStorage 저장
  → 내보내기 → JSON 파일 다운로드
```

---

## 7. 통신 프로토콜 연동 현황

| 프로토콜 | 라이브러리 | 서비스 파일 | 상태 |
|---------|-----------|------------|------|
| Modbus TCP | pymodbus 3.7.4 | `modbus_service.py` | 구현 완료 (미테스트) |
| Modbus RTU | pymodbus 3.7.4 | `modbus_service.py` | 구현 완료 (미테스트) |
| RS232/RS485 | pyserial 3.5 | `serial_service.py` | 구현 완료 (미테스트) |
| MQTT | paho-mqtt 2.1.0 | `mqtt_service.py` | 구현 완료 (미테스트) |
| OPC-UA | asyncua 1.1.5 | 미구현 | Phase 2 예정 |
| HTTP REST | aiohttp | 미구현 | Phase 2 예정 |

**실제 PLC 연동 시 확인 사항**:
1. Modbus 레지스터 주소가 장비 매뉴얼과 일치하는지 검증 필요
2. 실제 장비의 레지스터 맵을 `WATERNIX_REGISTER_MAP` 딕셔너리에 추가
3. MQTT 게이트웨이가 있는 경우 토픽 구조 협의 필요

---

## 8. 환경변수 설정 가이드

### 백엔드 (`backend/.env`)

```env
# 필수 변경 항목
SECRET_KEY=반드시_길고_랜덤한_값으로_변경
DATABASE_URL=postgresql+asyncpg://waternix:PASSWORD@localhost:5432/waternix_db
REDIS_URL=redis://:PASSWORD@localhost:6379/0

# MQTT 설정
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_USER=                  # 인증 사용 시
MQTT_PASS=

# 알림 임계값 (기본값 사용 가능)
ALERT_TDS_THRESHOLD=20      # ppm
ALERT_PRESSURE_MIN=2.0      # bar
ALERT_PRESSURE_MAX=8.0      # bar
ALERT_FLOW_MIN=0.5          # L/min
```

### 프론트엔드 (`frontend/.env`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

---

## 9. 실행 방법

### 로컬 개발 환경

```bash
# 1. 저장소 클론
git clone https://github.com/w-websoft/waternix_dashboard.git
cd waternix_dashboard

# 2. 원클릭 셋업
chmod +x setup.sh && ./setup.sh dev

# 또는 수동으로:

# 프론트엔드
cd frontend && npm install && npm run dev
# → http://localhost:3000

# 백엔드
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:socket_app --reload --port 8000
# → http://localhost:8000
```

### Docker Compose (전체 서비스)

```bash
# 1. 환경변수 설정
cp backend/.env.example backend/.env
# .env 파일 편집 후

# 2. 전체 실행
docker compose up -d --build

# 서비스 상태 확인
docker compose ps

# 로그 확인
docker compose logs -f backend
```

**접속 URL**:
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:8000
- API 문서(Swagger): http://localhost:8000/docs
- Nginx (운영): http://localhost:80

---

## 10. Phase 2 개발 예정 사항

### 우선 순위 높음

| 작업 | 설명 |
|------|------|
| DB 마이그레이션 | Alembic 초기 마이그레이션 파일 생성 + 실행 |
| 백엔드 API 완성 | 현재 `501 Not Implemented` 엔드포인트 구현 |
| 프론트 API 연동 | `mock-data.ts` → `@tanstack/react-query` + 실제 API 호출 |
| JWT 인증 | 로그인 페이지 + 토큰 기반 인증 미들웨어 |
| 실시간 연동 | Socket.IO로 센서 데이터 실시간 Push (현재: 프론트 시뮬레이션) |
| Modbus 폴링 | Celery Task로 등록된 장비 주기적 폴링 |
| 알림 발송 | 임계값 초과 시 이메일/SMS 자동 발송 |

### 우선 순위 보통

| 작업 | 설명 |
|------|------|
| OPC-UA 서비스 | `asyncua` 클라이언트 구현 |
| HTTP 장비 연동 | REST API 기반 장비 데이터 수집 |
| 배치도 서버 저장 | localStorage → DB 저장 (장비별 배치 JSON) |
| 보고서 PDF 내보내기 | 월간 보고서 자동 생성 |
| 모바일 앱 연동 | 현장 기사용 PWA 또는 네이티브 앱 |
| 사용자 권한 관리 | RBAC (superadmin / admin / technician / viewer) |

---

## 11. 알려진 이슈 및 주의사항

| 이슈 | 설명 | 조치 |
|------|------|------|
| Mock Data | 모든 데이터가 `mock-data.ts` 하드코딩 | Phase 2에서 API 연동으로 교체 |
| localStorage | 배치도 저장이 브라우저 로컬에만 저장 | 서버 DB 저장으로 전환 필요 |
| 장비 등록 미반영 | AddEquipmentModal 등록 후 목록에 바로 반영 안됨 | Zustand store 또는 React Query invalidation 구현 필요 |
| 소모품 등록 미반영 | AddConsumableModal 등록 후 필터 목록에 반영 안됨 | 동일 |
| Nginx 설정 | `docker-compose.yml`에 nginx 포함되나 `nginx/nginx.conf` 파일 미생성 | `nginx/nginx.conf` 파일 별도 작성 필요 |
| DB 초기화 | `backend/db/init.sql` 미생성 | Alembic 마이그레이션 또는 init.sql 작성 필요 |
| MQTT TLS | mosquitto.conf에 TLS 주석 처리 | 운영 시 인증서 생성 + 설정 활성화 필요 |
| Leaflet SSR | `dynamic(..., { ssr: false })` 필수 | 빠뜨리면 `window is not defined` 오류 발생 |

---

> **문의**: GitHub Issue 또는 프로젝트 담당자에게 연락  
> **GitHub**: https://github.com/w-websoft/waternix_dashboard
