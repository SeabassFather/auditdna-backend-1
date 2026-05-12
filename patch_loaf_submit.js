const fs = require('fs');
let c = fs.readFileSync('routes/loaf-chat.routes.js', 'utf8');

const INSERT = `

router.post('/submit', async (req, res) => {
  try {
    const { action, lot_id, name, email, phone, notes, gps, ts } = req.body;
    const pool = global.db;

    if (action === 'colonet_inquiry') {
      if (pool) {
        await pool.query(
          'INSERT INTO mortgage_brain_log (module, event, data, source) VALUES ($1,$2,$3,$4)',
          ['loaf', 'COLONET_INQUIRY', JSON.stringify({ lot_id, name, email, phone, notes, gps, ts }), 'colonet_lot_map']
        ).catch(() => {});
      }
      // Email Ariel + Saul
      const transporter = require('nodemailer').createTransport({
        host: 'smtp.gmail.com', port: 587, secure: false,
        auth: { user: 'sgarcia1911@gmail.com', pass: process.env.GMAIL_APP_PASS || 'emgptqrmqdbxrpil' }
      });
      await transporter.sendMail({
        from: '"LOAF Colonet" <sgarcia1911@gmail.com>',
        to: 'sgarcia1911@gmail.com, ariel@enjoybaja.com',
        subject: 'COLONET LOT INQUIRY - Lot #' + lot_id,
        text: 'Name: ' + name + '\nEmail: ' + email + '\nPhone: ' + phone + '\nLot: #' + lot_id + '\nNotes: ' + (notes||'') + '\nGPS: ' + JSON.stringify(gps||{}) + '\nTime: ' + new Date(ts).toISOString()
      }).catch(() => {});
      return res.json({ ok: true });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[loaf/submit]', e.message);
    res.status(500).json({ error: e.message });
  }
});
`;

// Insert before module.exports
c = c.replace('module.exports = router;', INSERT + '\nmodule.exports = router;');
fs.writeFileSync('routes/loaf-chat.routes.js', c, 'utf8');
console.log('submit route added:', c.includes('colonet_inquiry') ? 'OK' : 'MISS');
