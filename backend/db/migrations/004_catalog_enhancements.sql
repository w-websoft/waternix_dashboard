-- ============================================================
-- 004_catalog_enhancements.sql
-- 카탈로그 이미지, 제원, 주소 geocoding 지원
-- ============================================================

-- equipment_catalog 이미지·상세 컬럼 추가
ALTER TABLE equipment_catalog ADD COLUMN IF NOT EXISTS image_url      TEXT;
ALTER TABLE equipment_catalog ADD COLUMN IF NOT EXISTS images         TEXT[];
ALTER TABLE equipment_catalog ADD COLUMN IF NOT EXISTS catalog_page_url TEXT;
ALTER TABLE equipment_catalog ADD COLUMN IF NOT EXISTS features       TEXT[];
ALTER TABLE equipment_catalog ADD COLUMN IF NOT EXISTS applications   TEXT[];
ALTER TABLE equipment_catalog ADD COLUMN IF NOT EXISTS dimensions     VARCHAR(100);
ALTER TABLE equipment_catalog ADD COLUMN IF NOT EXISTS weight_kg      NUMERIC(8,1);
ALTER TABLE equipment_catalog ADD COLUMN IF NOT EXISTS power_supply   VARCHAR(50);
ALTER TABLE equipment_catalog ADD COLUMN IF NOT EXISTS removal_rate   VARCHAR(30);
ALTER TABLE equipment_catalog ADD COLUMN IF NOT EXISTS flow_rate_lph  NUMERIC(10,2);
ALTER TABLE equipment_catalog ADD COLUMN IF NOT EXISTS daily_volume_m3 NUMERIC(10,2);

-- equipment 테이블 설치주소 상세화
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS road_address    TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS detail_address  TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS zip_code        VARCHAR(10);

-- companies 테이블 도로명주소 추가
ALTER TABLE companies ADD COLUMN IF NOT EXISTS road_address    TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS detail_address  TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS zip_code        VARCHAR(10);

-- users 테이블 company_id 연동 (업체 계정) - companies.id는 VARCHAR 타입
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id VARCHAR(255) REFERENCES companies(id) ON DELETE SET NULL;
