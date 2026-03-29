-- ============================================================
-- 워터닉스 장비 카탈로그 (자사 제품 등록 시스템)
-- ============================================================

CREATE TABLE IF NOT EXISTS equipment_catalog (
    id                  VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    model_code          VARCHAR(100) NOT NULL UNIQUE,   -- 모델 코드 (예: DCRO-500, WRO-2000L)
    model_name          VARCHAR(300) NOT NULL,           -- 제품명
    equipment_type      VARCHAR(50)  NOT NULL,           -- 장비 유형 (ro, cooling, di ...)
    series              VARCHAR(100),                    -- 시리즈명 (예: DCRO Series)
    category            VARCHAR(100),                    -- 분류 (역삼투압, 냉각수처리 ...)
    description         TEXT,                            -- 제품 설명
    features            TEXT[],                          -- 주요 특징 배열
    specs               JSONB,                           -- 사양 JSON {capacity_lph, voltage, weight_kg ...}
    default_consumables JSONB,                           -- 기본 소모품 [{part_no, name, interval_days}]
    warranty_months     INTEGER      DEFAULT 12,          -- 보증 기간(월)
    sell_price          BIGINT,                          -- 판매가 (원)
    cost_price          BIGINT,                          -- 원가 (원)
    lead_time_days      INTEGER      DEFAULT 30,          -- 납기 (일)
    image_url           TEXT,                            -- 제품 이미지 URL
    datasheet_url       TEXT,                            -- 사양서 URL
    is_active           BOOLEAN      DEFAULT true,
    sort_order          INTEGER      DEFAULT 0,
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eq_catalog_type   ON equipment_catalog(equipment_type);
CREATE INDEX IF NOT EXISTS idx_eq_catalog_active ON equipment_catalog(is_active);

-- ============================================================
-- system_settings (시스템 설정 DB 저장)
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT,
    category    VARCHAR(50)  DEFAULT 'general',
    description VARCHAR(300),
    updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- 기본 시스템 설정 값
-- ============================================================

INSERT INTO system_settings (key, value, category, description) VALUES
    ('company_name',          '(주)워터닉스',              'general', '회사명'),
    ('company_biz_no',        '621-81-12345',               'general', '사업자등록번호'),
    ('company_ceo',           '김워터',                     'general', '대표자'),
    ('company_phone',         '051-202-3055',               'general', '대표 연락처'),
    ('company_email',         'waternix@naver.com',         'general', '대표 이메일'),
    ('company_address',       '부산광역시 남구 수영로 309', 'general', '주소'),
    ('collect_interval_sec',  '30',                         'data',    '센서 수집 주기(초)'),
    ('heartbeat_sec',         '60',                         'data',    '하트비트 간격(초)'),
    ('offline_threshold_min', '5',                          'data',    '오프라인 판단(분)'),
    ('retention_days',        '365',                        'data',    '데이터 보관(일)'),
    ('alert_tds_warn',        '20',                         'alert',   'TDS 경고 기준(ppm)'),
    ('alert_tds_crit',        '50',                         'alert',   'TDS 긴급 기준(ppm)'),
    ('alert_filter_warn',     '80',                         'alert',   '필터수명 경고(%)'),
    ('alert_filter_crit',     '95',                         'alert',   '필터수명 긴급(%)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- filters 테이블 수명 관련 컬럼 추가
-- ============================================================

ALTER TABLE filters ADD COLUMN IF NOT EXISTS replace_interval_days INTEGER DEFAULT 180;
ALTER TABLE filters ADD COLUMN IF NOT EXISTS last_replaced_date DATE;
ALTER TABLE filters ADD COLUMN IF NOT EXISTS catalog_part_no VARCHAR(100);

-- ============================================================
-- equipment 테이블: 카탈로그 참조 컬럼 추가
-- ============================================================

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS catalog_model_code VARCHAR(100);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS purchase_price BIGINT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS install_by VARCHAR(100);
