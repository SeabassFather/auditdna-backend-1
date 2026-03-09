-- ============================================================
-- AGRI-MAXX FULL RESET — Run once in pgAdmin
-- Drops bad tables, recreates from correct schema
-- Then run: agrimaxx-seed.sql  →  Agrimaxx-campaigns.sql
-- ============================================================

DROP TABLE IF EXISTS campaign_sends CASCADE;
DROP TABLE IF EXISTS agrimaxx_lead_scores CASCADE;
DROP TABLE IF EXISTS agrimaxx_campaigns CASCADE;
DROP TABLE IF EXISTS agrimaxx_send_log CASCADE;
DROP TABLE IF EXISTS agrimaxx_optouts CASCADE;
DROP TABLE IF EXISTS ag_contacts CASCADE;
DROP VIEW IF EXISTS vw_agrimaxx_grower_prospects CASCADE;
DROP VIEW IF EXISTS vw_agrimaxx_processor_prospects CASCADE;
DROP VIEW IF EXISTS vw_campaign_performance CASCADE;

-- TABLE 1: ag_contacts
CREATE TABLE ag_contacts (
    id                      SERIAL PRIMARY KEY,
    email                   VARCHAR(255) NOT NULL UNIQUE,
    contact_name            VARCHAR(255),
    title                   VARCHAR(255),
    company_name            VARCHAR(255),
    phone                   VARCHAR(50),
    industry_segment        VARCHAR(60) NOT NULL DEFAULT 'Unknown',
    campaign_track          CHAR(1) NOT NULL DEFAULT 'A',
    agrimaxx_tier           SMALLINT NOT NULL DEFAULT 2,
    crop_focus              VARCHAR(100),
    water_use_level         VARCHAR(20) DEFAULT 'Medium',
    region                  VARCHAR(100),
    country                 VARCHAR(100) DEFAULT 'USA',
    city                    VARCHAR(100),
    state_province          VARCHAR(100),
    website                 VARCHAR(255),
    language                VARCHAR(10) DEFAULT 'English',
    source                  VARCHAR(100),
    campaign_enrolled       BOOLEAN DEFAULT FALSE,
    campaign_track_assigned VARCHAR(10),
    last_campaign_sent      TIMESTAMP,
    campaign_opens          SMALLINT DEFAULT 0,
    consultation_booked     BOOLEAN DEFAULT FALSE,
    report_requested        BOOLEAN DEFAULT FALSE,
    opted_out               BOOLEAN DEFAULT FALSE,
    opted_out_at            TIMESTAMP,
    opted_out_reason        VARCHAR(255),
    language_pref           VARCHAR(10) DEFAULT 'English',
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ag_contacts_email      ON ag_contacts(email);
CREATE INDEX idx_ag_contacts_segment    ON ag_contacts(industry_segment);
CREATE INDEX idx_ag_contacts_track      ON ag_contacts(campaign_track);
CREATE INDEX idx_ag_contacts_tier       ON ag_contacts(agrimaxx_tier);
CREATE INDEX idx_ag_contacts_crop       ON ag_contacts(crop_focus);
CREATE INDEX idx_ag_contacts_opted_out  ON ag_contacts(opted_out);
CREATE INDEX idx_ag_contacts_enrolled   ON ag_contacts(campaign_enrolled);

-- TABLE 2: agrimaxx_campaigns
CREATE TABLE agrimaxx_campaigns (
    id                  SERIAL PRIMARY KEY,
    campaign_id         VARCHAR(20) NOT NULL UNIQUE,
    track               CHAR(1) NOT NULL,
    sequence_order      SMALLINT NOT NULL,
    theme               VARCHAR(100),
    subject_en          VARCHAR(255) NOT NULL,
    preheader_en        VARCHAR(255),
    body_en             TEXT NOT NULL,
    cta_en              VARCHAR(100),
    subject_es          VARCHAR(255) NOT NULL,
    preheader_es        VARCHAR(255),
    body_es             TEXT NOT NULL,
    cta_es              VARCHAR(100),
    target_segments     TEXT[],
    target_crops        TEXT[],
    target_tiers        SMALLINT[],
    send_delay_days     SMALLINT DEFAULT 0,
    total_sent          INTEGER DEFAULT 0,
    total_opens         INTEGER DEFAULT 0,
    total_clicks        INTEGER DEFAULT 0,
    total_consultations INTEGER DEFAULT 0,
    active              BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agrimaxx_campaigns_track  ON agrimaxx_campaigns(track);
CREATE INDEX idx_agrimaxx_campaigns_active ON agrimaxx_campaigns(active);

-- TABLE 3: campaign_sends
CREATE TABLE campaign_sends (
    id                  SERIAL PRIMARY KEY,
    contact_id          INTEGER REFERENCES ag_contacts(id) ON DELETE CASCADE,
    campaign_id         VARCHAR(20) REFERENCES agrimaxx_campaigns(campaign_id),
    email               VARCHAR(255) NOT NULL,
    language_sent       VARCHAR(10) DEFAULT 'English',
    sent_at             TIMESTAMP DEFAULT NOW(),
    opened_at           TIMESTAMP,
    clicked_at          TIMESTAMP,
    bounced             BOOLEAN DEFAULT FALSE,
    bounced_at          TIMESTAMP,
    opted_out           BOOLEAN DEFAULT FALSE,
    opted_out_at        TIMESTAMP,
    report_requested    BOOLEAN DEFAULT FALSE,
    report_requested_at TIMESTAMP,
    consultation_booked BOOLEAN DEFAULT FALSE,
    consultation_at     TIMESTAMP,
    notes               TEXT
);

CREATE INDEX idx_campaign_sends_contact   ON campaign_sends(contact_id);
CREATE INDEX idx_campaign_sends_campaign  ON campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_email     ON campaign_sends(email);
CREATE INDEX idx_campaign_sends_sent_at   ON campaign_sends(sent_at);

-- TABLE 4: agrimaxx_lead_scores
CREATE TABLE agrimaxx_lead_scores (
    id                      SERIAL PRIMARY KEY,
    contact_id              INTEGER REFERENCES ag_contacts(id) ON DELETE CASCADE,
    email                   VARCHAR(255) NOT NULL,
    acreage                 NUMERIC(10,2),
    daily_water_gallons     INTEGER,
    monthly_chem_cost       NUMERIC(10,2),
    monthly_energy_cost     NUMERIC(10,2),
    annual_yield_value      NUMERIC(12,2),
    est_water_savings_pct   NUMERIC(5,2) DEFAULT 20.00,
    est_chem_savings_pct    NUMERIC(5,2) DEFAULT 20.00,
    est_yield_increase_pct  NUMERIC(5,2) DEFAULT 15.00,
    annual_water_savings    NUMERIC(12,2),
    annual_chem_savings     NUMERIC(12,2),
    annual_yield_gain       NUMERIC(12,2),
    total_annual_benefit    NUMERIC(12,2),
    roi_per_acre            NUMERIC(10,2),
    score_tier              VARCHAR(20),
    scored_at               TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lead_scores_contact ON agrimaxx_lead_scores(contact_id);
CREATE INDEX idx_lead_scores_tier    ON agrimaxx_lead_scores(score_tier);

-- VIEWS
CREATE OR REPLACE VIEW vw_agrimaxx_grower_prospects AS
SELECT c.*, ls.total_annual_benefit, ls.roi_per_acre, ls.score_tier
FROM ag_contacts c
LEFT JOIN agrimaxx_lead_scores ls ON ls.contact_id = c.id
WHERE c.campaign_track = 'A' AND c.opted_out = FALSE AND c.agrimaxx_tier IN (1,2)
ORDER BY c.agrimaxx_tier ASC, ls.total_annual_benefit DESC NULLS LAST;

CREATE OR REPLACE VIEW vw_agrimaxx_processor_prospects AS
SELECT c.*, ls.daily_water_gallons, ls.monthly_chem_cost, ls.total_annual_benefit, ls.score_tier
FROM ag_contacts c
LEFT JOIN agrimaxx_lead_scores ls ON ls.contact_id = c.id
WHERE c.campaign_track = 'B' AND c.opted_out = FALSE
ORDER BY ls.daily_water_gallons DESC NULLS LAST;

CREATE OR REPLACE VIEW vw_campaign_performance AS
SELECT
    ac.campaign_id, ac.track, ac.theme, ac.subject_en,
    ac.total_sent, ac.total_opens, ac.total_clicks, ac.total_consultations,
    CASE WHEN ac.total_sent > 0 THEN ROUND((ac.total_opens::NUMERIC/ac.total_sent)*100,1) ELSE 0 END AS open_rate_pct,
    CASE WHEN ac.total_sent > 0 THEN ROUND((ac.total_clicks::NUMERIC/ac.total_sent)*100,1) ELSE 0 END AS click_rate_pct,
    CASE WHEN ac.total_sent > 0 THEN ROUND((ac.total_consultations::NUMERIC/ac.total_sent)*100,1) ELSE 0 END AS conversion_rate_pct
FROM agrimaxx_campaigns ac
ORDER BY ac.track, ac.sequence_order;

SELECT 'ALL AGRI-MAXX TABLES READY' AS result;