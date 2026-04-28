-- ============================================================================
-- C:\AuditDNA\backend\sql\rfq_schema.sql
-- Phase 1 - Reverse RFQ Marketplace + CFDI 4.0 (SAT Mexico) compliance
-- Run on Railway PostgreSQL: psql $DATABASE_URL -f rfq_schema.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) RFQ NEEDS - Buyer posts what they want
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_needs (
    id                    BIGSERIAL PRIMARY KEY,
    rfq_code              VARCHAR(20) UNIQUE NOT NULL,         -- e.g. RFQ-2026-04-28-0001
    buyer_id              INTEGER NOT NULL,                     -- FK to buyers/auth_users
    buyer_anonymous_id    VARCHAR(50) NOT NULL,                 -- "Verified Buyer #1893"
    commodity_category    VARCHAR(80) NOT NULL,                 -- e.g. 'avocados'
    commodity_subcategory VARCHAR(80) NOT NULL,                 -- e.g. 'hass_48'
    pack_size             VARCHAR(80),                          -- '25lb carton'
    quantity              NUMERIC(12,2) NOT NULL,
    quantity_unit         VARCHAR(20) NOT NULL DEFAULT 'pallets', -- pallets/loads/cases
    delivery_date_start   DATE NOT NULL,
    delivery_date_end     DATE,
    destination_zip       VARCHAR(10),
    destination_country   VARCHAR(2) NOT NULL DEFAULT 'US',     -- US|MX
    destination_state     VARCHAR(40),
    destination_lat       NUMERIC(9,6),
    destination_lon       NUMERIC(9,6),
    terms                 VARCHAR(20) NOT NULL DEFAULT 'FOB',   -- FOB|CIF|DDP|PICKUP
    target_price          NUMERIC(12,2),
    target_price_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    quality_grade         VARCHAR(40),
    organic_required      BOOLEAN NOT NULL DEFAULT FALSE,
    certs_required        TEXT[],
    payment_preference    VARCHAR(20) NOT NULL DEFAULT 'escrow',-- escrow|net15|net30|cod
    photo_urls            TEXT[],
    spec_notes            TEXT,
    status                VARCHAR(20) NOT NULL DEFAULT 'open',  -- open|auction|locked|delivered|disputed|closed|expired
    auction_starts_at     TIMESTAMPTZ,
    auction_ends_at       TIMESTAMPTZ,
    is_spot_market        BOOLEAN NOT NULL DEFAULT FALSE,        -- TRUE if GMV < 1500
    estimated_gmv         NUMERIC(14,2),
    locked_offer_id       BIGINT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at            TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS ix_rfq_needs_status ON rfq_needs(status);
CREATE INDEX IF NOT EXISTS ix_rfq_needs_commodity ON rfq_needs(commodity_category, commodity_subcategory);
CREATE INDEX IF NOT EXISTS ix_rfq_needs_dest ON rfq_needs(destination_country, destination_state);
CREATE INDEX IF NOT EXISTS ix_rfq_needs_buyer ON rfq_needs(buyer_id);
CREATE INDEX IF NOT EXISTS ix_rfq_needs_dates ON rfq_needs(delivery_date_start);

-- ============================================================================
-- 2) RFQ OFFERS - Grower bids (sealed round 1, open round 2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_offers (
    id                  BIGSERIAL PRIMARY KEY,
    rfq_id              BIGINT NOT NULL REFERENCES rfq_needs(id) ON DELETE CASCADE,
    grower_id           INTEGER NOT NULL,
    grower_anonymous_id VARCHAR(50) NOT NULL,                 -- "Verified Grower #4421"
    bid_price           NUMERIC(12,2) NOT NULL,
    bid_currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    quantity_offered    NUMERIC(12,2) NOT NULL,
    delivery_date       DATE NOT NULL,
    terms               VARCHAR(20) NOT NULL,                 -- FOB|CIF|DDP|PICKUP
    round               SMALLINT NOT NULL DEFAULT 1,          -- 1=sealed, 2=open
    signal_inventory_pressure BOOLEAN NOT NULL DEFAULT FALSE, -- "harvested today"
    signal_streak       INTEGER NOT NULL DEFAULT 0,           -- days since last win
    signal_distress     BOOLEAN NOT NULL DEFAULT FALSE,       -- needs to move fast
    grs_score           NUMERIC(5,2),                          -- snapshot at bid time
    photo_urls          TEXT[],
    notes               TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'submitted', -- submitted|revised|withdrawn|won|lost
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revised_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_rfq_offers_rfq ON rfq_offers(rfq_id);
CREATE INDEX IF NOT EXISTS ix_rfq_offers_grower ON rfq_offers(grower_id);
CREATE INDEX IF NOT EXISTS ix_rfq_offers_status ON rfq_offers(status);

-- ============================================================================
-- 3) RFQ MESSAGES - anonymized chat with PII redaction
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_messages (
    id                  BIGSERIAL PRIMARY KEY,
    rfq_id              BIGINT NOT NULL REFERENCES rfq_needs(id) ON DELETE CASCADE,
    sender_anonymous_id VARCHAR(50) NOT NULL,
    sender_role         VARCHAR(10) NOT NULL,                 -- buyer|grower|platform
    body                TEXT NOT NULL,
    body_redacted       TEXT,                                 -- after PII strip
    redaction_flags     TEXT[],                               -- ['phone','email','company']
    has_violation       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_rfq_msgs_rfq ON rfq_messages(rfq_id, created_at);

-- ============================================================================
-- 4) QUALITY VERIFICATION - voice memos + walkthrough video
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_quality_evidence (
    id                  BIGSERIAL PRIMARY KEY,
    rfq_id              BIGINT NOT NULL REFERENCES rfq_needs(id) ON DELETE CASCADE,
    submitter_role      VARCHAR(10) NOT NULL,                 -- buyer|grower
    evidence_type       VARCHAR(20) NOT NULL,                 -- voice_memo|walkthrough_video|photo
    media_url           TEXT NOT NULL,                        -- bytea reference or URL
    duration_seconds    INTEGER,
    sha256_hash         VARCHAR(64) NOT NULL,                 -- immutable proof
    gps_lat             NUMERIC(9,6),
    gps_lon             NUMERIC(9,6),
    captured_at         TIMESTAMPTZ NOT NULL,
    confirmed_spec      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_rfq_evidence_rfq ON rfq_quality_evidence(rfq_id);

-- ============================================================================
-- 5) DEAL LOCK + FINANCE MODE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_deal_locks (
    id                  BIGSERIAL PRIMARY KEY,
    rfq_id              BIGINT NOT NULL UNIQUE REFERENCES rfq_needs(id),
    offer_id            BIGINT NOT NULL REFERENCES rfq_offers(id),
    buyer_id            INTEGER NOT NULL,
    grower_id           INTEGER NOT NULL,
    final_price         NUMERIC(12,2) NOT NULL,
    final_currency      VARCHAR(3) NOT NULL DEFAULT 'USD',
    final_quantity      NUMERIC(12,2) NOT NULL,
    final_delivery_date DATE NOT NULL,
    final_terms         VARCHAR(20) NOT NULL,
    finance_mode        VARCHAR(2) NOT NULL,                  -- A|B|C|D
    -- A: standard escrow, B: grower factoring (24h), C: buyer PO finance, D: Mexausa principal accel
    platform_fee_pct    NUMERIC(5,2) NOT NULL DEFAULT 3.50,
    platform_fee_flat   NUMERIC(8,2) NOT NULL DEFAULT 25.00,
    factor_fee_pct      NUMERIC(5,2),                         -- when B or D
    po_finance_fee_pct  NUMERIC(5,2),                         -- when C or D
    gmv                 NUMERIC(14,2) NOT NULL,
    mexausa_margin      NUMERIC(14,2) NOT NULL,
    locked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6) SHIPMENT TRACKING - milestones
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_shipments (
    id                  BIGSERIAL PRIMARY KEY,
    rfq_id              BIGINT NOT NULL UNIQUE REFERENCES rfq_needs(id),
    deal_lock_id        BIGINT NOT NULL REFERENCES rfq_deal_locks(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|picked|in_transit|delivered|accepted|rejected
    picked_at           TIMESTAMPTZ,
    in_transit_at       TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    accepted_at         TIMESTAMPTZ,
    rejected_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    carrier_name        VARCHAR(120),
    bol_number          VARCHAR(60),
    pickup_photo_url    TEXT,
    delivery_photo_url  TEXT,
    accept_photo_url    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7) DISPUTES + arbitration
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_disputes (
    id                  BIGSERIAL PRIMARY KEY,
    rfq_id              BIGINT NOT NULL REFERENCES rfq_needs(id),
    raised_by           VARCHAR(10) NOT NULL,                 -- buyer|grower
    dispute_type        VARCHAR(40) NOT NULL,                 -- quality|short_qty|late|wrong_spec|damaged|other
    description         TEXT NOT NULL,
    photo_urls          TEXT[],
    amount_in_dispute   NUMERIC(12,2) NOT NULL,
    arbitration_tier    VARCHAR(20) NOT NULL,                 -- internal_under_5k|aaa_over_5k
    resolution          VARCHAR(20),                          -- buyer_wins|grower_wins|split|withdrawn
    resolution_notes    TEXT,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8) CALENDAR EVENTS - source of truth for platform calendar
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_calendar_events (
    id                  BIGSERIAL PRIMARY KEY,
    rfq_id              BIGINT NOT NULL REFERENCES rfq_needs(id) ON DELETE CASCADE,
    event_type          VARCHAR(30) NOT NULL,                 -- posted|negotiating|locked|in_transit|delivered|disputed
    color_code          VARCHAR(10) NOT NULL,                 -- yellow|blue|green|gold|black|red
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    starts_at           TIMESTAMPTZ NOT NULL,
    ends_at             TIMESTAMPTZ,
    google_calendar_id  VARCHAR(120),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_rfq_cal_dates ON rfq_calendar_events(starts_at);

-- ============================================================================
-- 9) BUYER VETTING + PACA CACHE
-- ============================================================================
CREATE TABLE IF NOT EXISTS paca_licenses_cache (
    license_number      VARCHAR(20) PRIMARY KEY,
    licensee_name       VARCHAR(200) NOT NULL,
    address             TEXT,
    city                VARCHAR(100),
    state               VARCHAR(40),
    zip                 VARCHAR(10),
    issue_date          DATE,
    expiry_date         DATE,
    status              VARCHAR(20),                          -- active|expired|revoked
    last_synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_paca_status ON paca_licenses_cache(status);
CREATE INDEX IF NOT EXISTS ix_paca_expiry ON paca_licenses_cache(expiry_date);

CREATE TABLE IF NOT EXISTS rfq_buyer_vetting (
    id                  BIGSERIAL PRIMARY KEY,
    buyer_id            INTEGER NOT NULL,
    paca_license        VARCHAR(20),
    paca_status         VARCHAR(20),                          -- active|expired|not_found
    vetting_status      VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|auto_approved|manual_review|approved|rejected
    auto_approved       BOOLEAN NOT NULL DEFAULT FALSE,
    manual_reviewer     VARCHAR(100),
    review_notes        TEXT,
    dnb_duns            VARCHAR(20),
    ein                 VARCHAR(20),
    rfc                 VARCHAR(20),                          -- MX equivalent of EIN
    trade_refs          JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_vetting_buyer ON rfq_buyer_vetting(buyer_id);
CREATE INDEX IF NOT EXISTS ix_vetting_status ON rfq_buyer_vetting(vetting_status);

-- ============================================================================
-- 10) NOTIFICATIONS LOG - ntfy + native push
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_notifications (
    id                  BIGSERIAL PRIMARY KEY,
    rfq_id              BIGINT REFERENCES rfq_needs(id),
    recipient_id        INTEGER NOT NULL,
    recipient_role      VARCHAR(10) NOT NULL,                 -- buyer|grower|admin
    channel             VARCHAR(20) NOT NULL,                 -- ntfy|webpush|email
    event_type          VARCHAR(40) NOT NULL,
    payload             JSONB,
    delivered           BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_at        TIMESTAMPTZ,
    error               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_rfq_notif_recipient ON rfq_notifications(recipient_id, created_at DESC);

-- ============================================================================
-- 11) CFDI 4.0 - Mexico SAT Compliance
-- ============================================================================
-- CFDI = Comprobante Fiscal Digital por Internet (digital tax receipt)
-- Required by SAT (Servicio de Administracion Tributaria) for any MX-side transaction
-- Both XML (signed) and PDF must be issued

CREATE TABLE IF NOT EXISTS cfdi_emisor_config (
    id                  SERIAL PRIMARY KEY,
    rfc                 VARCHAR(13) UNIQUE NOT NULL,          -- emisor RFC
    razon_social        VARCHAR(254) NOT NULL,                -- legal name
    regimen_fiscal      VARCHAR(3) NOT NULL,                  -- e.g. '601' (General de Ley)
    lugar_expedicion    VARCHAR(5) NOT NULL,                  -- ZIP / codigo postal of issuer
    csd_certificado     TEXT,                                 -- base64 .cer
    csd_llave_privada   TEXT,                                 -- base64 .key (encrypted at rest)
    csd_password_enc    TEXT,
    pac_provider        VARCHAR(40),                          -- e.g. 'finkok','solucion-factible','smarter-web'
    pac_username_enc    TEXT,
    pac_password_enc    TEXT,
    is_test_mode        BOOLEAN NOT NULL DEFAULT TRUE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cfdi_invoices (
    id                  BIGSERIAL PRIMARY KEY,
    rfq_id              BIGINT NOT NULL REFERENCES rfq_needs(id),
    deal_lock_id        BIGINT NOT NULL REFERENCES rfq_deal_locks(id),
    cfdi_uuid           VARCHAR(36) UNIQUE,                   -- SAT folio fiscal returned by PAC
    cfdi_serie          VARCHAR(25) NOT NULL DEFAULT 'A',
    cfdi_folio          VARCHAR(40) NOT NULL,                 -- internal folio
    tipo_comprobante    VARCHAR(1) NOT NULL,                  -- I=ingreso (invoice), E=egreso (credit), P=pago, T=traslado
    forma_pago          VARCHAR(2) NOT NULL,                  -- 01=efectivo, 03=transferencia, 99=por definir
    metodo_pago         VARCHAR(3) NOT NULL,                  -- PUE=pago en una exhibicion, PPD=pago en parcialidades
    moneda              VARCHAR(3) NOT NULL DEFAULT 'MXN',    -- MXN|USD
    tipo_cambio         NUMERIC(10,4),                        -- if not MXN
    subtotal            NUMERIC(14,2) NOT NULL,
    descuento           NUMERIC(14,2) NOT NULL DEFAULT 0,
    iva_traslado        NUMERIC(14,2) NOT NULL DEFAULT 0,     -- 16% typical
    iva_retenido        NUMERIC(14,2) NOT NULL DEFAULT 0,
    isr_retenido        NUMERIC(14,2) NOT NULL DEFAULT 0,
    total               NUMERIC(14,2) NOT NULL,
    -- Emisor (Mexausa Food Group when MX-side)
    emisor_rfc          VARCHAR(13) NOT NULL,
    emisor_razon_social VARCHAR(254) NOT NULL,
    emisor_regimen      VARCHAR(3) NOT NULL,
    -- Receptor
    receptor_rfc        VARCHAR(13) NOT NULL,
    receptor_razon_social VARCHAR(254) NOT NULL,
    receptor_regimen    VARCHAR(3) NOT NULL,
    receptor_uso_cfdi   VARCHAR(3) NOT NULL,                  -- e.g. G03=gastos en general
    receptor_domicilio_zip VARCHAR(5) NOT NULL,
    -- Conceptos (line items) stored as JSONB for flexibility
    conceptos           JSONB NOT NULL,
    -- SAT response
    sat_xml_signed      TEXT,                                 -- final stamped XML from PAC
    sat_xml_unsigned    TEXT,
    sat_pdf_url         TEXT,                                 -- generated PDF location
    sat_qr_url          TEXT,                                 -- verification QR per CFDI 4.0 spec
    sello_cfd           TEXT,
    sello_sat           TEXT,
    no_certificado_sat  VARCHAR(20),
    fecha_timbrado      TIMESTAMPTZ,
    -- Status
    status              VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft|sent_to_pac|stamped|cancelled|error
    error_message       TEXT,
    cancelled_at        TIMESTAMPTZ,
    cancellation_reason VARCHAR(2),                            -- 01=errores con relacion, 02=sin relacion, 03=no se llevo a cabo, 04=operacion nominativa
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_cfdi_rfq ON cfdi_invoices(rfq_id);
CREATE INDEX IF NOT EXISTS ix_cfdi_uuid ON cfdi_invoices(cfdi_uuid);
CREATE INDEX IF NOT EXISTS ix_cfdi_status ON cfdi_invoices(status);
CREATE INDEX IF NOT EXISTS ix_cfdi_receptor ON cfdi_invoices(receptor_rfc);

-- CFDI catalog tables (per SAT) - seeded with most-used codes
CREATE TABLE IF NOT EXISTS cfdi_cat_uso_cfdi (
    code        VARCHAR(3) PRIMARY KEY,
    description VARCHAR(200) NOT NULL,
    persona_fisica BOOLEAN NOT NULL DEFAULT TRUE,
    persona_moral  BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO cfdi_cat_uso_cfdi (code, description) VALUES
  ('G01','Adquisicion de mercancias'),
  ('G02','Devoluciones, descuentos o bonificaciones'),
  ('G03','Gastos en general'),
  ('I01','Construcciones'),
  ('I02','Mobiliario y equipo de oficina por inversiones'),
  ('I03','Equipo de transporte'),
  ('I04','Equipo de computo y accesorios'),
  ('S01','Sin efectos fiscales')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS cfdi_cat_forma_pago (
    code        VARCHAR(2) PRIMARY KEY,
    description VARCHAR(120) NOT NULL
);
INSERT INTO cfdi_cat_forma_pago (code, description) VALUES
  ('01','Efectivo'),
  ('02','Cheque nominativo'),
  ('03','Transferencia electronica de fondos'),
  ('04','Tarjeta de credito'),
  ('28','Tarjeta de debito'),
  ('99','Por definir')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS cfdi_cat_regimen_fiscal (
    code        VARCHAR(3) PRIMARY KEY,
    description VARCHAR(200) NOT NULL,
    persona_fisica BOOLEAN NOT NULL DEFAULT FALSE,
    persona_moral  BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO cfdi_cat_regimen_fiscal (code, description, persona_fisica, persona_moral) VALUES
  ('601','General de Ley Personas Morales', FALSE, TRUE),
  ('603','Personas Morales con Fines no Lucrativos', FALSE, TRUE),
  ('605','Sueldos y Salarios e Ingresos Asimilados', TRUE, FALSE),
  ('612','Personas Fisicas con Actividades Empresariales', TRUE, FALSE),
  ('616','Sin obligaciones fiscales', TRUE, TRUE),
  ('621','Incorporacion Fiscal', TRUE, FALSE),
  ('626','Regimen Simplificado de Confianza', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 12) BRAIN EVENT LOG - all RFQ state changes feed brain/dashboard
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_brain_events (
    id              BIGSERIAL PRIMARY KEY,
    rfq_id          BIGINT REFERENCES rfq_needs(id),
    event_type      VARCHAR(60) NOT NULL,                     -- RFQ_POSTED|GROWER_BID|DEAL_LOCKED|...
    actor_id        INTEGER,
    actor_role      VARCHAR(10),
    payload         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_brain_events_rfq ON rfq_brain_events(rfq_id, created_at);
CREATE INDEX IF NOT EXISTS ix_brain_events_type ON rfq_brain_events(event_type, created_at);

-- ============================================================================
-- 13) RFQ CODE GENERATOR (sequence + helper)
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS rfq_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_rfq_code() RETURNS VARCHAR(20) AS $$
DECLARE
    next_n INTEGER;
    code   VARCHAR(20);
BEGIN
    next_n := nextval('rfq_code_seq');
    code := 'RFQ-' || TO_CHAR(NOW(),'YYYY-MM-DD') || '-' || LPAD(next_n::TEXT, 4, '0');
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-fill rfq_code on insert if NULL
CREATE OR REPLACE FUNCTION trg_rfq_needs_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.rfq_code IS NULL OR NEW.rfq_code = '' THEN
        NEW.rfq_code := generate_rfq_code();
    END IF;
    NEW.is_spot_market := (COALESCE(NEW.estimated_gmv, 0) > 0 AND NEW.estimated_gmv < 1500);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rfq_needs_before_insert ON rfq_needs;
CREATE TRIGGER rfq_needs_before_insert
  BEFORE INSERT ON rfq_needs
  FOR EACH ROW
  EXECUTE FUNCTION trg_rfq_needs_code();

-- updated_at auto-touch
CREATE OR REPLACE FUNCTION trg_touch_updated() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rfq_needs_before_update ON rfq_needs;
CREATE TRIGGER rfq_needs_before_update
  BEFORE UPDATE ON rfq_needs
  FOR EACH ROW
  EXECUTE FUNCTION trg_touch_updated();

DROP TRIGGER IF EXISTS rfq_shipments_before_update ON rfq_shipments;
CREATE TRIGGER rfq_shipments_before_update
  BEFORE UPDATE ON rfq_shipments
  FOR EACH ROW
  EXECUTE FUNCTION trg_touch_updated();

DROP TRIGGER IF EXISTS cfdi_invoices_before_update ON cfdi_invoices;
CREATE TRIGGER cfdi_invoices_before_update
  BEFORE UPDATE ON cfdi_invoices
  FOR EACH ROW
  EXECUTE FUNCTION trg_touch_updated();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after install)
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name LIKE 'rfq_%' OR table_name LIKE 'cfdi_%' OR table_name='paca_licenses_cache'
--   ORDER BY table_name;
-- SELECT generate_rfq_code();
-- ============================================================================
