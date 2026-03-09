-- ============================================================================
-- AGRI-MAXX CAMPAIGN SCHEMA
-- AuditDNA Platform | CM Products International | MexaUSA Food Group
-- PostgreSQL | Integrates with ZadarmaCRM + EmailMarketing.jsx
-- ============================================================================

-- ============================================================================
-- TABLE 1: ag_contacts
-- Core agriculture contact database — 20K target
-- Joins to existing CRM contacts via email (shared key)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ag_contacts (
    id                  SERIAL PRIMARY KEY,
    email               VARCHAR(255) NOT NULL UNIQUE,
    contact_name        VARCHAR(255),
    title               VARCHAR(255),
    company_name        VARCHAR(255),
    phone               VARCHAR(50),

    -- Segmentation (maps to EmailMarketing scheduleSegment + ZadarmaCRM tags)
    industry_segment    VARCHAR(60) NOT NULL DEFAULT 'Unknown',
    -- Values: Grower | Shipper | Packer | Processor | FreshCut | Distributor |
    --         RetailBuyer | ColdStorage | Logistics | AgTechnology |
    --         Irrigation | Consultant | Nursery | Greenhouse | OrganicFarm

    campaign_track      CHAR(1) NOT NULL DEFAULT 'A',
    -- A = Grower/Field Operations  |  B = Processor/Facility

    agrimaxx_tier       SMALLINT NOT NULL DEFAULT 2,
    -- 1 = Highest (berries/vines/tree crops/greenhouses)
    -- 2 = Medium  (vegetable/organic/cannabis/turf)
    -- 3 = Lower   (packing houses/cold storage/irrigation districts)

    crop_focus          VARCHAR(100),
    -- e.g. Avocado | Blueberries | Lettuce | Mixed | N/A

    water_use_level     VARCHAR(20) DEFAULT 'Medium',
    -- Low | Medium | High | Very High

    region              VARCHAR(100),
    country             VARCHAR(100) DEFAULT 'USA',
    city                VARCHAR(100),
    state_province      VARCHAR(100),
    website             VARCHAR(255),

    language            VARCHAR(10) DEFAULT 'English',
    -- English | Spanish | Bilingual

    source              VARCHAR(100),
    -- TradeDirectory | USDA | SENASICA | Manual | TradeShow | Import | ZadarmaCRM

    -- Campaign tracking
    campaign_enrolled   BOOLEAN DEFAULT FALSE,
    campaign_track_assigned VARCHAR(10),  -- A1-A4 | B1-B3
    last_campaign_sent  TIMESTAMP,
    campaign_opens      SMALLINT DEFAULT 0,
    consultation_booked BOOLEAN DEFAULT FALSE,
    report_requested    BOOLEAN DEFAULT FALSE,

    -- Compliance
    opted_out           BOOLEAN DEFAULT FALSE,
    opted_out_at        TIMESTAMP,
    opted_out_reason    VARCHAR(255),
    language_pref       VARCHAR(10) DEFAULT 'English',

    -- Metadata
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Indexes for EmailMarketing.jsx query performance
CREATE INDEX IF NOT EXISTS idx_ag_contacts_email           ON ag_contacts(email);
CREATE INDEX IF NOT EXISTS idx_ag_contacts_segment         ON ag_contacts(industry_segment);
CREATE INDEX IF NOT EXISTS idx_ag_contacts_track           ON ag_contacts(campaign_track);
CREATE INDEX IF NOT EXISTS idx_ag_contacts_tier            ON ag_contacts(agrimaxx_tier);
CREATE INDEX IF NOT EXISTS idx_ag_contacts_crop            ON ag_contacts(crop_focus);
CREATE INDEX IF NOT EXISTS idx_ag_contacts_region          ON ag_contacts(region);
CREATE INDEX IF NOT EXISTS idx_ag_contacts_language        ON ag_contacts(language);
CREATE INDEX IF NOT EXISTS idx_ag_contacts_opted_out       ON ag_contacts(opted_out);
CREATE INDEX IF NOT EXISTS idx_ag_contacts_enrolled        ON ag_contacts(campaign_enrolled);


-- ============================================================================
-- TABLE 2: agrimaxx_campaigns
-- The 7 bilingual email templates (4 Grower Track A + 3 Processor Track B)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agrimaxx_campaigns (
    id                  SERIAL PRIMARY KEY,
    campaign_id         VARCHAR(20) NOT NULL UNIQUE,
    -- A1, A2, A3, A4, B1, B2, B3

    track               CHAR(1) NOT NULL,
    -- A = Grower | B = Processor

    sequence_order      SMALLINT NOT NULL,
    -- 1, 2, 3, 4

    theme               VARCHAR(100),
    -- Awareness | Economic Impact | Case Studies | Risk Reversal | Sustainability

    -- English content
    subject_en          VARCHAR(255) NOT NULL,
    preheader_en        VARCHAR(255),
    body_en             TEXT NOT NULL,
    cta_en              VARCHAR(100),

    -- Spanish content
    subject_es          VARCHAR(255) NOT NULL,
    preheader_es        VARCHAR(255),
    body_es             TEXT NOT NULL,
    cta_es              VARCHAR(100),

    -- Targeting
    target_segments     TEXT[],
    -- Array of industry_segment values this campaign targets
    target_crops        TEXT[],
    target_tiers        SMALLINT[],

    -- Send timing (days after enrollment)
    send_delay_days     SMALLINT DEFAULT 0,

    -- Stats
    total_sent          INTEGER DEFAULT 0,
    total_opens         INTEGER DEFAULT 0,
    total_clicks        INTEGER DEFAULT 0,
    total_consultations INTEGER DEFAULT 0,

    active              BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agrimaxx_campaigns_track    ON agrimaxx_campaigns(track);
CREATE INDEX IF NOT EXISTS idx_agrimaxx_campaigns_active   ON agrimaxx_campaigns(active);


-- ============================================================================
-- TABLE 3: campaign_sends
-- Tracks every send, open, click — feeds EmailMarketing analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaign_sends (
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

CREATE INDEX IF NOT EXISTS idx_campaign_sends_contact      ON campaign_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign     ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_email        ON campaign_sends(email);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_sent_at      ON campaign_sends(sent_at);


-- ============================================================================
-- TABLE 4: agrimaxx_lead_scores
-- Farm / Facility ROI scoring — powers the AuditDNA "Intelligence Report" lead magnet
-- ============================================================================
CREATE TABLE IF NOT EXISTS agrimaxx_lead_scores (
    id                  SERIAL PRIMARY KEY,
    contact_id          INTEGER REFERENCES ag_contacts(id) ON DELETE CASCADE,
    email               VARCHAR(255) NOT NULL,

    -- Farm/Facility inputs
    acreage             NUMERIC(10,2),
    daily_water_gallons INTEGER,
    monthly_chem_cost   NUMERIC(10,2),
    monthly_energy_cost NUMERIC(10,2),
    annual_yield_value  NUMERIC(12,2),

    -- Calculated ROI estimates
    est_water_savings_pct    NUMERIC(5,2) DEFAULT 20.00,
    est_chem_savings_pct     NUMERIC(5,2) DEFAULT 20.00,
    est_yield_increase_pct   NUMERIC(5,2) DEFAULT 15.00,

    annual_water_savings     NUMERIC(12,2),
    annual_chem_savings      NUMERIC(12,2),
    annual_yield_gain        NUMERIC(12,2),
    total_annual_benefit     NUMERIC(12,2),
    roi_per_acre             NUMERIC(10,2),

    score_tier          VARCHAR(20),
    -- Hot | Warm | Cold

    scored_at           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_contact         ON agrimaxx_lead_scores(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_tier            ON agrimaxx_lead_scores(score_tier);


-- ============================================================================
-- VIEWS — Used by EmailMarketing.jsx backend endpoints
-- ============================================================================

-- Active Grower Track A prospects (not opted out, Tiers 1+2)
CREATE OR REPLACE VIEW vw_agrimaxx_grower_prospects AS
SELECT
    c.*,
    ls.total_annual_benefit,
    ls.roi_per_acre,
    ls.score_tier
FROM ag_contacts c
LEFT JOIN agrimaxx_lead_scores ls ON ls.contact_id = c.id
WHERE c.campaign_track = 'A'
  AND c.opted_out = FALSE
  AND c.agrimaxx_tier IN (1, 2)
ORDER BY c.agrimaxx_tier ASC, ls.total_annual_benefit DESC NULLS LAST;

-- Active Processor Track B prospects
CREATE OR REPLACE VIEW vw_agrimaxx_processor_prospects AS
SELECT
    c.*,
    ls.daily_water_gallons,
    ls.monthly_chem_cost,
    ls.total_annual_benefit,
    ls.score_tier
FROM ag_contacts c
LEFT JOIN agrimaxx_lead_scores ls ON ls.contact_id = c.id
WHERE c.campaign_track = 'B'
  AND c.opted_out = FALSE
ORDER BY ls.daily_water_gallons DESC NULLS LAST, ls.total_annual_benefit DESC NULLS LAST;

-- Campaign performance summary
CREATE OR REPLACE VIEW vw_campaign_performance AS
SELECT
    ac.campaign_id,
    ac.track,
    ac.theme,
    ac.subject_en,
    ac.total_sent,
    ac.total_opens,
    ac.total_clicks,
    ac.total_consultations,
    CASE WHEN ac.total_sent > 0
         THEN ROUND((ac.total_opens::NUMERIC / ac.total_sent) * 100, 1)
         ELSE 0 END AS open_rate_pct,
    CASE WHEN ac.total_sent > 0
         THEN ROUND((ac.total_clicks::NUMERIC / ac.total_sent) * 100, 1)
         ELSE 0 END AS click_rate_pct,
    CASE WHEN ac.total_sent > 0
         THEN ROUND((ac.total_consultations::NUMERIC / ac.total_sent) * 100, 1)
         ELSE 0 END AS conversion_rate_pct
FROM agrimaxx_campaigns ac
ORDER BY ac.track, ac.sequence_order;


-- ============================================================================
-- AUTOMATION TRIGGER QUERIES
-- Use in backend route: GET /api/agrimaxx/targets?track=A&tier=1
-- ============================================================================

-- Query: Tier 1 Avocado growers 50+ acres — highest priority send
-- SELECT * FROM vw_agrimaxx_grower_prospects
-- WHERE crop_focus ILIKE '%avocado%' AND acreage >= 50;

-- Query: FreshCut processors — Track B
-- SELECT * FROM ag_contacts
-- WHERE industry_segment = 'FreshCut' AND opted_out = FALSE;

-- Query: Spanish-language contacts
-- SELECT * FROM ag_contacts
-- WHERE language IN ('Spanish', 'Bilingual') AND opted_out = FALSE;

-- Query: Contacts NOT yet enrolled in any campaign
-- SELECT * FROM ag_contacts
-- WHERE campaign_enrolled = FALSE AND opted_out = FALSE
-- ORDER BY agrimaxx_tier ASC;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================