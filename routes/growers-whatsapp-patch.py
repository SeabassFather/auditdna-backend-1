patch = """
// ============================================================
// WHATSAPP BOT REGISTRATION ENDPOINT
// POST /api/growers/whatsapp
// ============================================================
router.post('/whatsapp', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const {
      contact_name, company_name, country, state_province, city,
      hectares, primary_product, secondary_products, certifications,
      email, license_number, tax_id, notes,
      source = 'whatsapp-bot', language = 'Spanish',
      status = 'active', lead_status = 'new', lead_temperature = 'WARM'
    } = req.body;
    if (!contact_name) return res.status(400).json({ error: 'contact_name required' });
    const result = await pool.query(`
      INSERT INTO growers
        (contact_name, company_name, country, state_province, city,
         hectares, primary_product, secondary_products, certifications,
         email, license_number, tax_id, notes,
         source, language, status, lead_status, lead_temperature, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING id, contact_name, company_name, country
    `, [
      contact_name, company_name, country || 'Mexico', state_province, city,
      hectares || null, primary_product, secondary_products, certifications,
      email, license_number, tax_id, notes,
      source, language, status, lead_status, lead_temperature, 'whatsapp-bot'
    ]);
    return res.json({ success: true, grower: result.rows[0] });
  } catch (err) {
    console.error('[whatsapp-bot] grower insert error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});
"""

with open(r'C:\AuditDNA\backend\routes\growers.js', 'r', encoding='utf-8') as f:
    content = f.read()

insert_before = 'module.exports = router;'
if insert_before in content:
    content = content.replace(insert_before, patch + insert_before)
    with open(r'C:\AuditDNA\backend\routes\growers.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS - /whatsapp endpoint added")
else:
    print("ERROR - could not find insertion point")
