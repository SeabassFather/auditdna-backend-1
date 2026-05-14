// ============================================================================
// LOAF COMMODITY BLAST — fire targeted email campaigns to matched buyers
// POST /api/loaf/commodity-blast
// Body: { commodity, volume, price, location, contact_name, contact_phone,
//         origin, condition, notes, priority, scheduled_at, regions }
// ============================================================================
const express = require('express');
const router = express.Router();

const SMTP_CONFIG = {
  host: 'smtp.gmail.com', port: 587, secure: false,
  auth: { user: 'sgarcia1911@gmail.com', pass: process.env.GMAIL_APP_PASSWORD || 'emgptqrmqdbxrpil' }
};

// Commodity → buyer search terms
const COMMODITY_TAGS = {
  broccoli:    ['broccoli','produce','vegetable','wholesal','distribut','fresh','grocery','market','retail'],
  avocado:     ['avocado','aguacate','produce','fresh','wholesal','distribut','mexican','import'],
  strawberry:  ['strawberry','berry','fresa','produce','fresh','wholesal','distribut'],
  tomato:      ['tomato','tomate','produce','fresh','wholesal','distribut'],
  lettuce:     ['lettuce','lechuga','leafy','salad','produce','fresh','wholesal'],
  spinach:     ['spinach','espinaca','leafy','produce','fresh','wholesal'],
  cilantro:    ['cilantro','herb','produce','fresh','wholesal'],
  cabbage:     ['cabbage','col','produce','fresh','wholesal','distribut'],
  carrot:      ['carrot','zanahoria','root','produce','fresh','wholesal'],
  jalapeño:    ['jalap','pepper','chile','produce','fresh','wholesal','mexican'],
};

// Region → state list
const REGIONS = {
  'West Coast': ['CA','OR','WA','NV','AZ'],
  'Midwest':    ['IL','OH','MI','MN','WI','MO','IN','KS','NE','IA'],
  'East Coast': ['NY','NJ','FL','GA','NC','VA','PA','MD','MA','CT'],
  'Southwest':  ['TX','NM','CO','UT'],
  'All US':     null
};

function buildEmailHTML(d) {
  const urgent = d.priority === 'urgent';
  const urgentBanner = urgent ? `
    <div style="background:#B91C1C;color:white;padding:10px 20px;text-align:center;font-size:13px;font-weight:700;letter-spacing:1px">
      TIME SENSITIVE — FLOOR STOCK — MOVE FAST
    </div>` : '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9">
  ${urgentBanner}
  <div style="max-width:600px;margin:0 auto;background:white">
    <div style="background:#0F1419;padding:20px 28px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:11px;color:rgba(201,165,92,0.85);letter-spacing:2px;font-weight:700;text-transform:uppercase">Mexausa Food Group, Inc.</div>
        <div style="font-size:18px;font-weight:700;color:white;letter-spacing:1px">Fresh Produce — Available Now</div>
      </div>
      <div style="font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:1px">EIN 88-1698129</div>
    </div>
    <div style="padding:28px">
      <div style="font-size:24px;font-weight:700;color:#0F1419;margin-bottom:4px">${d.commodity}</div>
      <div style="font-size:13px;color:#64748b;margin-bottom:20px">${d.origin||d.location} · ${d.volume} · ${urgent?'<span style="color:#B91C1C;font-weight:700">URGENT — Floor Stock</span>':d.condition||'Available now'}</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        ${d.price?`<tr><td style="padding:10px 12px;background:#f8fafc;border:0.5px solid #e2e8f0;font-size:12px;color:#475569;font-weight:600">Price</td><td style="padding:10px 12px;background:#f8fafc;border:0.5px solid #e2e8f0;font-size:13px;color:#0F1419;font-weight:700">${d.price}</td></tr>`:''}
        <tr><td style="padding:10px 12px;border:0.5px solid #e2e8f0;font-size:12px;color:#475569;font-weight:600">Volume</td><td style="padding:10px 12px;border:0.5px solid #e2e8f0;font-size:13px;color:#0F1419;font-weight:700">${d.volume}</td></tr>
        <tr><td style="padding:10px 12px;background:#f8fafc;border:0.5px solid #e2e8f0;font-size:12px;color:#475569;font-weight:600">Origin / Location</td><td style="padding:10px 12px;background:#f8fafc;border:0.5px solid #e2e8f0;font-size:13px;color:#0F1419;font-weight:700">${d.origin||d.location}</td></tr>
        <tr><td style="padding:10px 12px;border:0.5px solid #e2e8f0;font-size:12px;color:#475569;font-weight:600">Availability</td><td style="padding:10px 12px;border:0.5px solid #e2e8f0;font-size:13px;color:${urgent?'#B91C1C':'#0F7B41'};font-weight:700">${urgent?'MUST MOVE TODAY — PERISHABLE':d.condition||'Ready to ship'}</td></tr>
        ${d.notes?`<tr><td style="padding:10px 12px;background:#f8fafc;border:0.5px solid #e2e8f0;font-size:12px;color:#475569;font-weight:600">Notes</td><td style="padding:10px 12px;background:#f8fafc;border:0.5px solid #e2e8f0;font-size:12px;color:#0F1419">${d.notes}</td></tr>`:''}
      </table>
      <div style="background:#0F7B41;border-radius:8px;padding:18px;text-align:center;margin-bottom:20px">
        <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-bottom:6px">Contact to buy / For more information</div>
        <div style="font-size:18px;font-weight:700;color:white">${d.contact_name||'Saul Garcia'}</div>
        <div style="font-size:15px;color:rgba(255,255,255,0.9);margin-top:4px">${d.contact_phone||'+1 831-251-3116'}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">Saul@mexausafg.com · mexausafg.com</div>
      </div>
      <div style="font-size:11px;color:#94a3b8;line-height:1.6">This offer is sent exclusively to verified produce buyers and wholesalers on the Mexausa LOAF network. Prices subject to confirmation. FOB pickup available. Delivery negotiable. PACA terms apply.<br><br>To unsubscribe reply STOP.</div>
    </div>
    <div style="background:#0F1419;padding:14px 28px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:10px;color:rgba(255,255,255,0.35)">Mexausa Food Group, Inc. · EIN 88-1698129 · mexausafg.com</div>
      <div style="font-size:10px;color:rgba(201,165,92,0.6)">LOAF Intelligence Network</div>
    </div>
  </div></body></html>`;
}

router.post('/commodity-blast', async (req, res) => {
  const { commodity, volume, price, location, origin, contact_name, contact_phone,
          condition, notes, priority, regions, scheduled_at, dry_run } = req.body;

  if (!commodity || !volume) return res.status(400).json({ error: 'commodity and volume required' });

  const commKey = commodity.toLowerCase().split('/')[0].trim().replace(/\s+/g,'-');
  const tags = COMMODITY_TAGS[commKey] || ['produce','wholesal','distribut','fresh'];
  const targetRegions = regions || ['West Coast','Midwest','East Coast'];
  const emailData = { commodity, volume, price, location, origin: origin||location,
                      contact_name: contact_name||'Saul Garcia',
                      contact_phone: contact_phone||'+1 831-251-3116',
                      condition, notes, priority };
  const html = buildEmailHTML(emailData);
  const subject = priority === 'urgent'
    ? `URGENT — ${commodity} Floor Stock — ${volume} Available NOW | Mexausa`
    : `${commodity} Available — ${volume} | ${origin||location} | Mexausa Food Group`;

  if (dry_run) {
    return res.json({ ok: true, dry_run: true, subject, html_preview: html.slice(0,500)+'...' });
  }

  // Schedule or fire immediately
  const fireAt = scheduled_at ? new Date(scheduled_at) : new Date();
  const delay = Math.max(0, fireAt - Date.now());

  res.json({ ok: true, scheduled_at: fireAt.toISOString(), delay_ms: delay, commodity, regions: targetRegions });

  // Fire after delay (async — response already sent)
  setTimeout(async () => {
    try {
      let pool; try { pool = require('../db'); } catch(e) {} pool = pool || global.db;
      const stateList = targetRegions.flatMap(r => REGIONS[r] || []);
      const whereState = stateList.length > 0
        ? `AND (state = ANY($2) OR state IS NULL)`
        : '';
      const params = [tags.map(t => '%'+t+'%')];
      if (stateList.length) params.push(stateList);

      // Build tag OR conditions
      const tagConditions = tags.map((_,i) => `(email ILIKE $1[${i+1}] OR company_name ILIKE $1[${i+1}] OR commodities ILIKE $1[${i+1}])`).join(' OR ');

      const buyers = await pool.query(
        `SELECT DISTINCT email, first_name, company_name, state FROM contacts
         WHERE email IS NOT NULL AND email != '' AND email LIKE '%@%'
         AND (crmtype='buyer' OR crm_type='buyer' OR role ILIKE '%buyer%'
              OR role ILIKE '%wholesal%' OR role ILIKE '%distribut%'
              OR commodities ILIKE $2)
         ${stateList.length ? `AND (state = ANY($3) OR state IS NULL OR state = '')` : ''}
         LIMIT 500`,
        stateList.length
          ? ['%'+commKey+'%', '%produce%', stateList]
          : ['%'+commKey+'%', '%produce%']
      ).catch(()=>({rows:[]}));

      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport(SMTP_CONFIG);
      let sent = 0, failed = 0;

      // Always notify Saul first
      await transporter.sendMail({
        from: '"Mexausa LOAF" <sgarcia1911@gmail.com>',
        to: 'sgarcia1911@gmail.com',
        subject: `[BLAST FIRED] ${subject} — ${buyers.rows.length} buyers targeted`,
        html: html
      }).catch(()=>{});

      for (const buyer of buyers.rows) {
        try {
          await transporter.sendMail({
            from: '"Mexausa Food Group" <sgarcia1911@gmail.com>',
            to: buyer.email,
            subject: subject,
            html: html.replace('Hi,', `Hi ${buyer.first_name||buyer.company_name||''},`)
          });
          sent++;
          // Small delay to avoid Gmail rate limiting
          await new Promise(r => setTimeout(r, 120));
        } catch(e) { failed++; }
      }

      // Final report to Saul
      await transporter.sendMail({
        from: '"Mexausa LOAF" <sgarcia1911@gmail.com>',
        to: 'sgarcia1911@gmail.com',
        subject: `[BLAST COMPLETE] ${commodity} — ${sent} emails sent, ${failed} failed`,
        html: `<p>Blast complete for <strong>${commodity}</strong>.</p><p>Sent: ${sent}<br>Failed: ${failed}<br>Total targeted: ${buyers.rows.length}<br>Regions: ${targetRegions.join(', ')}</p>`
      }).catch(()=>{});

      console.log(`[LOAF BLAST] ${commodity} complete: ${sent} sent, ${failed} failed`);
    } catch(e) {
      console.error('[LOAF BLAST] Error:', e.message);
    }
  }, delay);
});

module.exports = router;
