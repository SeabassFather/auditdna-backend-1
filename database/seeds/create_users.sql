CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    pin VARCHAR(4) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (username, email, password, pin, role) VALUES
('saul@auditdna.com', 'saul@auditdna.com', 'AuditDNA2026!', '1776', 'admin'),
('demo@auditdna.com', 'demo@auditdna.com', 'Demo2026!', '0000', 'user')
ON CONFLICT (username) DO NOTHING;