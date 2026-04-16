const express    = require('express');
const router     = express.Router();
const nodemailer = require('nodemailer');

const SMTP = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  auth: { user: 'saul@mexausafg.com', pass: 'KongKing#321' },
});

router.post('/request', async (req, res) => {
  const { subject, body, partnerEmails, financeRecord, manifest } = req.body;
  const toList = ['saul@mexausafg.com'];
  if (partnerEmails) {
    partnerEmails.split(',').map(e=>e.trim()).filter(Boolean).forEach(e=>{ if(!toList.includes(e)) toList.push(e); });
  }
  const manifestSummary = manifest && manifest.lines
    ? manifest.lines.map(l => '  ' + l.commodity + ' | ' + l.quantity + ' ' + l.unit + ' | Origin: ' + (l.origin||'N/A') + ' | $' + parseFloat(l.totalValue||0).toLocaleString()).join('\n')
    : '  See deal record';
  const fullBody = (body||'') + '\n\n=== FINANCIAL RECORD ===\nPO Number: ' + (financeRecord&&financeRecord.poNumber||'N/A') + '\nInvoice Value: $' + ((financeRecord&&financeRecord.invoiceValue)||0).toLocaleString() + '\nAdvance: $' + ((financeRecord&&financeRecord.advanceAmount)||0).toLocaleString() + '\nFactoring Fee: $' + ((financeRecord&&financeRecord.factoringFee)||0).toLocaleString() + '\nBuyer: ' + (financeRecord&&financeRecord.buyer||'TBD') + '\nPort: ' + (financeRecord&&financeRecord.portName||'N/A') + '\n\nMANIFEST LINES:\n' + manifestSummary + '\n\nMexausa Food Group, Inc. | EIN: 93-2597001 | PACA #20241168\nsaul@mexausafg.com | +1 (831) 251-3116';
  try {
    await SMTP.sendMail({
      from: '"Mexausa Food Group BCI Finance" <saul@mexausafg.com>',
      to: toList.join(', '),
      subject: subject || ('PO Finance Request ' + (financeRecord&&financeRecord.poNumber||'')),
      text: fullBody,
    });
    console.log('[BCI-FINANCE] Sent: ' + (financeRecord&&financeRecord.poNumber));
    res.json({ success: true, sent_to: toList });
  } catch (err) {
    console.error('[BCI-FINANCE] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/buyer-alert', async (req, res) => {
  const { commodity, quantity, origin, unitPrice, port, manifestId, paca } = req.body;
  try {
    await SMTP.sendMail({
      from: '"Mexausa Food Group Inventory" <saul@mexausafg.com>',
      to: 'saul@mexausafg.com',
      subject: 'New Inventory ' + commodity + ' ' + quantity + ' ' + port,
      text: 'Mexausa Food Group, Inc. has new container inventory.\n\nCommodity: ' + commodity + '\nQuantity: ' + quantity + '\nOrigin: ' + (origin||'N/A') + '\nPort: ' + port + '\nManifest: ' + manifestId + '\n\nsaul@mexausafg.com | +1 (831) 251-3116',
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
