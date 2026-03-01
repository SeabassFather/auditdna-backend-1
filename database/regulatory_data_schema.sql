-- ============================================================
-- AUDITDNA — REGULATORY DATA PRODUCT SCHEMA
-- File: C:\AuditDNA\backend\database\regulatory_data_schema.sql
-- Run against: auditdna_mortgage database
--
-- PURPOSE:
--   This schema stores anonymized, aggregated mortgage violation
--   data derived from AuditDNA audit cases. The data product is
--   licensed to federal and state regulatory agencies to help them:
--     - Identify systemic lender violations at scale
--     - Prioritize enforcement actions by geography and lender
--     - Measure fee overcharge patterns across loan types
--     - Track RESPA/TRID compliance rates by servicer
--     - Build market efficiency models
--
-- BUYERS:
--   - CFPB (Consumer Financial Protection Bureau)
--   - HUD (Dept. of Housing & Urban Development)
--   - FHFA (Federal Housing Finance Agency)
--   - State Banking Departments (all 50 states)
--   - State AG offices (consumer protection divisions)
--   - GSEs: Fannie Mae, Freddie Mac (lender risk data)
--   - Academic / policy research institutions
--
-- CRITICAL LEGAL NOTE:
--   ALL data in this schema is anonymized. No PII is stored here.
--   Consumer names, SSNs, addresses, phone numbers, and emails
--   are NEVER included. Data is either aggregated (counts, averages,
--   rates) or tokenized (lender_token, case_token — one-way hashes
--   that cannot be reversed to identify individuals).
--   Complies with: FCRA, GLBA, CCPA, state privacy laws.
--
-- COPYRIGHT & PATENT NOTICE:
--   This data architecture is a component of the AuditDNA Platform.
--   Patent Pending. Saul Garcia, MFG Inc., NMLS #337526.
--   Unauthorized reproduction or commercial use is prohibited.
-- ============================================================

-- ── EXTENSIONS ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ════════════════════════════════════════════════════════════
-- SECTION 1: DATA LICENSEES
-- Who is buying this data
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS data_licensees (
  id                    SERIAL PRIMARY KEY,
  licensee_code         VARCHAR(30)   UNIQUE NOT NULL,
  -- e.g. 'CFPB-001', 'HUD-001', 'CA-DBO-001', 'FHFA-001'

  agency_name           VARCHAR(300)  NOT NULL,
  agency_type           VARCHAR(50)   NOT NULL,
  -- 'federal_regulator' | 'state_regulator' | 'gse' | 'academic' | 'policy_org'

  jurisdiction          VARCHAR(10),   -- 'federal', 'CA', 'TX', etc.
  primary_contact_name  VARCHAR(200),
  primary_contact_email VARCHAR(200),
  primary_contact_phone VARCHAR(30),

  contract_start        DATE,
  contract_end          DATE,
  contract_value        NUMERIC(15,2),
  contract_type         VARCHAR(30),
  -- 'annual_license' | 'per_query' | 'bulk_purchase' | 'research_grant'

  data_feeds_licensed   TEXT[],
  -- Which feeds they have access to:
  -- 'violation_patterns', 'lender_rankings', 'geographic_heatmaps',
  -- 'fee_overcharge_stats', 'servicer_performance', 'market_rates',
  -- 'enforcement_leads', 'recovery_outcomes'

  api_key_hash          VARCHAR(256),  -- hashed API key for data API access
  query_limit_monthly   INTEGER        DEFAULT 10000,
  queries_this_month    INTEGER        DEFAULT 0,

  active                BOOLEAN        DEFAULT TRUE,
  onboarded_at          TIMESTAMPTZ    DEFAULT NOW(),
  notes                 TEXT,
  created_at            TIMESTAMPTZ    DEFAULT NOW(),
  updated_at            TIMESTAMPTZ    DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- SECTION 2: LENDER REGISTRY (ANONYMIZED)
-- Lenders are tracked by token — never by name in public feeds.
-- Name is stored encrypted for internal AuditDNA use only.
-- Regulators receive the token + NMLS number (public record).
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reg_lender_registry (
  id                      SERIAL PRIMARY KEY,
  lender_token            VARCHAR(64)   UNIQUE NOT NULL,
  -- SHA-256 hash of (lender_name + salt) — one-way, non-reversible

  nmls_number             VARCHAR(20),   -- public record, safe to include
  lender_name_encrypted   TEXT,          -- AES-encrypted, AuditDNA internal only
  lender_type             VARCHAR(50),
  -- 'bank', 'credit_union', 'mortgage_company', 'broker', 'servicer', 'correspondent'

  headquarter_state       VARCHAR(2),
  licensed_states         TEXT[]         DEFAULT '{}',
  operates_federally      BOOLEAN        DEFAULT FALSE,

  -- AGGREGATE METRICS (updated nightly from audit cases)
  total_audits            INTEGER        DEFAULT 0,
  total_violations_found  INTEGER        DEFAULT 0,
  violation_rate_pct      NUMERIC(6,3)   DEFAULT 0,
  -- violations_found / total_audits * 100

  avg_overcharge_amount   NUMERIC(12,2)  DEFAULT 0,
  total_overcharge_amount NUMERIC(15,2)  DEFAULT 0,
  median_overcharge_amount NUMERIC(12,2) DEFAULT 0,

  respa_violation_count   INTEGER        DEFAULT 0,
  trid_violation_count    INTEGER        DEFAULT 0,
  appraisal_fraud_count   INTEGER        DEFAULT 0,
  escrow_abuse_count      INTEGER        DEFAULT 0,
  force_insurance_count   INTEGER        DEFAULT 0,
  title_defect_count      INTEGER        DEFAULT 0,
  servicer_error_count    INTEGER        DEFAULT 0,

  -- RISK TIER (AuditDNA proprietary scoring)
  risk_tier               VARCHAR(10)    DEFAULT 'UNKNOWN',
  -- 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'CLEAN' | 'UNKNOWN'
  risk_score              NUMERIC(5,2)   DEFAULT 0,   -- 0-100

  -- ENFORCEMENT FLAG
  flagged_for_enforcement BOOLEAN        DEFAULT FALSE,
  enforcement_flag_reason TEXT,
  enforcement_flagged_at  TIMESTAMPTZ,

  first_audit_date        DATE,
  last_audit_date         DATE,
  created_at              TIMESTAMPTZ    DEFAULT NOW(),
  updated_at              TIMESTAMPTZ    DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- SECTION 3: VIOLATION PATTERN RECORDS
-- One row per anonymized audit case.
-- NO consumer PII. Case is identified only by token.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reg_violation_records (
  id                      SERIAL PRIMARY KEY,
  case_token              VARCHAR(64)   UNIQUE NOT NULL,
  -- SHA-256 hash of internal case_id — non-reversible

  -- LENDER (token only — no name)
  lender_token            VARCHAR(64)   REFERENCES reg_lender_registry(lender_token),
  nmls_number             VARCHAR(20),

  -- LOAN CHARACTERISTICS (no PII)
  loan_year               SMALLINT,      -- origination year
  loan_quarter            SMALLINT,      -- 1-4
  loan_type               VARCHAR(30),
  -- '30yr_fixed' | '15yr_fixed' | '5/1_arm' | 'fha' | 'va' | 'usda' | 'jumbo' | 'heloc'

  loan_purpose            VARCHAR(30),
  -- 'purchase' | 'refinance' | 'cash_out_refi' | 'construction' | 'heloc'

  property_state          VARCHAR(2),
  property_type           VARCHAR(30),
  -- 'sfr' | 'condo' | 'multi_2_4' | 'multi_5plus' | 'commercial' | 'mixed_use' | 'agricultural'

  ownership_type          VARCHAR(20),
  -- 'individual' | 'llc' | 'corporation' | 'trust' | 'partnership'

  -- LOAN AMOUNTS (bucketed to prevent re-identification)
  loan_amount_bucket      VARCHAR(20),
  -- '<100k' | '100k-200k' | '200k-400k' | '400k-750k' | '750k-1m' | '1m-2m' | '2m+'

  -- VIOLATIONS FOUND
  violation_types         TEXT[]         DEFAULT '{}',
  violation_count         INTEGER        DEFAULT 0,
  violation_severity      VARCHAR(10),
  -- 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'

  has_respa_violation     BOOLEAN        DEFAULT FALSE,
  has_trid_violation      BOOLEAN        DEFAULT FALSE,
  has_appraisal_fraud     BOOLEAN        DEFAULT FALSE,
  has_escrow_abuse        BOOLEAN        DEFAULT FALSE,
  has_force_insurance     BOOLEAN        DEFAULT FALSE,
  has_title_defect        BOOLEAN        DEFAULT FALSE,
  has_servicer_error      BOOLEAN        DEFAULT FALSE,
  has_nod                 BOOLEAN        DEFAULT FALSE,  -- Notice of Default active

  -- FINANCIAL OVERCHARGE DATA
  overcharge_amount_bucket VARCHAR(20),
  -- '<1k' | '1k-5k' | '5k-15k' | '15k-30k' | '30k-75k' | '75k-150k' | '150k+'

  overcharge_confirmed    BOOLEAN        DEFAULT FALSE,
  recovery_path           VARCHAR(20),
  -- 'escrow' | 'attorney' | 'portfolio' | 'pending'

  recovery_outcome        VARCHAR(20),
  -- 'settled' | 'judgment' | 'pending' | 'no_recovery' | 'dismissed'

  -- AUDIT METADATA
  audit_year              SMALLINT,
  audit_quarter           SMALLINT,
  audit_score             SMALLINT,      -- 0-100 case severity score
  processing_time_hours   NUMERIC(6,2),  -- how long audit took

  -- GEOGRAPHIC (county-level only — not full address)
  property_county_fips    VARCHAR(5),    -- FIPS county code (public data)
  property_state_fips     VARCHAR(2),    -- state FIPS

  -- FLAGS FOR REGULATOR FEEDS
  is_enforcement_lead     BOOLEAN        DEFAULT FALSE,
  is_pattern_case         BOOLEAN        DEFAULT FALSE,
  -- TRUE if this lender has 3+ similar violations

  created_at              TIMESTAMPTZ    DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- SECTION 4: GEOGRAPHIC HEATMAP DATA
-- Pre-aggregated geographic violation density — no PII possible
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reg_geographic_stats (
  id                      SERIAL PRIMARY KEY,
  state_fips              VARCHAR(2)    NOT NULL,
  state_code              VARCHAR(2)    NOT NULL,
  county_fips             VARCHAR(5),    -- NULL = state-level aggregate
  county_name             VARCHAR(100),

  period_year             SMALLINT      NOT NULL,
  period_quarter          SMALLINT,      -- NULL = annual aggregate

  -- VOLUME
  total_audits            INTEGER        DEFAULT 0,
  total_violations        INTEGER        DEFAULT 0,
  violation_rate_pct      NUMERIC(6,3)   DEFAULT 0,
  unique_lenders_audited  INTEGER        DEFAULT 0,

  -- VIOLATION BREAKDOWN
  respa_violations        INTEGER        DEFAULT 0,
  trid_violations         INTEGER        DEFAULT 0,
  appraisal_fraud_cases   INTEGER        DEFAULT 0,
  escrow_abuse_cases      INTEGER        DEFAULT 0,
  force_insurance_cases   INTEGER        DEFAULT 0,
  servicer_error_cases    INTEGER        DEFAULT 0,

  -- FINANCIAL
  avg_overcharge_amount   NUMERIC(12,2)  DEFAULT 0,
  total_overcharge_amount NUMERIC(15,2)  DEFAULT 0,
  median_overcharge_amount NUMERIC(12,2) DEFAULT 0,

  -- LOAN TYPE DISTRIBUTION
  pct_purchase_loans      NUMERIC(5,2)   DEFAULT 0,
  pct_refinance_loans     NUMERIC(5,2)   DEFAULT 0,
  pct_fha_loans           NUMERIC(5,2)   DEFAULT 0,
  pct_va_loans            NUMERIC(5,2)   DEFAULT 0,
  pct_jumbo_loans         NUMERIC(5,2)   DEFAULT 0,

  -- PROPERTY TYPE DISTRIBUTION
  pct_sfr                 NUMERIC(5,2)   DEFAULT 0,
  pct_condo               NUMERIC(5,2)   DEFAULT 0,
  pct_multi_family        NUMERIC(5,2)   DEFAULT 0,
  pct_commercial          NUMERIC(5,2)   DEFAULT 0,

  -- RISK CONCENTRATION
  high_risk_lender_count  INTEGER        DEFAULT 0,
  enforcement_leads       INTEGER        DEFAULT 0,
  -- # of cases flagged for potential regulatory action

  created_at              TIMESTAMPTZ    DEFAULT NOW(),
  updated_at              TIMESTAMPTZ    DEFAULT NOW(),

  UNIQUE(state_fips, county_fips, period_year, period_quarter)
);

-- ════════════════════════════════════════════════════════════
-- SECTION 5: LENDER RANKINGS (REGULATORY FEED)
-- Ranked lender performance by violation metrics.
-- Published to regulators as enforcement prioritization data.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reg_lender_rankings (
  id                      SERIAL PRIMARY KEY,
  ranking_period          VARCHAR(10)   NOT NULL,  -- '2026-Q1', '2025-ANNUAL'
  ranking_type            VARCHAR(50)   NOT NULL,
  -- 'national_violation_rate' | 'state_violation_rate' | 'overcharge_volume'
  -- | 'respa_violations' | 'trid_violations' | 'enforcement_priority'

  jurisdiction            VARCHAR(5)    DEFAULT 'US',  -- 'US' or state code

  rank_position           INTEGER       NOT NULL,
  lender_token            VARCHAR(64)   REFERENCES reg_lender_registry(lender_token),
  nmls_number             VARCHAR(20),

  -- METRICS FOR THIS RANKING PERIOD
  period_audit_count      INTEGER        DEFAULT 0,
  period_violation_count  INTEGER        DEFAULT 0,
  period_violation_rate   NUMERIC(6,3)   DEFAULT 0,
  period_overcharge_total NUMERIC(15,2)  DEFAULT 0,
  period_avg_overcharge   NUMERIC(12,2)  DEFAULT 0,

  respa_count             INTEGER        DEFAULT 0,
  trid_count              INTEGER        DEFAULT 0,
  appraisal_fraud_count   INTEGER        DEFAULT 0,

  risk_tier               VARCHAR(10),
  risk_score              NUMERIC(5,2),

  -- TREND VS PRIOR PERIOD
  rank_change             INTEGER        DEFAULT 0,  -- positive = worsened ranking
  violation_rate_change   NUMERIC(6,3)   DEFAULT 0,
  trend                   VARCHAR(10),
  -- 'WORSENING' | 'IMPROVING' | 'STABLE' | 'NEW'

  enforcement_recommended BOOLEAN        DEFAULT FALSE,

  created_at              TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE(ranking_period, ranking_type, jurisdiction, rank_position)
);

-- ════════════════════════════════════════════════════════════
-- SECTION 6: MARKET RATE & FEE BENCHMARKS
-- What fees SHOULD be vs. what lenders charged.
-- Invaluable for CFPB fee reasonableness guidance.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reg_fee_benchmarks (
  id                      SERIAL PRIMARY KEY,
  period_year             SMALLINT      NOT NULL,
  period_quarter          SMALLINT      NOT NULL,
  state_code              VARCHAR(2)    NOT NULL,   -- 'US' for national
  loan_type               VARCHAR(30)   NOT NULL,
  fee_category            VARCHAR(60)   NOT NULL,
  -- 'origination_fee' | 'appraisal_fee' | 'title_insurance' | 'escrow_fee'
  -- | 'recording_fee' | 'doc_prep_fee' | 'processing_fee' | 'underwriting_fee'
  -- | 'credit_report_fee' | 'flood_cert_fee' | 'survey_fee' | 'total_closing_costs'

  -- OBSERVED AMOUNTS (from AuditDNA audits)
  sample_size             INTEGER        DEFAULT 0,
  fee_min                 NUMERIC(10,2)  DEFAULT 0,
  fee_p25                 NUMERIC(10,2)  DEFAULT 0,  -- 25th percentile
  fee_median              NUMERIC(10,2)  DEFAULT 0,
  fee_p75                 NUMERIC(10,2)  DEFAULT 0,  -- 75th percentile
  fee_p90                 NUMERIC(10,2)  DEFAULT 0,  -- 90th percentile
  fee_max                 NUMERIC(10,2)  DEFAULT 0,
  fee_avg                 NUMERIC(10,2)  DEFAULT 0,

  -- OVERCHARGE ANALYSIS
  pct_overcharged         NUMERIC(5,2)   DEFAULT 0,  -- % of loans with fee above p90
  avg_overcharge_when_over NUMERIC(10,2) DEFAULT 0,  -- avg excess when overcharged
  max_overcharge_observed  NUMERIC(10,2) DEFAULT 0,

  -- REGULATORY BENCHMARK
  cfpb_guidance_amount    NUMERIC(10,2),  -- CFPB published reasonable amount if available
  hud_guidance_amount     NUMERIC(10,2),  -- HUD guidance if applicable
  variance_from_guidance  NUMERIC(10,2),  -- median vs. guidance

  created_at              TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE(period_year, period_quarter, state_code, loan_type, fee_category)
);

-- ════════════════════════════════════════════════════════════
-- SECTION 7: SERVICER PERFORMANCE DATA
-- Separate from originators — servicer errors are a major
-- CFPB enforcement area (RESPA Section 6, payment posting,
-- force-placed insurance, loss mitigation failures)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reg_servicer_performance (
  id                      SERIAL PRIMARY KEY,
  servicer_token          VARCHAR(64)   NOT NULL,
  nmls_number             VARCHAR(20),
  period_year             SMALLINT      NOT NULL,
  period_quarter          SMALLINT,

  -- VOLUME
  total_loans_serviced_bucket VARCHAR(20),
  -- '<1k' | '1k-10k' | '10k-50k' | '50k-100k' | '100k-500k' | '500k+'
  audits_involving_servicer INTEGER      DEFAULT 0,

  -- VIOLATION CATEGORIES
  payment_posting_errors  INTEGER        DEFAULT 0,
  escrow_mismanagement    INTEGER        DEFAULT 0,
  force_insurance_improperly_placed INTEGER DEFAULT 0,
  loss_mitigation_failures INTEGER       DEFAULT 0,
  communication_failures  INTEGER        DEFAULT 0,
  fee_assessment_errors   INTEGER        DEFAULT 0,

  total_servicer_violations INTEGER      DEFAULT 0,
  servicer_violation_rate NUMERIC(6,3)   DEFAULT 0,

  -- FINANCIAL IMPACT
  avg_consumer_harm_amount NUMERIC(12,2) DEFAULT 0,
  total_consumer_harm_estimate NUMERIC(15,2) DEFAULT 0,

  -- CFPB COMPLAINT CORRELATION
  cfpb_complaint_volume_index NUMERIC(6,2),
  -- Normalized index correlating AuditDNA findings with public CFPB complaint data

  risk_tier               VARCHAR(10),
  enforcement_recommended BOOLEAN        DEFAULT FALSE,

  created_at              TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE(servicer_token, period_year, period_quarter)
);

-- ════════════════════════════════════════════════════════════
-- SECTION 8: ENFORCEMENT LEADS QUEUE
-- High-confidence cases where AuditDNA findings suggest
-- regulatory action may be warranted. Shared with regulators
-- as anonymized enforcement intelligence.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reg_enforcement_leads (
  id                      SERIAL PRIMARY KEY,
  lead_token              VARCHAR(64)   UNIQUE NOT NULL,
  generated_at            TIMESTAMPTZ   DEFAULT NOW(),

  -- SUBJECT (no PII — tokens and NMLS only)
  lead_type               VARCHAR(30)   NOT NULL,
  -- 'lender_pattern' | 'servicer_pattern' | 'appraisal_fraud_network'
  -- | 'fee_scheme' | 'title_fraud_ring' | 'systematic_escrow_abuse'

  lender_token            VARCHAR(64),
  nmls_number             VARCHAR(20),
  servicer_token          VARCHAR(64),

  jurisdiction            VARCHAR(2),    -- state or 'US'
  lead_strength           VARCHAR(10)   NOT NULL,
  -- 'STRONG' | 'MODERATE' | 'PRELIMINARY'

  -- PATTERN DATA
  case_count              INTEGER        DEFAULT 0,
  -- # of AuditDNA cases supporting this lead

  pattern_description     TEXT           NOT NULL,
  -- Describes the violation pattern without identifying consumers.
  -- e.g. "Lender token ABC123 shows RESPA Section 8 violations in 73% of
  -- audited loans originated 2022-2024 in CA/NV. Avg overcharge $4,200.
  -- Pattern consistent with undisclosed yield spread premium scheme."

  violation_types         TEXT[]         DEFAULT '{}',
  estimated_consumer_harm NUMERIC(15,2),
  -- Aggregate estimated harm across all cases in pattern

  loan_year_range_start   SMALLINT,
  loan_year_range_end     SMALLINT,
  geographic_concentration TEXT[],       -- state codes where pattern concentrated

  -- CORROBORATING DATA
  cfpb_complaints_correlated BOOLEAN     DEFAULT FALSE,
  public_enforcement_history BOOLEAN     DEFAULT FALSE,
  -- TRUE if this entity has prior public enforcement actions

  -- STATUS
  status                  VARCHAR(20)   DEFAULT 'new',
  -- 'new' | 'transmitted' | 'under_review' | 'closed' | 'action_taken'
  transmitted_to          TEXT[],        -- which licensee codes received this lead
  transmitted_at          TIMESTAMPTZ,
  outcome_notes           TEXT,

  expires_at              TIMESTAMPTZ,   -- leads expire if not actioned
  created_at              TIMESTAMPTZ    DEFAULT NOW(),
  updated_at              TIMESTAMPTZ    DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- SECTION 9: DATA QUERY LOG
-- Tracks every query regulators run against the data API.
-- Required for FCRA compliance and billing (per-query plans).
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reg_query_log (
  id                      BIGSERIAL PRIMARY KEY,
  licensee_code           VARCHAR(30)   NOT NULL,
  query_timestamp         TIMESTAMPTZ   DEFAULT NOW(),
  query_type              VARCHAR(50)   NOT NULL,
  -- 'lender_lookup' | 'geographic_heatmap' | 'fee_benchmarks'
  -- | 'enforcement_leads' | 'violation_patterns' | 'servicer_report'
  -- | 'custom_aggregate' | 'bulk_export'

  query_parameters        JSONB,         -- what filters they applied
  records_returned        INTEGER,
  query_duration_ms       INTEGER,
  api_version             VARCHAR(10)   DEFAULT 'v1',
  ip_address              INET,
  response_code           SMALLINT,
  billed                  BOOLEAN        DEFAULT FALSE,
  billing_amount          NUMERIC(8,2)   DEFAULT 0
);

-- ════════════════════════════════════════════════════════════
-- SECTION 10: MARKET EFFICIENCY METRICS
-- Macro-level data measuring mortgage market health.
-- Sold to GSEs (Fannie/Freddie), policy researchers, HUD.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reg_market_efficiency (
  id                      SERIAL PRIMARY KEY,
  period_year             SMALLINT      NOT NULL,
  period_quarter          SMALLINT      NOT NULL,
  geographic_scope        VARCHAR(5)    NOT NULL,  -- 'US', state code, or MSA code

  -- MARKET HEALTH SCORES (AuditDNA proprietary indices)
  market_integrity_score  NUMERIC(5,2),   -- 0-100, higher = more compliant market
  consumer_protection_score NUMERIC(5,2), -- 0-100
  fee_transparency_score  NUMERIC(5,2),   -- 0-100
  lender_accountability_score NUMERIC(5,2), -- 0-100

  -- VOLUME METRICS
  total_audits_period     INTEGER        DEFAULT 0,
  violation_rate_period   NUMERIC(6,3)   DEFAULT 0,
  clean_loan_rate_period  NUMERIC(6,3)   DEFAULT 0,

  -- FINANCIAL METRICS
  total_consumer_overcharges NUMERIC(15,2) DEFAULT 0,
  avg_overcharge_per_loan NUMERIC(12,2)   DEFAULT 0,
  recovery_rate_pct       NUMERIC(6,3)    DEFAULT 0,
  -- % of identified overcharges where consumer recovered funds

  -- TREND INDICATORS
  violation_rate_vs_prior_qtr NUMERIC(6,3) DEFAULT 0,  -- positive = worsening
  yoy_violation_change    NUMERIC(6,3)   DEFAULT 0,

  -- LENDER ECOSYSTEM
  total_active_lenders    INTEGER        DEFAULT 0,
  high_risk_lender_pct    NUMERIC(5,2)   DEFAULT 0,
  new_violators_this_period INTEGER       DEFAULT 0,
  improved_lenders_count  INTEGER        DEFAULT 0,

  -- LOAN PRODUCT MIX (market composition)
  fha_loan_violation_rate NUMERIC(6,3)   DEFAULT 0,
  conventional_violation_rate NUMERIC(6,3) DEFAULT 0,
  va_loan_violation_rate  NUMERIC(6,3)   DEFAULT 0,
  jumbo_violation_rate    NUMERIC(6,3)   DEFAULT 0,

  created_at              TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE(period_year, period_quarter, geographic_scope)
);

-- ════════════════════════════════════════════════════════════
-- SECTION 11: DATA PIPELINE — NIGHTLY AGGREGATION JOB LOG
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reg_pipeline_log (
  id                      SERIAL PRIMARY KEY,
  job_name                VARCHAR(100)  NOT NULL,
  started_at              TIMESTAMPTZ   DEFAULT NOW(),
  completed_at            TIMESTAMPTZ,
  status                  VARCHAR(20)   DEFAULT 'running',
  records_processed       INTEGER        DEFAULT 0,
  records_updated         INTEGER        DEFAULT 0,
  records_inserted        INTEGER        DEFAULT 0,
  errors_encountered      INTEGER        DEFAULT 0,
  error_log               TEXT,
  period_covered          VARCHAR(10),
  triggered_by            VARCHAR(50)    DEFAULT 'scheduled',
  duration_seconds        INTEGER,
  notes                   TEXT
);

-- ════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_reg_violations_lender      ON reg_violation_records(lender_token);
CREATE INDEX IF NOT EXISTS idx_reg_violations_state       ON reg_violation_records(property_state);
CREATE INDEX IF NOT EXISTS idx_reg_violations_year        ON reg_violation_records(audit_year, audit_quarter);
CREATE INDEX IF NOT EXISTS idx_reg_violations_type        ON reg_violation_records USING GIN(violation_types);
CREATE INDEX IF NOT EXISTS idx_reg_violations_enforcement ON reg_violation_records(is_enforcement_lead) WHERE is_enforcement_lead = TRUE;
CREATE INDEX IF NOT EXISTS idx_reg_violations_fips        ON reg_violation_records(property_county_fips);
CREATE INDEX IF NOT EXISTS idx_reg_lender_risk            ON reg_lender_registry(risk_tier, violation_rate_pct DESC);
CREATE INDEX IF NOT EXISTS idx_reg_lender_nmls            ON reg_lender_registry(nmls_number);
CREATE INDEX IF NOT EXISTS idx_reg_lender_flag            ON reg_lender_registry(flagged_for_enforcement) WHERE flagged_for_enforcement = TRUE;
CREATE INDEX IF NOT EXISTS idx_reg_geo_state_period       ON reg_geographic_stats(state_code, period_year, period_quarter);
CREATE INDEX IF NOT EXISTS idx_reg_geo_county             ON reg_geographic_stats(county_fips);
CREATE INDEX IF NOT EXISTS idx_reg_rankings_period        ON reg_lender_rankings(ranking_period, ranking_type, jurisdiction);
CREATE INDEX IF NOT EXISTS idx_reg_enforcement_status     ON reg_enforcement_leads(status, lead_strength);
CREATE INDEX IF NOT EXISTS idx_reg_enforcement_lender     ON reg_enforcement_leads(lender_token);
CREATE INDEX IF NOT EXISTS idx_reg_query_log_licensee     ON reg_query_log(licensee_code, query_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reg_market_period          ON reg_market_efficiency(period_year, period_quarter, geographic_scope);
CREATE INDEX IF NOT EXISTS idx_reg_fee_benchmarks_lookup  ON reg_fee_benchmarks(period_year, period_quarter, state_code, loan_type);

-- ════════════════════════════════════════════════════════════
-- SEED: INITIAL LICENSEE PROSPECTS
-- ════════════════════════════════════════════════════════════
INSERT INTO data_licensees (
  licensee_code, agency_name, agency_type, jurisdiction,
  contract_type, data_feeds_licensed, active, notes
) VALUES
(
  'CFPB-PROSPECT',
  'Consumer Financial Protection Bureau',
  'federal_regulator', 'federal',
  'annual_license',
  ARRAY['violation_patterns','lender_rankings','enforcement_leads','fee_benchmarks','servicer_performance','market_efficiency'],
  FALSE,
  'Primary federal target. CFPB buys market data for supervision and rulemaking. Contact: Office of Research. Budget cycle: Oct fiscal year start. Key hook: enforcement_leads feed directly supports their supervisory exam process. Estimated contract value: $250K-$750K/yr.'
),
(
  'HUD-PROSPECT',
  'U.S. Department of Housing and Urban Development',
  'federal_regulator', 'federal',
  'annual_license',
  ARRAY['violation_patterns','geographic_heatmaps','fee_benchmarks','market_efficiency'],
  FALSE,
  'HUD RESPA enforcement division. Interested in geographic concentration of RESPA violations and fee overcharge patterns for FHA loan policy. Contact: Office of Housing. Estimated contract value: $150K-$400K/yr.'
),
(
  'FHFA-PROSPECT',
  'Federal Housing Finance Agency',
  'federal_regulator', 'federal',
  'annual_license',
  ARRAY['lender_rankings','servicer_performance','market_efficiency'],
  FALSE,
  'FHFA regulates Fannie/Freddie. Servicer performance data and lender risk scores directly relevant to their conservatorship supervision. Contact: Division of Housing Mission & Goals.'
),
(
  'FNMA-PROSPECT',
  'Federal National Mortgage Association (Fannie Mae)',
  'gse', 'federal',
  'per_query',
  ARRAY['lender_rankings','servicer_performance'],
  FALSE,
  'GSE. Lender risk scoring data supports their seller/servicer eligibility decisions. High value — can purchase lender risk tier data to flag counterparty risk.'
),
(
  'FHLMC-PROSPECT',
  'Federal Home Loan Mortgage Corporation (Freddie Mac)',
  'gse', 'federal',
  'per_query',
  ARRAY['lender_rankings','servicer_performance'],
  FALSE,
  'GSE. Same use case as Fannie Mae. Lender and servicer risk data for counterparty management.'
),
(
  'CA-DFPI-PROSPECT',
  'California Department of Financial Protection and Innovation',
  'state_regulator', 'CA',
  'annual_license',
  ARRAY['violation_patterns','lender_rankings','geographic_heatmaps','enforcement_leads'],
  FALSE,
  'California state regulator. AuditDNA has strong CA case volume. CA violation data is most mature. First state target — highest probability of early contract. Estimated contract value: $75K-$200K/yr.'
),
(
  'TX-DOB-PROSPECT',
  'Texas Department of Banking',
  'state_regulator', 'TX',
  'annual_license',
  ARRAY['violation_patterns','lender_rankings','geographic_heatmaps'],
  FALSE,
  'Texas is #2 mortgage market nationally. High value target. Contact: Mortgage Banker Division.'
),
(
  'FL-OFR-PROSPECT',
  'Florida Office of Financial Regulation',
  'state_regulator', 'FL',
  'annual_license',
  ARRAY['violation_patterns','lender_rankings','geographic_heatmaps','enforcement_leads'],
  FALSE,
  'Florida has high mortgage fraud historically. OFR would value enforcement_leads and lender rankings.'
),
(
  'NY-DFS-PROSPECT',
  'New York State Department of Financial Services',
  'state_regulator', 'NY',
  'annual_license',
  ARRAY['violation_patterns','lender_rankings','fee_benchmarks','enforcement_leads'],
  FALSE,
  'One of the most aggressive state regulators in the country. High budget, high appetite for enforcement data. Premium contract potential: $100K-$300K/yr.'
);

-- ════════════════════════════════════════════════════════════
-- VIEWS FOR REGULATORY DATA API
-- ════════════════════════════════════════════════════════════

-- Top 25 highest-risk lenders nationally
CREATE OR REPLACE VIEW v_reg_top_risk_lenders AS
SELECT
  lr.lender_token, lr.nmls_number, lr.lender_type,
  lr.headquarter_state, lr.risk_tier, lr.risk_score,
  lr.total_audits, lr.total_violations_found,
  lr.violation_rate_pct, lr.avg_overcharge_amount,
  lr.total_overcharge_amount, lr.respa_violation_count,
  lr.trid_violation_count, lr.appraisal_fraud_count,
  lr.flagged_for_enforcement, lr.last_audit_date
FROM reg_lender_registry lr
WHERE lr.total_audits >= 3
ORDER BY lr.risk_score DESC, lr.violation_rate_pct DESC
LIMIT 25;

-- State-level violation summary
CREATE OR REPLACE VIEW v_reg_state_summary AS
SELECT
  gs.state_code, gs.period_year, gs.period_quarter,
  gs.total_audits, gs.total_violations, gs.violation_rate_pct,
  gs.avg_overcharge_amount, gs.total_overcharge_amount,
  gs.respa_violations, gs.trid_violations,
  gs.appraisal_fraud_cases, gs.enforcement_leads
FROM reg_geographic_stats gs
WHERE gs.county_fips IS NULL
ORDER BY gs.state_code, gs.period_year DESC, gs.period_quarter DESC;

-- Active enforcement leads
CREATE OR REPLACE VIEW v_reg_active_enforcement_leads AS
SELECT
  el.lead_token, el.lead_type, el.lender_token, el.nmls_number,
  el.jurisdiction, el.lead_strength, el.case_count,
  el.pattern_description, el.violation_types,
  el.estimated_consumer_harm, el.loan_year_range_start,
  el.loan_year_range_end, el.geographic_concentration,
  el.cfpb_complaints_correlated, el.generated_at
FROM reg_enforcement_leads el
WHERE el.status IN ('new','transmitted')
  AND el.lead_strength IN ('STRONG','MODERATE')
ORDER BY el.lead_strength DESC, el.estimated_consumer_harm DESC NULLS LAST;

-- ════════════════════════════════════════════════════════════
-- VERIFY
-- ════════════════════════════════════════════════════════════
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE 'reg_%' OR table_name = 'data_licensees')
ORDER BY table_name;

SELECT licensee_code, agency_name, jurisdiction, array_length(data_feeds_licensed,1) AS feeds
FROM data_licensees ORDER BY agency_type, jurisdiction;