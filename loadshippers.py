import json, psycopg2

conn = psycopg2.connect("postgresql://postgres:PMJobEqMsVuiwvFwHlHFUrGXarncSAQj@hopper.proxy.rlwy.net:55424/railway", sslmode='require')
cur = conn.cursor()

data = json.load(open(r'C:\AuditDNA\backend\MiniAPI\data\Shipper-contacts.json', encoding='utf-8'))
contacts = data if isinstance(data, list) else []
print(f'Loading {len(contacts)} contacts...')

cur.execute("SELECT email FROM shipper_contacts")
existing = set(r[0] for r in cur.fetchall())
print(f'Already in DB: {len(existing)}')

rows = []
for c in contacts:
    email = c.get('email','')
    if not email or email in existing:
        continue
    rows.append((c.get('name',''), c.get('company',''), email, c.get('source','JSON'), c.get('status','active'), c.get('region','')))

print(f'New rows to insert: {len(rows)}')
if rows:
    cur.executemany("INSERT INTO shipper_contacts (name,company,email,source,status,region,created_at) VALUES (%s,%s,%s,%s,%s,%s,NOW())", rows)
    conn.commit()

cur.execute("SELECT COUNT(*) FROM shipper_contacts")
print('Total shippers now:', cur.fetchone()[0])
conn.close()
