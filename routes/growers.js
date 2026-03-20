// 
// AUDITDNA GROWER MANAGEMENT ROUTES - FIXED FOR EXISTING TABLE
// Full CRUD operations for grower database (23K+ contacts)
// 

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// 
// INIT: Fix existing growers table by adding missing columns
// 

const initGrowersTable = async () => {
 try {
 // Step 1: Create table if it doesn't exist (basic structure)
 await pool.query(`
 CREATE TABLE IF NOT EXISTS growers (
 id SERIAL PRIMARY KEY,
 grower_code VARCHAR(50) UNIQUE,
 company_name VARCHAR(255) NOT NULL,
 contact_name VARCHAR(255),
 email VARCHAR(255),
 phone VARCHAR(50),
 country VARCHAR(100) NOT NULL,
 state_province VARCHAR(100),
 city VARCHAR(100),
 address TEXT,
 postal_code VARCHAR(20),
 total_acres DECIMAL(10,2),
 crops_grown TEXT[],
 certification_type VARCHAR(100),
 certification_number VARCHAR(100),
 certification_expiry DATE,
 status VARCHAR(50) DEFAULT 'active',
 notes TEXT,
 created_at TIMESTAMP DEFAULT NOW(),
 updated_at TIMESTAMP DEFAULT NOW()
 )
 `);
 
 // Step 2: Add ALL missing columns (works on existing tables)
 await pool.query(`
 ALTER TABLE growers ADD COLUMN IF NOT EXISTS tier_level INTEGER DEFAULT 3;
 ALTER TABLE growers ADD COLUMN IF NOT EXISTS compliance_score INTEGER DEFAULT 0;
 ALTER TABLE growers ADD COLUMN IF NOT EXISTS risk_rating VARCHAR(20) DEFAULT 'medium';
 ALTER TABLE growers ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
 ALTER TABLE growers ADD COLUMN IF NOT EXISTS small_grower_program BOOLEAN DEFAULT false;
 ALTER TABLE growers ADD COLUMN IF NOT EXISTS primary_products TEXT[];
 ALTER TABLE growers ADD COLUMN IF NOT EXISTS export_markets TEXT[];
 ALTER TABLE growers ADD COLUMN IF NOT EXISTS annual_volume_tons INTEGER;
 ALTER TABLE growers ADD COLUMN IF NOT EXISTS last_audit_date DATE;
 ALTER TABLE growers ADD COLUMN IF NOT EXISTS next_audit_due DATE;
 ALTER TABLE growers ADD COLUMN IF NOT EXISTS fsma_compliant BOOLEAN DEFAULT false;
 ALTER TABLE growers ADD COLUMN IF NOT EXISTS gfsi_certified BOOLEAN DEFAULT false;
 ALTER TABLE growers ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
 `);
 
 // Step 3: Create indexes
 await pool.query(`
 CREATE INDEX IF NOT EXISTS idx_growers_code ON growers(grower_code);
 CREATE INDEX IF NOT EXISTS idx_growers_country ON growers(country);
 CREATE INDEX IF NOT EXISTS idx_growers_status ON growers(status);
 CREATE INDEX IF NOT EXISTS idx_growers_tier ON growers(tier_level);
 `);
 
 console.log(' [Growers] Table initialized');
 
 } catch (error) {
 console.error(' [Growers] Table init failed:', error.message);
 }
};

initGrowersTable();

// 
// HELPER: Generate grower code
// 

const generateGrowerCode = (country, companyName) => {
 const countryCode = country.substring(0, 2).toUpperCase();
 const nameCode = companyName.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
 const timestamp = Date.now().toString().slice(-6);
 return `GW-${countryCode}-${nameCode}-${timestamp}`;
};

// 
// POST /growers - Create new grower
// 

router.post('/', async (req, res) => {
 try {
 const {
 companyName, contactName, email, phone,
 country, stateProvince, city, address, postalCode,
 totalAcres, cropsGrown, certificationType, certificationNumber,
 certificationExpiry, primaryProducts, exportMarkets,
 annualVolumeTons, smallGrowerProgram, notes, createdBy
 } = req.body;

 // Generate unique grower code
 const growerCode = generateGrowerCode(country, companyName);

 // Determine tier based on acreage
 let tierLevel = 3; // Default: Tier 3
 if (totalAcres < 50) tierLevel = 0; // Small grower
 else if (totalAcres < 200) tierLevel = 1;
 else if (totalAcres < 500) tierLevel = 2;

 const result = await pool.query(
 `INSERT INTO growers (
 grower_code, company_name, contact_name, email, phone,
 country, state_province, city, address, postal_code,
 total_acres, crops_grown, certification_type, certification_number,
 certification_expiry, tier_level, primary_products, export_markets,
 annual_volume_tons, small_grower_program, notes, created_by,
 next_audit_due
 ) VALUES (
 $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
 $15, $16, $17, $18, $19, $20, $21, $22, NOW() + INTERVAL '90 days'
 ) RETURNING *`,
 [
 growerCode, companyName, contactName, email, phone,
 country, stateProvince, city, address, postalCode,
 totalAcres, cropsGrown, certificationType, certificationNumber,
 certificationExpiry, tierLevel, primaryProducts, exportMarkets,
 annualVolumeTons, smallGrowerProgram || false, notes, createdBy || 'system'
 ]
 );

 console.log(` [Growers] Created: ${companyName} (${growerCode})`);

 res.status(201).json({
 success: true,
 grower: result.rows[0],
 message: 'Grower created successfully'
 });

 } catch (error) {
 console.error('[Growers] Creation error:', error);
 res.status(500).json({ success: false, error: error.message });
 }
});

// 
// GET /growers - Get all growers with filters
// 

router.get('/', async (req, res) => {
 try {
 const {
 country, status, tier, verified, limit = 20000, offset = 0,
 search, smallGrowerOnly
 } = req.query;

 let query = 'SELECT * FROM growers WHERE 1=1';
 const params = [];
 let paramIndex = 1;

 if (country) {
 query += ` AND country = $${paramIndex}`;
 params.push(country);
 paramIndex++;
 }

 if (status) {
 query += ` AND status = $${paramIndex}`;
 params.push(status);
 paramIndex++;
 }

 if (tier) {
 query += ` AND tier_level = $${paramIndex}`;
 params.push(parseInt(tier));
 paramIndex++;
 }

 if (verified === 'true') {
 query += ` AND verified = true`;
 }

 if (smallGrowerOnly === 'true') {
 query += ` AND small_grower_program = true`;
 }

 if (search) {
 query += ` AND (company_name ILIKE $${paramIndex} OR grower_code ILIKE $${paramIndex})`;
 params.push(`%${search}%`);
 paramIndex++;
 }

 query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
 params.push(parseInt(limit), parseInt(offset));

 const result = await pool.query(query, params);

 // Get total count
 const countResult = await pool.query('SELECT COUNT(*) FROM growers WHERE 1=1');

 res.json({
 success: true,
 data: result.rows, // FIXED: Frontend expects "data" not "growers"
 count: result.rows.length,
 total: parseInt(countResult.rows[0].count),
 limit: parseInt(limit),
 offset: parseInt(offset)
 });

 } catch (error) {
 console.error('[Growers] List error:', error);
 res.status(500).json({ success: false, error: error.message });
 }
});

// 
// GET /growers/:id - Get single grower
// 

router.get('/:id', async (req, res) => {
 try {
 const { id } = req.params;

 const result = await pool.query(
 'SELECT * FROM growers WHERE id = $1 OR grower_code = $1',
 [id]
 );

 if (result.rows.length === 0) {
 return res.status(404).json({
 success: false,
 error: 'Grower not found'
 });
 }

 res.json({
 success: true,
 grower: result.rows[0]
 });

 } catch (error) {
 console.error('[Growers] Get error:', error);
 res.status(500).json({ success: false, error: error.message });
 }
});

// 
// PUT /growers/:id - Update grower
// 

router.put('/:id', async (req, res) => {
 try {
 const { id } = req.params;
 const updates = req.body;

 // Build dynamic update query
 const fields = [];
 const values = [];
 let paramIndex = 1;

 const allowedFields = [
 'company_name', 'contact_name', 'email', 'phone',
 'country', 'state_province', 'city', 'address', 'postal_code',
 'total_acres', 'crops_grown', 'certification_type', 'certification_number',
 'certification_expiry', 'tier_level', 'compliance_score', 'risk_rating',
 'status', 'verified', 'small_grower_program', 'primary_products',
 'export_markets', 'annual_volume_tons', 'fsma_compliant', 'gfsi_certified',
 'notes'
 ];

 for (const [key, value] of Object.entries(updates)) {
 if (allowedFields.includes(key)) {
 fields.push(`${key} = $${paramIndex}`);
 values.push(value);
 paramIndex++;
 }
 }

 if (fields.length === 0) {
 return res.status(400).json({
 success: false,
 error: 'No valid fields to update'
 });
 }

 fields.push(`updated_at = NOW()`);
 values.push(id);

 const query = `
 UPDATE growers 
 SET ${fields.join(', ')}
 WHERE id = $${paramIndex} OR grower_code = $${paramIndex}
 RETURNING *
 `;

 const result = await pool.query(query, values);

 if (result.rows.length === 0) {
 return res.status(404).json({
 success: false,
 error: 'Grower not found'
 });
 }

 console.log(` [Growers] Updated: ${result.rows[0].company_name}`);

 res.json({
 success: true,
 grower: result.rows[0],
 message: 'Grower updated successfully'
 });

 } catch (error) {
 console.error('[Growers] Update error:', error);
 res.status(500).json({ success: false, error: error.message });
 }
});

// 
// DELETE /growers/:id - Soft delete grower
// 

router.delete('/:id', async (req, res) => {
 try {
 const { id } = req.params;

 const result = await pool.query(
 `UPDATE growers 
 SET status = 'inactive', updated_at = NOW()
 WHERE id = $1 OR grower_code = $1
 RETURNING *`,
 [id]
 );

 if (result.rows.length === 0) {
 return res.status(404).json({
 success: false,
 error: 'Grower not found'
 });
 }

 console.log(` [Growers] Deactivated: ${result.rows[0].company_name}`);

 res.json({
 success: true,
 message: 'Grower deactivated successfully'
 });

 } catch (error) {
 console.error('[Growers] Delete error:', error);
 res.status(500).json({ success: false, error: error.message });
 }
});

// 
// GET /growers/stats/overview - Grower statistics
// 

router.get('/stats/overview', async (req, res) => {
 try {
 const stats = await pool.query(`
 SELECT 
 COUNT(*) as total_growers,
 COUNT(*) FILTER (WHERE status = 'active') as active_growers,
 COUNT(*) FILTER (WHERE verified = true) as verified_growers,
 COUNT(*) FILTER (WHERE small_grower_program = true) as small_growers,
 COUNT(*) FILTER (WHERE tier_level = 0) as tier_0,
 COUNT(*) FILTER (WHERE tier_level = 1) as tier_1,
 COUNT(*) FILTER (WHERE tier_level = 2) as tier_2,
 COUNT(*) FILTER (WHERE tier_level = 3) as tier_3,
 COUNT(*) FILTER (WHERE fsma_compliant = true) as fsma_compliant,
 COUNT(*) FILTER (WHERE gfsi_certified = true) as gfsi_certified,
 SUM(total_acres) as total_acres,
 AVG(compliance_score) as avg_compliance_score
 FROM growers
 `);

 const byCountry = await pool.query(`
 SELECT country, COUNT(*) as count
 FROM growers
 WHERE status = 'active'
 GROUP BY country
 ORDER BY count DESC
 `);

 res.json({
 success: true,
 stats: stats.rows[0],
 byCountry: byCountry.rows,
 timestamp: new Date().toISOString()
 });

 } catch (error) {
 console.error('[Growers] Stats error:', error);
 res.status(500).json({ success: false, error: error.message });
 }
});

// 
// EXPORT
// 

module.exports = router;
