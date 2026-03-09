CREATE TABLE IF NOT EXISTS ag_contacts (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(255),
  title VARCHAR(150),
  track CHAR(1) DEFAULT 'A',
  tier INTEGER DEFAULT 1,
  crop_type VARCHAR(100),
  acres_irrigated NUMERIC(10,2),
  state VARCHAR(50),
  country VARCHAR(50) DEFAULT 'USA',
  language CHAR(2) DEFAULT 'en',
  source VARCHAR(100),
  opted_out BOOLEAN DEFAULT FALSE,
  opted_out_at TIMESTAMP,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agrimaxx_campaigns (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  track CHAR(1),
  sequence_day INTEGER DEFAULT 0,
  subject_en VARCHAR(500),
  subject_es VARCHAR(500),
  template_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Ready',
  total_sent INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agrimaxx_optouts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  opted_out_at TIMESTAMP DEFAULT NOW(),
  reason VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS agrimaxx_send_log (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(20),
  contact_id INTEGER,
  email VARCHAR(255),
  subject VARCHAR(500),
  sent_at TIMESTAMP DEFAULT NOW(),
  bounced BOOLEAN DEFAULT FALSE,
  error TEXT
);

SELECT 'Tables created OK' AS result;