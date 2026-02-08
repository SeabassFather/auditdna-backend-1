-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║  AUDITDNA - MASTER CONTACTS TABLE                                             ║
-- ║  Consolidate ALL contacts into PostgreSQL                                     ║
-- ║  15,379 MongoDB + 5,001 Growers + 3,000 Buyers = ONE SOURCE OF TRUTH         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Create master contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(100) UNIQUE,
    client_type VARCHAR(50) NOT NULL DEFAULT 'contact',
    company_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    
    -- Contact Person
    contact_first_name VARCHAR(100),
    contact_last_name VARCHAR(100),
    contact_title VARCHAR(100),
    primary_contact VARCHAR(255),
    
    -- Communication
    email VARCHAR(255),
    phone VARCHAR(50),
    phone_2 VARCHAR(50),
    fax VARCHAR(50),
    website VARCHAR(255),
    
    -- Address
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_country VARCHAR(100) DEFAULT 'USA',
    address_postal_code VARCHAR(20),
    
    -- Business Info
    tax_id VARCHAR(50),
    paca_license VARCHAR(50),
    certifications JSONB DEFAULT '[]',
    active_contracts JSONB DEFAULT '[]',
    product_specialties TEXT,
    annual_volume_usd BIGINT,
    credit_limit NUMERIC(12,2),
    credit_rating VARCHAR(10),
    payment_terms VARCHAR(50),
    
    -- Source tracking
    source VARCHAR(50) DEFAULT 'MANUAL',
    source_database VARCHAR(50),
    original_id VARCHAR(255),
    
    -- CRM Fields
    lead_temperature VARCHAR(20) DEFAULT 'COLD',
    lead_status VARCHAR(20) DEFAULT 'NEW',
    lead_score INTEGER DEFAULT 0,
    assigned_to INTEGER,
    next_follow_up DATE,
    last_contacted_at TIMESTAMP,
    
    -- Opt-out
    email_opt_out BOOLEAN DEFAULT FALSE,
    phone_opt_out BOOLEAN DEFAULT FALSE,
    mail_opt_out BOOLEAN DEFAULT FALSE,
    do_not_contact BOOLEAN DEFAULT FALSE,
    opt_out_date TIMESTAMP,
    opt_out_reason TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE',
    verification_status VARCHAR(20) DEFAULT 'PENDING',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    notes TEXT
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_client_type ON contacts(client_type);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_name);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_country ON contacts(address_country);
CREATE INDEX IF NOT EXISTS idx_contacts_state ON contacts(address_state);
CREATE INDEX IF NOT EXISTS idx_contacts_temperature ON contacts(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_paca ON contacts(paca_license);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);

-- Import GROWERS into contacts (if not already there)
INSERT INTO contacts (
    client_id, client_type, company_name, trade_name,
    primary_contact, email, phone,
    address_city, address_state, address_country,
    certifications, source, source_database, original_id,
    lead_temperature, lead_status, status,
    email_opt_out, phone_opt_out, do_not_contact,
    created_at, updated_at
)
SELECT 
    grower_code, 'GROWER', legal_name, trade_name,
    primary_contact, email, phone,
    city, state_region, country,
    certifications, 'POSTGRESQL', 'growers', id::text,
    COALESCE(lead_temperature, 'COLD'), COALESCE(lead_status, 'NEW'), status,
    COALESCE(email_opt_out, false), COALESCE(phone_opt_out, false), COALESCE(do_not_contact, false),
    created_at, updated_at
FROM growers
WHERE NOT EXISTS (
    SELECT 1 FROM contacts WHERE contacts.client_id = growers.grower_code
)
ON CONFLICT (client_id) DO NOTHING;

-- Import BUYERS into contacts (if not already there)
INSERT INTO contacts (
    client_id, client_type, company_name, trade_name,
    primary_contact, email, phone,
    address_street, address_city, address_state, address_country, address_postal_code,
    paca_license, product_specialties, annual_volume_usd, credit_rating, payment_terms,
    source, source_database, original_id,
    lead_temperature, lead_status, status, verification_status,
    email_opt_out, phone_opt_out, do_not_contact,
    created_at, updated_at
)
SELECT 
    paca_license, buyer_type, legal_name, trade_name,
    primary_contact, email, phone,
    address, city, state_region, country, zip_code,
    paca_license, product_specialties, annual_volume_usd, credit_rating, payment_terms,
    'POSTGRESQL', 'buyers', id::text,
    COALESCE(lead_temperature, 'COLD'), COALESCE(lead_status, 'NEW'), status, verification_status,
    COALESCE(email_opt_out, false), COALESCE(phone_opt_out, false), COALESCE(do_not_contact, false),
    created_at, updated_at
FROM buyers
WHERE NOT EXISTS (
    SELECT 1 FROM contacts WHERE contacts.paca_license = buyers.paca_license
)
ON CONFLICT (client_id) DO NOTHING;

-- Show results
SELECT 'CONTACTS CONSOLIDATED' as status;
SELECT client_type, COUNT(*) as count FROM contacts GROUP BY client_type ORDER BY count DESC;
SELECT address_country as country, COUNT(*) as count FROM contacts GROUP BY address_country ORDER BY count DESC LIMIT 15;
SELECT lead_temperature as temp, COUNT(*) as count FROM contacts GROUP BY lead_temperature ORDER BY count DESC;