const {Pool}=require('pg');
const p=new Pool({connectionString:'postgresql://postgres:postgres@localhost:5432/auditdna'});

async function fix() {
  // Create shippers table matching the structure CRM expects
  await p.query(`
    CREATE TABLE IF NOT EXISTS shippers (
      id SERIAL PRIMARY KEY,
      legal_name VARCHAR(255),
      trade_name VARCHAR(255),
      country VARCHAR(100) DEFAULT 'USA',
      state_region VARCHAR(100),
      city VARCHAR(100),
      address TEXT,
      zip_code VARCHAR(20),
      paca_license VARCHAR(50),
      product_specialties TEXT,
      status VARCHAR(50) DEFAULT 'active',
      primary_contact VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  const ct = await p.query('SELECT count(*) FROM shipper_contacts');
  console.log('Shippers table created. Rows:', ct.rows[0].count);
  
  // Also show current counts
  const g = await p.query('SELECT count(*) FROM growers');
  const b = await p.query('SELECT count(*) FROM buyers');
  console.log('Growers:', g.rows[0].count, '| Buyers:', b.rows[0].count);
  
  p.end();
}
fix().catch(e => { console.error(e.message); p.end(); });

