-- ============================================================
-- 003_backoffice_extensions.sql
-- 백오피스 확장: 자산관리, A/S, 견적, 계약
-- ============================================================

-- ─── equipment 테이블 확장 ────────────────────────────────────
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS asset_no         VARCHAR(30);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS asset_status     VARCHAR(30) DEFAULT 'deployed';
    -- manufactured / in_stock / reserved / deployed / maintenance / retired
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS manufacture_date DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS cost_price_eq    BIGINT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS sell_price_eq    BIGINT;

-- ─── companies 테이블 확장 ───────────────────────────────────
ALTER TABLE companies ADD COLUMN IF NOT EXISTS customer_grade       VARCHAR(10)  DEFAULT 'B';
    -- VIP / A / B / C
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contract_type        VARCHAR(30);
    -- supply / maintenance / full_service
ALTER TABLE companies ADD COLUMN IF NOT EXISTS assigned_sales_id    VARCHAR(36);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS assigned_tech_id     VARCHAR(36);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS customer_rating      NUMERIC(3,1) DEFAULT 0;

-- ─── service_requests (A/S 접수·배차) ──────────────────────
CREATE TABLE IF NOT EXISTS service_requests (
    id                    VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    request_no            VARCHAR(30)  UNIQUE NOT NULL,
    equipment_id          VARCHAR(36),
    company_id            VARCHAR(36),
    equipment_name        VARCHAR(200),
    company_name          VARCHAR(200),
    request_type          VARCHAR(30)  NOT NULL DEFAULT 'inspection',
        -- breakdown / inspection / consumable / install / other
    priority              VARCHAR(20)  NOT NULL DEFAULT 'normal',
        -- urgent / normal / scheduled
    title                 VARCHAR(300) NOT NULL,
    description           TEXT,
    assigned_technician_id VARCHAR(36),
    technician_name       VARCHAR(100),
    status                VARCHAR(30)  NOT NULL DEFAULT 'received',
        -- received / dispatched / on_route / arrived / working / completed / cancelled
    scheduled_date        DATE,
    arrived_at            TIMESTAMPTZ,
    completed_at          TIMESTAMPTZ,
    parts_used            JSONB,
        -- [{name, qty, unit_price}]
    labor_hours           NUMERIC(5,2),
    labor_cost            BIGINT,
    parts_cost            BIGINT,
    total_cost            BIGINT,
    photos                TEXT[],
    signature_url         TEXT,
    report_notes          TEXT,
    customer_rating       INTEGER,
    customer_feedback     TEXT,
    created_at            TIMESTAMPTZ  DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sr_equipment  ON service_requests(equipment_id);
CREATE INDEX IF NOT EXISTS idx_sr_company    ON service_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_sr_status     ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_sr_technician ON service_requests(assigned_technician_id);

-- ─── quotations (견적서) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotations (
    id              VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    quote_no        VARCHAR(30)  UNIQUE NOT NULL,
    company_id      VARCHAR(36),
    company_name    VARCHAR(200),
    contact_name    VARCHAR(100),
    contact_email   VARCHAR(200),
    contact_phone   VARCHAR(30),
    items           JSONB        NOT NULL DEFAULT '[]',
        -- [{type, model_code, name, qty, unit_price, amount, notes}]
    subtotal        BIGINT       DEFAULT 0,
    tax             BIGINT       DEFAULT 0,
    total           BIGINT       DEFAULT 0,
    valid_until     DATE,
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft',
        -- draft / sent / accepted / rejected / expired
    notes           TEXT,
    created_by      VARCHAR(100),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quot_company ON quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_quot_status  ON quotations(status);

-- ─── contracts (계약) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
    id                VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    contract_no       VARCHAR(30)  UNIQUE NOT NULL,
    company_id        VARCHAR(36),
    company_name      VARCHAR(200),
    quotation_id      VARCHAR(36),
    contract_type     VARCHAR(30)  NOT NULL DEFAULT 'supply',
        -- supply / maintenance / full_service
    title             VARCHAR(300),
    start_date        DATE,
    end_date          DATE,
    amount            BIGINT       DEFAULT 0,
    payment_terms     TEXT,
    scope             TEXT,
    status            VARCHAR(20)  NOT NULL DEFAULT 'active',
        -- draft / active / expired / cancelled
    assigned_sales_id VARCHAR(36),
    sales_name        VARCHAR(100),
    notes             TEXT,
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cont_company ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_cont_status  ON contracts(status);

-- ─── inventory_transactions (재고 입출고 이력) ───────────────
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id               VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    catalog_id       VARCHAR(36),
    part_no          VARCHAR(100),
    item_name        VARCHAR(300),
    transaction_type VARCHAR(20)  NOT NULL,
        -- in / out / adjust
    qty              INTEGER      NOT NULL,
    unit_price       BIGINT,
    reference_type   VARCHAR(30),
        -- service_request / order / manual
    reference_id     VARCHAR(36),
    notes            TEXT,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invtx_catalog ON inventory_transactions(catalog_id);
