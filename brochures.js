// ============================================================================
// Brochures Route
// File: C:\AuditDNA\backend\routes\brochures.js
// GET /api/brochures/cocolove-deck  — serves CocoLove PDF
// GET /api/brochures/cocolove-video — serves video card HTML
// ============================================================================
'use strict';
const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');

// Serve CocoLove PDF from file if it exists, otherwise from embedded b64
router.get('/cocolove-deck', (req, res) => {
  const pdfPath = path.join(__dirname, '../assets/CocoLove_SalesDeck_2024.pdf');
  if (fs.existsSync(pdfPath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="CocoLove_SalesDeck_2024.pdf"');
    return res.sendFile(pdfPath);
  }
  // Fallback: return 404 with instructions
  res.status(404).json({
    error: 'PDF not found on server',
    instructions: 'Place CocoLove_SalesDeck_2024.pdf in C:\\AuditDNA\\backend\\assets\\'
  });
});

router.get('/cocolove-video', (req, res) => {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CocoLove Brand Video</title></head>
<body style="margin:0;background:#0a5c3a;display:flex;align-items:center;justify-content:center;min-height:100vh">
<div style="text-align:center">
  <a href="https://www.youtube.com/shorts/VNHhgOdQRqI" target="_blank" style="display:block">
    <img src="https://img.youtube.com/vi/VNHhgOdQRqI/hqdefault.jpg" style="border-radius:12px;max-width:100%;border:3px solid #fff"/>
    <div style="color:#fff;font-family:Arial;font-size:14px;margin-top:12px;font-weight:700">Click to Watch CocoLove Brand Story</div>
  </a>
</div></body></html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

router.get('/list', (req, res) => {
  res.json({ brochures: [
    { id:'cocolove-deck', name:'CocoLove Sales Deck', url:'/api/brochures/cocolove-deck', type:'pdf' },
    { id:'cocolove-video', name:'CocoLove Brand Video', url:'/api/brochures/cocolove-video', type:'html' },
  ]});
});

module.exports = router;
