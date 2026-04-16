patch = """
// ============================================================
// PUT /api/growers/:id — Update grower status + credentials
// ============================================================
router.put('/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const { id } = req.params;
    const {
      lead_status, status, portal_username, portal_password,
      credentials_sent, portal_role, notes
    } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (lead_status !== undefined) { fields.push(`lead_status=$${idx++}`); values.push(lead_status); }
    if (status !== undefined) { fields.push(`status=$${idx++}`); values.push(status); }
    if (portal_username !== undefined) { fields.push(`portal_username=$${idx++}`); values.push(portal_username); }
    if (portal_password !== undefined) { fields.push(`portal_password=$${idx++}`); values.push(portal_password); }
    if (credentials_sent !== undefined) { fields.push(`credentials_sent=$${idx++}`); values.push(credentials_sent); }
    if (portal_role !== undefined) { fields.push(`portal_role=$${idx++}`); values.push(portal_role); }
    if (notes !== undefined) { fields.push(`notes=$${idx++}`); values.push(notes); }
    fields.push(`updated_at=NOW()`);

    if (fields.length === 1) return res.status(400).json({ error: 'No fields to update' });

    values.push(id);
    const result = await pool.query(
      `UPDATE growers SET ${fields.join(', ')} WHERE id=$${idx} RETURNING id, contact_name, lead_status, status, portal_username`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Grower not found' });
    return res.json({ success: true, grower: result.rows[0] });
  } catch (err) {
    console.error('[growers PUT] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

"""

with open(r'C:\\AuditDNA\\backend\\routes\\growers.js', 'r', encoding='utf-8') as f:
    content = f.read()

insert_before = 'module.exports = router;'
if insert_before in content:
    content = content.replace(insert_before, patch + insert_before)
    with open(r'C:\\AuditDNA\\backend\\routes\\growers.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS - PUT route added")
else:
    print("ERROR - insertion point not found")
