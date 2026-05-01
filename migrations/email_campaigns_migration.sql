-- ============================================================================
-- EMAIL CAMPAIGNS - Recurring scheduled blasts
-- File: C:\AuditDNA\backend\migrations\email_campaigns_migration.sql
-- Apr 29 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_campaigns (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  commodity       VARCHAR(80)  NOT NULL,
  variant         VARCHAR(40)  NOT NULL DEFAULT 'fresh',
  -- recipient targeting
  filter_country  VARCHAR(60),
  filter_states   TEXT[],
  filter_clause   TEXT NOT NULL,
  -- email content
  subject_en      TEXT NOT NULL,
  subject_es      TEXT NOT NULL,
  template_en     TEXT NOT NULL,
  template_es     TEXT NOT NULL,
  sender_email    VARCHAR(150) NOT NULL DEFAULT 'sgarcia1911@gmail.com',
  sender_name     VARCHAR(150) NOT NULL DEFAULT 'Saul Garcia - Mexausa Food Group',
  reply_to        VARCHAR(150) NOT NULL DEFAULT 'saul@mexausafg.com',
  -- schedule
  schedule_days   INT[]        NOT NULL DEFAULT ARRAY[2,5],
  schedule_hour   INT          NOT NULL DEFAULT 7,
  schedule_minute INT          NOT NULL DEFAULT 0,
  schedule_tz     VARCHAR(60)  NOT NULL DEFAULT 'America/Los_Angeles',
  -- state
  status          VARCHAR(20)  NOT NULL DEFAULT 'active',
  last_run_at     TIMESTAMP,
  next_run_at     TIMESTAMP,
  total_sends     INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by      VARCHAR(80),
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status   ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_next_run ON email_campaigns(next_run_at) WHERE status='active';

CREATE TABLE IF NOT EXISTS email_campaign_sends (
  id              SERIAL PRIMARY KEY,
  campaign_id     INT NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  buyer_id        INT,
  recipient_email VARCHAR(150) NOT NULL,
  subject         TEXT,
  status          VARCHAR(20)  NOT NULL DEFAULT 'queued',
  message_id      TEXT,
  error           TEXT,
  sent_at         TIMESTAMP,
  opened_at       TIMESTAMP,
  clicked_at      TIMESTAMP,
  bounced_at      TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_campaign_sends_campaign ON email_campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_sends_status   ON email_campaign_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_campaign_sends_email    ON email_campaign_sends(recipient_email);

-- Avocado Fresh seed campaign
INSERT INTO email_campaigns
  (name, commodity, variant, filter_country, filter_states, filter_clause,
   subject_en, subject_es, template_en, template_es,
   schedule_days, schedule_hour, created_by)
VALUES (
  'Avocado Fresh - USA',
  'Avocado',
  'fresh',
  'USA',
  ARRAY['California'],
  'product_specialties ILIKE ''%avocado%'' AND country = ''USA''',
  'Hass Avocado Availability - This Week from Mexausa Food Group',
  'Disponibilidad Aguacate Hass - Esta Semana de Mexausa Food Group',
  'avocado-fresh-en',
  'avocado-fresh-es',
  ARRAY[2,5],
  7,
  'saul'
)
ON CONFLICT DO NOTHING;

-- Avocado Frozen seed campaign
INSERT INTO email_campaigns
  (name, commodity, variant, filter_country, filter_states, filter_clause,
   subject_en, subject_es, template_en, template_es,
   schedule_days, schedule_hour, created_by)
VALUES (
  'Avocado Frozen IQF - USA',
  'Avocado',
  'frozen',
  'USA',
  ARRAY['California'],
  'product_specialties ILIKE ''%avocado%'' AND country = ''USA''',
  'Frozen IQF Hass Avocado - Year-Round Supply from Mexausa Food Group',
  'Aguacate Hass Congelado IQF - Suministro Todo el Ano de Mexausa Food Group',
  'avocado-frozen-en',
  'avocado-frozen-es',
  ARRAY[3,6],
  7,
  'saul'
)
ON CONFLICT DO NOTHING;

SELECT id, name, commodity, variant, filter_country, schedule_days, schedule_hour, status
FROM email_campaigns
ORDER BY id;
