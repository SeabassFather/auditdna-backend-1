/**
 * backend/db/apply_schema.js
 *
 * Run this with:
 *   node backend/db/apply_schema.js
 *
 * It reads backend/db/schema.sql and executes it using DATABASE_URL env var.
 * This avoids needing the psql CLI on Windows.
 *
 * Make sure you set:
 *   $env:DATABASE_URL = "postgres://user:pass@host:port/dbname"
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function run() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('schema.sql not found at', schemaPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Please set DATABASE_URL environment variable (e.g. postgres://user:pass@host:5432/auditdna)');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });
  const client = await pool.connect();
  try {
    console.log('Applying schema from', schemaPath);
    // split on semicolon for basic separation (schema file should be fine)
    // Use a safer approach for large files or complex statements if needed.
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Schema applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('Error applying schema:', err.message || err);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});