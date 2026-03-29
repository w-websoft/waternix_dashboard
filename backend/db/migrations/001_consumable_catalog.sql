-- 소모품 카탈로그 테이블 생성
-- 워터닉스 전 제품군 소모품 마스터 데이터
CREATE TABLE IF NOT EXISTS consumable_catalog (
    id               VARCHAR(36)   PRIMARY KEY DEFAULT gen_random_uuid()::text,
    part_no          VARCHAR(50)   UNIQUE NOT NULL,
    name             VARCHAR(200)  NOT NULL,
    category         VARCHAR(50),                    -- filter/chemical/membrane/pump/sensor/other
    equipment_type   VARCHAR(50),                    -- ro/di/cooling/seawater 등
    compatible_models TEXT         DEFAULT '[]',     -- JSON 배열: ["WRO-T50","WRO-T100"]
    unit             VARCHAR(20)   DEFAULT '개',
    replace_interval_hours INTEGER,                  -- 교체 주기 (운전시간)
    sell_price       NUMERIC(12,2),                  -- 판매가
    cost_price       NUMERIC(12,2),                  -- 원가
    min_order_qty    INTEGER       DEFAULT 1,
    supplier         VARCHAR(200),
    description      TEXT,
    is_active        BOOLEAN       DEFAULT true,
    created_at       TIMESTAMPTZ   DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_equipment_type ON consumable_catalog(equipment_type);
CREATE INDEX IF NOT EXISTS idx_catalog_category ON consumable_catalog(category);
CREATE INDEX IF NOT EXISTS idx_catalog_part_no ON consumable_catalog(part_no);
