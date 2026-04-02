f = open('C:/AuditDNA/backend/routes/authApi.routes.js', 'r', encoding='utf-8', newline='')
s = f.read()
f.close()
s = s.replace('\r\n', '\n')

# Remove the CREATE TABLE block from the register route — table will exist from pgAdmin
OLD = """    await pool.query(`
      CREATE TABLE IF NOT EXISTS approval_registrations (
        id               SERIAL PRIMARY KEY,
        name             VARCHAR(200),
        email            VARCHAR(200) UNIQUE NOT NULL,
        password_hash    VARCHAR(200),
        company          VARCHAR(200),
        origin           VARCHAR(200),
        phone            VARCHAR(50),
        country          VARCHAR(10) DEFAULT 'mx',
        paca_number      VARCHAR(50),
        tier             VARCHAR(20) DEFAULT 'free',
        docs_completed   JSONB DEFAULT '[]',
        status           VARCHAR(20) DEFAULT 'pending',
        access_code      VARCHAR(20),
        pin              VARCHAR(10),
        approval_note    TEXT,
        approved_by      VARCHAR(100),
        approved_at      TIMESTAMP WITH TIME ZONE,
        created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch(() => {});"""

NEW = "    // Table created via pgAdmin migration"

if OLD in s:
    s = s.replace(OLD, NEW, 1)
    print('FIX OK - CREATE TABLE block removed')
else:
    print('MISS - trying partial match')
    # Find and remove just the problematic block
    idx = s.find("await pool.query(`\n      CREATE TABLE IF NOT EXISTS approval_registrations")
    if idx >= 0:
        end = s.find("`).catch(() => {});", idx) + len("`).catch(() => {});")
        s = s[:idx] + "    // Table created via pgAdmin migration" + s[end:]
        print('FIX OK - partial match removed')
    else:
        print('MISS - manual fix needed')

f = open('C:/AuditDNA/backend/routes/authApi.routes.js', 'w', encoding='utf-8', newline='\n')
f.write(s)
f.close()
print(f'done {len(s.splitlines())} lines')