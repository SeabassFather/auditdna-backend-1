// =============================================================================
// File: financing-tagline.js
// Save to: C:\AuditDNA\backend\financing-tagline.js
// =============================================================================
// Sprint D Wave 3D - Standard financing tagline appender
//
// Single source of truth for the financing footer that goes on every outbound
// AI-generated letter. Both English and Spanish.
//
// Usage from any module:
//   const { appendFinancingTagline } = require('../financing-tagline');
//   const finalLetter = appendFinancingTagline(rawLetter, 'EN');
//
// Or via global (auto-attached on require):
//   global.financingTagline.append(letter, lang)
//
// Idempotent - won't double-append if 'Mexausa Capital' already in text.
// =============================================================================

const TAGLINE_EN = '\n\n---\nFinancing available: Net-30 terms / PO funding via Mexausa Capital. Ask about terms.\nMexausa Food Group, Inc. | mexausafg.com';
const TAGLINE_ES = '\n\n---\nFinanciamiento disponible: terminos Net-30 / fondeo de PO a traves de Mexausa Capital. Pregunte por los terminos.\nMexausa Food Group, Inc. | mexausafg.com';

const TAGLINE_HTML_EN = `
<hr style="margin:20px 0;border:0;border-top:1px solid #D4DBD3">
<p style="font-size:12px;color:#475463;line-height:1.5;font-family:-apple-system,sans-serif">
  <strong style="color:#0F7B41">Financing available:</strong> Net-30 terms / PO funding via Mexausa Capital. Ask about terms.<br>
  <span style="color:#A8B2BC">Mexausa Food Group, Inc. | <a href="https://mexausafg.com" style="color:#0F7B41;text-decoration:none">mexausafg.com</a></span>
</p>`;

const TAGLINE_HTML_ES = `
<hr style="margin:20px 0;border:0;border-top:1px solid #D4DBD3">
<p style="font-size:12px;color:#475463;line-height:1.5;font-family:-apple-system,sans-serif">
  <strong style="color:#0F7B41">Financiamiento disponible:</strong> terminos Net-30 / fondeo de PO a traves de Mexausa Capital. Pregunte por los terminos.<br>
  <span style="color:#A8B2BC">Mexausa Food Group, Inc. | <a href="https://mexausafg.com" style="color:#0F7B41;text-decoration:none">mexausafg.com</a></span>
</p>`;

function isSpanish(lang) {
  return String(lang || '').toLowerCase().startsWith('es');
}

function alreadyTagged(text) {
  if (!text) return false;
  return /mexausa capital/i.test(text);
}

function append(text, lang) {
  if (!text) return text;
  if (alreadyTagged(text)) return text;
  return text + (isSpanish(lang) ? TAGLINE_ES : TAGLINE_EN);
}

function appendHtml(html, lang) {
  if (!html) return html;
  if (alreadyTagged(html)) return html;
  // If it's a full HTML doc, inject before </body>; otherwise just concat
  const tag = isSpanish(lang) ? TAGLINE_HTML_ES : TAGLINE_HTML_EN;
  if (html.includes('</body>')) {
    return html.replace('</body>', tag + '\n</body>');
  }
  return html + tag;
}

// Wire global helper for in-process callers without explicit require
if (!global.financingTagline) {
  global.financingTagline = { append, appendHtml, isSpanish, alreadyTagged };
}

module.exports = {
  append,
  appendHtml,
  isSpanish,
  alreadyTagged,
  TAGLINE_EN,
  TAGLINE_ES,
  TAGLINE_HTML_EN,
  TAGLINE_HTML_ES
};
