-- price_predictions.sql
-- Save to: C:\AuditDNA\backend\migrations\price_predictions.sql
-- Run on local + Railway:
--   psql -h hopper.proxy.rlwy.net -p 55424 -U postgres -d railway -f price_predictions.sql
--   psql -U postgres -d auditdna -f price_predictions.sql
-- Sprint D - Apr 26 2026
-- Idempotent. Safe to re-run.

CREATE TABLE IF NOT EXISTS price_predictions (
  id              SERIAL PRIMARY KEY,
  predicted_at    TIMESTAMP DEFAULT NOW(),
  commodity_id    TEXT,
  commodity_name  TEXT,
  origin          TEXT,
  market_level    TEXT,
  horizon_days    INT,
  target_date     DATE,
  predicted_price DECIMAL(10,2),
  confidence_pct  INT,
  range_low       DECIMAL(10,2),
  range_high      DECIMAL(10,2),
  reasoning       TEXT,
  factors         JSONB,
  data_sources    JSONB,
  claude_model    TEXT,
  user_id         INT,

  -- Accuracy tracking (filled after target_date arrives)
  actual_price    DECIMAL(10,2),
  variance_pct    DECIMAL(6,2),
  evaluated_at    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pp_target_date  ON price_predictions(target_date);
CREATE INDEX IF NOT EXISTS idx_pp_commodity    ON price_predictions(commodity_id);
CREATE INDEX IF NOT EXISTS idx_pp_predicted_at ON price_predictions(predicted_at DESC);

-- View: prediction accuracy report (rolls up evaluated predictions)
CREATE OR REPLACE VIEW v_price_prediction_accuracy AS
SELECT
  commodity_name,
  market_level,
  COUNT(*) AS predictions,
  COUNT(actual_price) AS evaluated,
  AVG(ABS(variance_pct))::DECIMAL(6,2) AS avg_abs_variance_pct,
  AVG(confidence_pct)::INT AS avg_confidence_pct,
  MIN(predicted_at) AS first_prediction,
  MAX(predicted_at) AS last_prediction
FROM price_predictions
WHERE actual_price IS NOT NULL
GROUP BY commodity_name, market_level
ORDER BY predictions DESC;

COMMENT ON TABLE price_predictions IS 'Sprint D - AI price forecasts logged for later accuracy auditing';
COMMENT ON COLUMN price_predictions.factors IS 'JSON array of {label, value, direction, note}';
COMMENT ON COLUMN price_predictions.data_sources IS 'JSON array of source names used';
COMMENT ON COLUMN price_predictions.variance_pct IS '((actual - predicted) / predicted) * 100, signed';
