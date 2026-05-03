// ============================================================================
// NADINE - Sponsor Onboarding Agent for LOAF (Mexausa Food Group)
// ============================================================================
// Counterpart to Priscilla:
//   Priscilla = reads brain_events, reports marketing/sales metrics to Saul
//   Nadine    = takes sponsor intake JSON, generates the LOAF code, validates,
//               and (optionally) patches mfginc-loaf.html directly.
//
// Save to: C:\AuditDNA\backend\agents\nadine.js
//
// Wire from server.js (after express + pool + nodemailer transporter ready):
//   const nadine = require('./agents/nadine');
//   nadine.init(app, pool);
//
// Endpoints:
//   POST /api/nadine/sponsor          - submit intake, get generated code blocks
//   POST /api/nadine/sponsor/apply    - actually patch mfginc-loaf.html (writes a .bak first)
//   GET  /api/nadine/sponsors         - list all currently configured sponsors
//   GET  /api/nadine/health           - agent status
//   GET  /api/nadine/playbook         - returns the intake form spec (the "API contract")
// ============================================================================

const fs = require('fs');
const path = require('path');

const AGENT_NAME = 'Nadine';
const AGENT_VERSION = '1.0.0';

// Default LOAF html location on this Windows host. Override via env LOAF_HTML_PATH.
const DEFAULT_LOAF_HTML = process.env.LOAF_HTML_PATH ||
  'C:\\AuditDNA\\frontend\\public\\mfginc-loaf.html';

const BRAND_PALETTES = {
  'royal-purple'    : { primary: '#3D1E6D', secondary: '#7C3AED', border: '#E5E4E2' },
  'burnt-orange'    : { primary: '#9A3412', secondary: '#EA580C', border: '#FED7AA' },
  'forest-copper'   : { primary: '#14532D', secondary: '#B45309', border: '#FCD34D' },
  'crimson-steel'   : { primary: '#7F1D1D', secondary: '#475569', border: '#E5E7EB' },
  'teal-lime'       : { primary: '#134E4A', secondary: '#65A30D', border: '#FACC15' },
  'wine-cream'      : { primary: '#7E22CE', secondary: '#D6336C', border: '#FFF1E6' },
  'midnight-mint'   : { primary: '#0F172A', secondary: '#10B981', border: '#FCD34D' }
};

// Already-used slot palettes (for collision detection)
const TAKEN_PALETTES = ['trojan', 'naval', 'charcoal-forest', 'pacific-ocean', 'nfl-premium'];

let _state = {
  startedAt: new Date().toISOString(),
  sponsorsAddedThisSession: 0,
  lastError: null,
  loafHtmlPath: DEFAULT_LOAF_HTML,
  // Email tracking
  drafts: new Map(),              // slug -> { form, previewedAt, errors, owner_email, owner_name }
  failedAttempts: [],             // ring buffer last 50
  emailsSent: 0,
  lastEmailAt: null,
  emailErrors: 0
};

const SAUL_EMAIL = process.env.NADINE_ALERT_EMAIL || 'sgarcia1911@gmail.com';
const ABANDONMENT_MS = 30 * 60 * 1000;   // 30 minutes
const ABANDONMENT_CHECK_MS = 5 * 60 * 1000; // poll every 5 min

function log(msg) { console.log('[' + AGENT_NAME + '] ' + msg); }

// ============================================================================
// 1. VALIDATION
// ============================================================================

const HEX_RE   = /^#([0-9A-Fa-f]{6})$/;
const SLUG_RE  = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateIntake(form) {
  const errors = [];
  if (!form || typeof form !== 'object') return ['intake must be a JSON object'];

  if (!form.slug || !SLUG_RE.test(form.slug))     errors.push('slug must be kebab-case lowercase alphanumeric (e.g. "tuntan-erendira")');
  if (!form.title || form.title.length < 3)        errors.push('title required (min 3 chars)');
  if (form.title && form.title.length > 40)        errors.push('title must be <= 40 chars');
  if (!form.pitch || form.pitch.length < 20)       errors.push('pitch required (min 20 chars)');
  if (form.pitch && form.pitch.length > 240)       errors.push('pitch must be <= 240 chars');
  if (!Array.isArray(form.tags) || form.tags.length < 2 || form.tags.length > 4)
                                                    errors.push('tags must be array of 2-4 short labels');

  if (!form.owner || !form.owner.name)             errors.push('owner.name required');
  if (form.owner && form.owner.email && !EMAIL_RE.test(form.owner.email))
                                                    errors.push('owner.email invalid format');
  if (form.owner && !form.owner.phone_us && !form.owner.phone_mx)
                                                    errors.push('at least one of owner.phone_us / owner.phone_mx required');

  if (!form.colors || !HEX_RE.test(form.colors.primary || '')) errors.push('colors.primary must be #RRGGBB hex');
  if (!form.colors || !HEX_RE.test(form.colors.secondary || '')) errors.push('colors.secondary must be #RRGGBB hex');
  if (!form.colors || !HEX_RE.test(form.colors.border || '')) errors.push('colors.border must be #RRGGBB hex');

  const validRouting = ['saul-only', 'saul-plus-sponsor', 'hector-plus-saul', 'custom'];
  if (!form.lead_routing || validRouting.indexOf(form.lead_routing) < 0)
                                                    errors.push('lead_routing must be one of: ' + validRouting.join(', '));
  if (form.lead_routing === 'saul-plus-sponsor' && (!form.sponsor_email || !EMAIL_RE.test(form.sponsor_email)))
                                                    errors.push('sponsor_email required and valid when lead_routing = saul-plus-sponsor');

  if (!form.voice || !form.voice.angle)            errors.push('voice.angle (one-line pitch) required');
  if (!form.voice || !Array.isArray(form.voice.selling_points) || form.voice.selling_points.length < 1)
                                                    errors.push('voice.selling_points must be array of at least 1');
  if (!form.voice || !form.voice.cta)              errors.push('voice.cta (call to action) required');

  return errors;
}

// ============================================================================
// 2. PHONETIC HELPERS for voice scripts
// ============================================================================

const DIGITS_EN = ['zero','one','two','three','four','five','six','seven','eight','nine'];
const DIGITS_ES = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve'];

function phoneToPhonetic(phoneStr, lang) {
  if (!phoneStr) return '';
  const digits = phoneStr.replace(/\D/g, '');
  // Drop country code prefix for phonetic playback
  // +1-831-251-3116 -> 8312513116
  // +52-646-340-2686 -> 526463402686 -> drop leading 52 -> 6463402686
  let local = digits;
  if (local.startsWith('1') && local.length === 11) local = local.slice(1);
  else if (local.startsWith('52') && local.length === 12) local = local.slice(2);

  const words = lang === 'es' ? DIGITS_ES : DIGITS_EN;
  // Group as 3-3-4 for US, 3-3-4 for MX (close enough)
  const g1 = local.slice(0,3).split('').map(d=>words[+d]).join(' ');
  const g2 = local.slice(3,6).split('').map(d=>words[+d]).join(' ');
  const g3 = local.slice(6).split('').map(d=>words[+d]).join(' ');
  return [g1, g2, g3].filter(Boolean).join(', ');
}

function emailToPhonetic(emailStr) {
  if (!emailStr) return '';
  // alice@foo-bar.co.uk -> alice at foo dash bar dot co dot uk
  return emailStr
    .replace(/@/g, ' at ')
    .replace(/\./g, ' dot ')
    .replace(/-/g, ' dash ')
    .replace(/_/g, ' underscore ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// 3. CODE GENERATORS
// ============================================================================

function pascalCase(slug) {
  return slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}
function upperSnake(slug) {
  return slug.replace(/-/g, '_').toUpperCase();
}
function hexToRgb(hex) {
  const m = HEX_RE.exec(hex);
  if (!m) return '0,0,0';
  return parseInt(m[1].slice(0,2),16) + ',' + parseInt(m[1].slice(2,4),16) + ',' + parseInt(m[1].slice(4,6),16);
}

function generateCarouselSlot(form) {
  const tags = form.tags.map(t => '        <span>' + t + '</span>').join('\n');
  const ribbon = form.ribbon || 'FEATURED';
  const pas = pascalCase(form.slug);

  return [
    '  <div class="sponsor-slide" data-sponsor="' + form.slug + '">',
    '    <div class="card card-product-' + form.slug + '" onclick="open' + pas + 'Detail()" role="button" tabindex="0" aria-label="' + form.title + ' - LOAF sponsor">',
    '      <div class="ribbon-' + form.slug + '">' + ribbon + '</div>',
    '      <div class="product-icon" aria-hidden="true">',
    '        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="' + form.colors.border + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">',
    '          <circle cx="32" cy="32" r="22"/>',
    '          <path d="M32 14 V50 M14 32 H50"/>',
    '        </svg>',
    '      </div>',
    '      <h3>' + form.title + '</h3>',
    '      <div class="pitch">' + form.pitch + '</div>',
    '      <div class="meta">',
    tags,
    '      </div>',
    '    </div>',
    '  </div>'
  ].join('\n');
}

function generateCSS(form) {
  const s = form.slug, c = form.colors;
  const pRgb = hexToRgb(c.primary), sRgb = hexToRgb(c.secondary), bRgb = hexToRgb(c.border);

  return [
    '',
    '/* ============ ' + form.title + ' - sponsor card theme (auto-generated by Nadine) ============ */',
    '.card.card-product-' + s + '{position:relative;background:linear-gradient(135deg,' + c.primary + ' 0%,' + c.secondary + ' 70%,' + c.primary + ' 100%);color:#fff;border:2px solid ' + c.border + ';box-shadow:0 0 0 3px rgba(' + bRgb + ',.30),0 8px 24px rgba(' + pRgb + ',.55),0 0 40px rgba(' + sRgb + ',.35);animation:' + s + '-float 4s ease-in-out infinite,' + s + '-glow 2.8s ease-in-out infinite alternate;cursor:pointer;z-index:2;overflow:hidden}',
    '.card.card-product-' + s + '::before{content:"";position:absolute;inset:-2px;background:linear-gradient(90deg,transparent,rgba(' + bRgb + ',.55),transparent);background-size:200% 100%;animation:' + s + '-shimmer 3.4s linear infinite;pointer-events:none;z-index:0}',
    '.card.card-product-' + s + '>*{position:relative;z-index:1}',
    '.card.card-product-' + s + ' .ribbon-' + s + '{position:absolute;top:10px;right:-32px;background:' + c.border + ';color:' + c.primary + ';font-weight:900;font-size:10px;letter-spacing:1.4px;padding:4px 34px;transform:rotate(35deg);box-shadow:0 2px 6px rgba(0,0,0,.40)}',
    '.card.card-product-' + s + ' .product-icon{width:56px;height:56px;display:grid;place-items:center;background:rgba(255,255,255,.10);border:1px solid rgba(' + bRgb + ',.45);border-radius:12px;margin-bottom:12px}',
    '.card.card-product-' + s + ' .product-icon svg{width:38px;height:38px}',
    '.card.card-product-' + s + ' h3{font-size:18px;font-weight:900;margin:0 0 4px 0;letter-spacing:.4px;color:' + c.border + ';text-shadow:0 2px 6px rgba(0,0,0,.30)}',
    '.card.card-product-' + s + ' .pitch{font-size:12.5px;opacity:.95;line-height:1.4;color:#fff}',
    '.card.card-product-' + s + ' .meta{margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;font-size:10.5px}',
    '.card.card-product-' + s + ' .meta span{background:rgba(' + bRgb + ',.18);padding:3px 8px;border-radius:999px;border:1px solid rgba(' + bRgb + ',.50);color:' + c.border + ';font-weight:700}',
    '@keyframes ' + s + '-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-6px) rotate(-.3deg)}}',
    '@keyframes ' + s + '-glow{0%{box-shadow:0 0 0 3px rgba(' + bRgb + ',.25),0 8px 24px rgba(' + pRgb + ',.45),0 0 24px rgba(' + sRgb + ',.30)}100%{box-shadow:0 0 0 3px rgba(' + bRgb + ',.65),0 12px 32px rgba(' + pRgb + ',.75),0 0 60px rgba(' + sRgb + ',.65)}}',
    '@keyframes ' + s + '-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}',
    ''
  ].join('\n');
}

function generateDetailScreen(form) {
  const s = form.slug, pas = pascalCase(form.slug), c = form.colors;
  const o = form.owner || {};
  const callUS = o.phone_us ? '<a class="btn-px-call" href="tel:' + o.phone_us.replace(/\D/g,'').replace(/^/, '+') + '" onclick="track' + pas + 'Click(\'call-us\')">Call USA  ' + o.phone_us + '</a>' : '';
  const callMX = o.phone_mx ? '<a class="btn-px-call" href="tel:' + o.phone_mx.replace(/\D/g,'').replace(/^/, '+') + '" onclick="track' + pas + 'Click(\'call-mx\')">Llamar Mexico  ' + o.phone_mx + '</a>' : '';
  const wapp   = o.whatsapp ? '<a class="btn-px-whatsapp" href="https://wa.me/' + o.whatsapp.replace(/\D/g,'').replace(/^/, '+') + '" target="_blank" rel="noopener" onclick="track' + pas + 'Click(\'whatsapp\')">WhatsApp</a>' : '';
  const mail   = o.email ? '<a class="btn-px-email" href="mailto:' + o.email + '?subject=' + encodeURIComponent(form.title + ' - LOAF inquiry') + '" onclick="track' + pas + 'Click(\'email\')">Email</a>' : '';
  const web    = o.website ? '<a class="btn-px-call" href="' + o.website + '" target="_blank" rel="noopener" onclick="track' + pas + 'Click(\'site\')">Visit Site</a>' : '';

  return [
    '<!-- ============ ' + form.title + ' DETAIL SCREEN (auto-generated by Nadine) ============ -->',
    '<div class="screen" id="screen-' + s + '-detail">',
    '  <button class="back-btn" onclick="close' + pas + 'Detail()">Back</button>',
    '  <div style="background:linear-gradient(135deg,' + c.primary + ' 0%,' + c.secondary + ' 65%,' + c.primary + ' 100%);color:#fff;padding:24px 22px 30px;border-radius:12px 12px 0 0;border-bottom:3px solid ' + c.border + '">',
    '    <div style="font-size:11px;color:' + c.border + ';letter-spacing:2px;font-weight:800;text-transform:uppercase">' + (form.tagline || 'LOAF Sponsor') + '</div>',
    '    <h2 style="font-size:24px;font-weight:900;color:' + c.border + ';margin:6px 0 0 0;text-transform:uppercase;letter-spacing:.5px">' + form.title + '</h2>',
    '    <div style="font-size:13px;opacity:.95;margin-top:6px">' + (o.name || '') + (o.role ? ' - ' + o.role : '') + (o.location ? ' - ' + o.location : '') + '</div>',
    '  </div>',
    '  <div style="background:#fff;padding:22px;border:1px solid ' + c.secondary + ';border-top:none;border-radius:0 0 12px 12px;color:' + c.primary + '">',
    '',
    '    <div style="margin-bottom:18px">',
    '      <h4 style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:' + c.primary + ';margin:0 0 10px 0;font-weight:800;border-bottom:2px solid ' + c.border + ';padding-bottom:6px;display:inline-block">What this is</h4>',
    '      <p style="font-size:13.5px;line-height:1.55;margin:0;color:#0F1419">' + (form.long_description || form.pitch) + '</p>',
    '    </div>',
    '',
    '    <div style="margin-bottom:18px">',
    '      <h4 style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:' + c.primary + ';margin:0 0 10px 0;font-weight:800;border-bottom:2px solid ' + c.border + ';padding-bottom:6px;display:inline-block">Highlights / Lo destacado</h4>',
    '      <ul style="list-style:none;padding:0;margin:0">',
    (form.voice && form.voice.selling_points || []).map(sp => '        <li style="padding:6px 0 6px 22px;position:relative;font-size:13.5px;color:#0F1419;border-bottom:1px solid #f0e9e9">' + sp + '</li>').join('\n'),
    '      </ul>',
    '    </div>',
    '',
    '    <div style="background:' + c.primary + ';color:#fff;padding:14px 16px;border-radius:8px;margin-bottom:8px;border-left:4px solid ' + c.border + '">',
    '      <div style="font-weight:900;color:' + c.border + ';font-size:14px;letter-spacing:.3px">' + (o.name || '') + '</div>',
    (o.role ? '      <div style="font-size:11px;color:rgba(255,255,255,.85);letter-spacing:.5px;text-transform:uppercase;font-weight:600;margin-top:2px">' + o.role + '</div>' : ''),
    (o.phone_us ? '      <div style="font-size:13px;margin-top:4px;color:#fff"><b>USA</b> <a href="tel:+' + o.phone_us.replace(/\D/g,'') + '" style="color:' + c.border + '">' + o.phone_us + '</a></div>' : ''),
    (o.phone_mx ? '      <div style="font-size:13px;margin-top:4px;color:#fff"><b>Mexico</b> <a href="tel:+' + o.phone_mx.replace(/\D/g,'') + '" style="color:' + c.border + '">' + o.phone_mx + '</a></div>' : ''),
    (o.email ? '      <div style="font-size:13px;margin-top:4px;color:#fff"><b>Email</b> <a href="mailto:' + o.email + '" style="color:' + c.border + '">' + o.email + '</a></div>' : ''),
    (o.website ? '      <div style="font-size:13px;margin-top:4px;color:#fff"><b>Web</b> <a href="' + o.website + '" target="_blank" rel="noopener" style="color:' + c.border + '">' + o.website + '</a></div>' : ''),
    '    </div>',
    '',
    '    <div style="margin-top:14px;padding-top:14px;border-top:1px solid #e8eef3">',
    '      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:' + c.primary + ';font-weight:800;margin-bottom:8px">Listen / Escuche</div>',
    '      <div style="display:flex;gap:8px;flex-wrap:wrap">',
    '        <button onclick="speak' + pas + '(\'en\')"     style="background:' + c.secondary + ';color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">Listen in English</button>',
    '        <button onclick="speak' + pas + '(\'es\')"     style="background:' + c.border + ';color:' + c.primary + ';border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">Escuchar en Espanol</button>',
    '        <button onclick="stopSpeaking' + pas + '()"  style="background:#B91C1C;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">Stop / Parar</button>',
    '        <button onclick="close' + pas + 'Detail()"   style="background:' + c.primary + ';color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">Back</button>',
    '      </div>',
    '      <div id="' + s + '-narration-status" style="margin-top:10px;padding:8px 12px;background:rgba(' + hexToRgb(c.secondary) + ',.10);border-left:4px solid ' + c.secondary + ';font-size:12px;color:' + c.primary + ';border-radius:0 6px 6px 0;display:none;font-weight:600">',
    '        <span id="' + s + '-narration-text">Playing...</span>',
    '      </div>',
    '    </div>',
    '',
    '    <div style="margin-top:14px;padding-top:14px;border-top:1px solid #e8eef3">',
    '      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:' + c.primary + ';font-weight:800;margin-bottom:8px">Quick contact / Contacto directo</div>',
    '      <div style="display:flex;gap:8px;flex-wrap:wrap">',
    '        ' + [callUS, callMX, wapp, mail, web].filter(Boolean).join('\n        '),
    '      </div>',
    '    </div>',
    '  </div>',
    '</div>',
    '<!-- ============ END ' + form.title + ' DETAIL ============ -->',
    ''
  ].join('\n');
}

function generateVoiceScripts(form) {
  const o = form.owner || {};
  const phUS_en = phoneToPhonetic(o.phone_us, 'en');
  const phMX_en = phoneToPhonetic(o.phone_mx, 'en');
  const phUS_es = phoneToPhonetic(o.phone_us, 'es');
  const phMX_es = phoneToPhonetic(o.phone_mx, 'es');
  const em = emailToPhonetic(o.email);
  const sps = (form.voice && form.voice.selling_points) || [];

  const en = [
    form.title + '. ' + (form.voice.angle || form.pitch),
    'Hosted by ' + (o.name || 'our partner') + '. ' + (o.role ? o.role + '. ' : '') + (o.location ? 'Based in ' + o.location + '. ' : ''),
    sps.length ? 'Top reasons. ' + sps.map((sp,i)=> 'Number ' + (i+1) + '. ' + sp).join(' ') + '.' : '',
    'How to reach us. ' +
      (phUS_en ? 'United States, ' + phUS_en + '. ' : '') +
      (phMX_en ? 'Mexico, ' + phMX_en + '. ' : '') +
      (em ? 'Email, ' + em + '. ' : ''),
    form.voice.cta || 'Tap any contact button to reach out.',
    form.title + '.'
  ].filter(Boolean).join(' ');

  const en2es_role = o.role ? o.role + '. ' : '';
  const es = [
    form.title + '. ' + (form.voice.angle_es || form.voice.angle || form.pitch),
    'Conducido por ' + (o.name || 'nuestro socio') + '. ' + en2es_role + (o.location ? 'Basado en ' + o.location + '. ' : ''),
    sps.length ? 'Razones principales. ' + sps.map((sp,i)=> 'Numero ' + (i+1) + '. ' + sp).join(' ') + '.' : '',
    'Como contactarnos. ' +
      (phUS_es ? 'Estados Unidos, ' + phUS_es + '. ' : '') +
      (phMX_es ? 'Mexico, ' + phMX_es + '. ' : '') +
      (em ? 'Correo, ' + em + '. ' : ''),
    form.voice.cta_es || form.voice.cta || 'Presione cualquier boton de contacto.',
    form.title + '.'
  ].filter(Boolean).join(' ');

  return { en: en, es: es };
}

function generateJSHandlers(form) {
  const s = form.slug, pas = pascalCase(form.slug), upper = upperSnake(form.slug);
  const o = form.owner || {};
  const voice = generateVoiceScripts(form);

  // Determine routing payload
  const lr = form.lead_routing;
  const forwardField = (lr === 'saul-plus-sponsor' && form.sponsor_email)
      ? '\n          forward_to_sponsor: ' + JSON.stringify(form.sponsor_email) + ','
      : '';

  return [
    '',
    '  /* ============ ' + form.title + ' (auto-generated by Nadine) ============ */',
    '  var ' + s.replace(/-/g,'_') + 'Utter = null;',
    '  var ' + upper + '_SCRIPT_EN = ' + JSON.stringify(voice.en) + ';',
    '  var ' + upper + '_SCRIPT_ES = ' + JSON.stringify(voice.es) + ';',
    '',
    '  function show' + pas + 'Status(msg){',
    '    var st = document.getElementById("' + s + '-narration-status");',
    '    var tx = document.getElementById("' + s + '-narration-text");',
    '    if (tx) tx.textContent = msg; if (st) st.style.display = "block";',
    '  }',
    '  function hide' + pas + 'Status(){',
    '    var st = document.getElementById("' + s + '-narration-status");',
    '    if (st) st.style.display = "none";',
    '  }',
    '',
    '  window.open' + pas + 'Detail = function(){',
    '    show("screen-' + s + '-detail");',
    '    if (typeof window.pauseSponsorRotation === "function") window.pauseSponsorRotation();',
    '    try { window.track' + pas + 'Click && window.track' + pas + 'Click("open_detail"); } catch(e){}',
    '  };',
    '  window.close' + pas + 'Detail = function(){',
    '    stopSpeaking' + pas + '();',
    '    if (typeof window.showScreen === "function") return window.showScreen("screen-home");',
    '    show("screen-home");',
    '  };',
    '  window.speak' + pas + ' = function(forceLang){',
    '    if (!("speechSynthesis" in window)) { alert("Voice not supported."); return; }',
    '    if ("speechSynthesis" in window) window.speechSynthesis.cancel();',
    '    var useLang = forceLang || (lang === "es" ? "es" : "en");',
    '    var text = (useLang === "es") ? ' + upper + '_SCRIPT_ES : ' + upper + '_SCRIPT_EN;',
    '    var bcp = (useLang === "es") ? "es-MX" : "en-US";',
    '    ' + s.replace(/-/g,'_') + 'Utter = new SpeechSynthesisUtterance(text);',
    '    ' + s.replace(/-/g,'_') + 'Utter.lang = bcp; ' + s.replace(/-/g,'_') + 'Utter.rate = 0.95;',
    '    ' + s.replace(/-/g,'_') + 'Utter.onstart = function(){ show' + pas + 'Status(useLang === "es" ? "Reproduciendo en Espanol..." : "Playing in English..."); };',
    '    ' + s.replace(/-/g,'_') + 'Utter.onend   = function(){ hide' + pas + 'Status(); };',
    '    ' + s.replace(/-/g,'_') + 'Utter.onerror = function(){ hide' + pas + 'Status(); };',
    '    window.speechSynthesis.speak(' + s.replace(/-/g,'_') + 'Utter);',
    '    try { window.track' + pas + 'Click && window.track' + pas + 'Click("listen-" + useLang); } catch(e){}',
    '  };',
    '  window.stopSpeaking' + pas + ' = function(){',
    '    if ("speechSynthesis" in window) window.speechSynthesis.cancel();',
    '    hide' + pas + 'Status();',
    '  };',
    '',
    '  window.track' + pas + 'Click = function(method){',
    '    var notes = ' + JSON.stringify(form.title + ' ') + ' + method + ' + JSON.stringify(' tapped. Owner: ' + (o.name||'') + (o.phone_us?', '+o.phone_us:'') + (o.phone_mx?', '+o.phone_mx:'') + (o.email?', '+o.email:'') + '.') + ';',
    '    try {',
    '      fetch("/api/plastpac/inquiry", {',
    '        method: "POST",',
    '        headers: { "Content-Type": "application/json" },',
    '        body: JSON.stringify({',
    '          product_slug: ' + JSON.stringify(form.slug) + ',',
    '          source: ' + JSON.stringify('loaf-' + form.slug) + ',',
    '          contact_method: method,',
    '          company: ' + JSON.stringify('LOAF ' + form.title + ' Click') + ',',
    '          contact_name: "LOAF visitor",',
    '          email: "noreply@mfginc.com",',
    '          notes: notes,',
    '          status: "lead_clicked",',
    '          utm_source: "loaf", utm_medium: "sponsor_card",',
    '          utm_campaign: ' + JSON.stringify(form.slug.replace(/-/g,'_')) + ',' + forwardField,
    '          lead_routing: ' + JSON.stringify(lr) + '',
    '        }),',
    '        keepalive: true',
    '      }).catch(function(){});',
    '    } catch (e) {}',
    '    try { if (window.tickerToBrain) window.tickerToBrain(' + JSON.stringify('loaf.' + form.slug.replace(/-/g,'') + '.click') + ', { method: method, sponsor: ' + JSON.stringify(form.slug) + ', sponsor_owner: ' + JSON.stringify(o.name||'') + ', notes: notes }); } catch(e){}',
    '  };'
  ].join('\n');
}

// ============================================================================
// 4. FILE PATCHER
// ============================================================================

function readLoafHtml(loafPath) {
  if (!fs.existsSync(loafPath)) throw new Error('LOAF html not found at: ' + loafPath);
  return fs.readFileSync(loafPath, 'utf8');
}

function backupLoafHtml(loafPath) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const bak = loafPath + '.bak.' + ts;
  fs.copyFileSync(loafPath, bak);
  return bak;
}

function listExistingSponsors(loafPath) {
  const html = readLoafHtml(loafPath);
  const slots = [];
  const re = /data-sponsor="([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(html))) slots.push(m[1]);
  return Array.from(new Set(slots));
}

function applySponsorToFile(form, loafPath) {
  let html = readLoafHtml(loafPath);
  const _hadCRLF = html.indexOf('\r\n') >= 0;
  if (_hadCRLF) html = html.replace(/\r\n/g, '\n');

  // Idempotency check
  if (html.indexOf('data-sponsor="' + form.slug + '"') >= 0) {
    throw new Error('Sponsor "' + form.slug + '" already exists in LOAF html. Use a different slug or remove the existing first.');
  }

  // Generate parts
  const carouselSlot = generateCarouselSlot(form);
  const css = generateCSS(form);
  const detailScreen = generateDetailScreen(form);
  const jsHandlers = generateJSHandlers(form);

  // Anchor 1: insert carousel slot before "</div>\n\n<div class=\"sponsor-pager\""
  const ANCHOR_CAROUSEL = '</div>\n\n<div class="sponsor-pager"';
  if (html.indexOf(ANCHOR_CAROUSEL) < 0) throw new Error('Could not find carousel close anchor.');

  // Anchor 2: insert dot in pager before <button class="pause-btn"
  const existing = listExistingSponsors(loafPath);
  const newIdx = existing.length;  // zero-indexed; 5 existing => new is idx 5
  const newDot = '  <button class="dot" data-idx="' + newIdx + '" aria-label="Slide ' + (newIdx+1) + '"></button>\n';
  const ANCHOR_PAGER_PAUSE = '<button class="pause-btn"';

  // Anchor 3: insert CSS before "</style>"  (last </style> is the main one)
  const lastStyleClose = html.lastIndexOf('</style>');
  if (lastStyleClose < 0) throw new Error('Could not find </style> anchor.');

  // Anchor 4: insert detail screen before "<script" (the main IIFE script tag)
  // Use the LAST </div> followed by the main script. Look for "<!-- ============ END" of last sponsor detail.
  // Simpler: insert just before the line "  <script>" which is unique in our file. Fall back to <script id= or bottom of body.
  const ANCHOR_BEFORE_SCRIPT = /(\n)(<script[^>]*>)/;
  const scriptMatch = ANCHOR_BEFORE_SCRIPT.exec(html);
  if (!scriptMatch) throw new Error('Could not find <script> anchor for detail screen insertion.');

  // Anchor 5: insert JS handlers inside the IIFE, before the "/* retrofit existing trackers" or before final "})();"
  const ANCHOR_IIFE_END = '  /* ============ retrofit existing trackers';
  const ANCHOR_FALLBACK = '})();';

  // Build the new HTML
  let out = html;

  // 1. Insert carousel slot
  out = out.replace(ANCHOR_CAROUSEL, carouselSlot + '\n</div>\n\n<div class="sponsor-pager"');

  // 2. Insert pager dot
  out = out.replace(ANCHOR_PAGER_PAUSE, newDot + '  <button class="pause-btn"');

  // 3. Insert CSS
  const lastStyleCloseNew = out.lastIndexOf('</style>');
  out = out.slice(0, lastStyleCloseNew) + css + out.slice(lastStyleCloseNew);

  // 4. Insert detail screen before <script>
  out = out.replace(ANCHOR_BEFORE_SCRIPT, '$1' + detailScreen + '\n$2');

  // 5. Insert JS handlers
  if (out.indexOf(ANCHOR_IIFE_END) >= 0) {
    out = out.replace(ANCHOR_IIFE_END, jsHandlers + '\n\n' + ANCHOR_IIFE_END);
  } else if (out.indexOf(ANCHOR_FALLBACK) >= 0) {
    out = out.replace(ANCHOR_FALLBACK, jsHandlers + '\n' + ANCHOR_FALLBACK);
  } else {
    throw new Error('Could not find IIFE close to inject JS handlers.');
  }

  // Validate balanced tags
  const divOpen  = (out.match(/<div\b/g) || []).length;
  const divClose = (out.match(/<\/div>/g) || []).length;
  if (divOpen !== divClose) {
    throw new Error('Tag imbalance after patch: <div>=' + divOpen + ' </div>=' + divClose + ' - aborted.');
  }

  // Backup + write
  const bak = backupLoafHtml(loafPath);
  if (_hadCRLF) out = out.replace(/\n/g, '\r\n');
  fs.writeFileSync(loafPath, out, 'utf8');
  log('patched ' + loafPath + ' (sponsor=' + form.slug + ', size=' + out.length + ', backup=' + bak + ')');

  return {
    ok: true, sponsor: form.slug, slot_index: newIdx, backup: bak,
    new_size: out.length, old_size: html.length, generated: { css_len: css.length, js_len: jsHandlers.length }
  };
}

// ============================================================================
// 5. EMAIL ALERTS (Gmail API via routes/gmail.js)
// ============================================================================

async function sendAlert(subject, textBody) {
  const html = '<pre style="font-family:monospace;font-size:12px;line-height:1.5">' +
    textBody.replace(/</g,'&lt;') + '</pre>';
  // Try Gmail API first (Railway-safe)
  try {
    const gmailRoute = require('../routes/gmail');
    if (gmailRoute && typeof gmailRoute.gmailApiSend === 'function') {
      const info = await gmailRoute.gmailApiSend({
        to: SAUL_EMAIL,
        subject: subject,
        text: textBody,
        html: html,
        attachments: []
      });
      _state.emailsSent++;
      _state.lastEmailAt = new Date().toISOString();
      log('alert sent via Gmail API to ' + SAUL_EMAIL + ' (msg=' + info.messageId + ')');
      return { ok: true, via: 'gmail_api', messageId: info.messageId };
    }
  } catch (apiErr) {
    log('Gmail API failed, trying SMTP fallback: ' + apiErr.message);
  }
  // SMTP fallback
  try {
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: { user: process.env.SMTP_USER || 'sgarcia1911@gmail.com', pass: process.env.SMTP_PASS }
    });
    const info = await t.sendMail({
      from: '"Nadine LOAF Onboarding" <sgarcia1911@gmail.com>',
      to: SAUL_EMAIL,
      subject: subject,
      text: textBody
    });
    _state.emailsSent++;
    _state.lastEmailAt = new Date().toISOString();
    log('alert sent via SMTP to ' + SAUL_EMAIL);
    return { ok: true, via: 'smtp', messageId: info.messageId };
  } catch (smtpErr) {
    _state.emailErrors++;
    log('alert send failed (Gmail API + SMTP both): ' + smtpErr.message);
    return { ok: false, error: smtpErr.message };
  }
}

function buildFailedAttemptEmail(form, errors) {
  const lines = [];
  lines.push('NADINE - Sponsor Intake VALIDATION FAILED');
  lines.push('Time: ' + new Date().toISOString());
  lines.push('');
  lines.push('=== ATTEMPTED SPONSOR ===');
  lines.push('  slug    : ' + (form.slug || '(missing)'));
  lines.push('  title   : ' + (form.title || '(missing)'));
  lines.push('  pitch   : ' + (form.pitch ? form.pitch.slice(0, 200) : '(missing)'));
  lines.push('');
  if (form.owner) {
    lines.push('=== OWNER ===');
    lines.push('  name    : ' + (form.owner.name || '(missing)'));
    lines.push('  email   : ' + (form.owner.email || '(missing)'));
    lines.push('  phone US: ' + (form.owner.phone_us || '-'));
    lines.push('  phone MX: ' + (form.owner.phone_mx || '-'));
    lines.push('  whatsapp: ' + (form.owner.whatsapp || '-'));
    lines.push('  location: ' + (form.owner.location || '-'));
    lines.push('  website : ' + (form.owner.website || '-'));
  }
  lines.push('');
  lines.push('=== VALIDATION ERRORS (' + errors.length + ') ===');
  errors.forEach((e, i) => lines.push('  ' + (i+1) + '. ' + e));
  lines.push('');
  lines.push('=== RAW INTAKE ===');
  lines.push(JSON.stringify(form, null, 2));
  lines.push('');
  lines.push('-- Nadine v' + AGENT_VERSION + ', LOAF Sponsor Onboarding agent --');
  return lines.join('\n');
}

function buildAbandonmentEmail(slug, draft) {
  const ageMin = Math.round((Date.now() - draft.previewedAt) / 60000);
  const lines = [];
  lines.push('NADINE - Sponsor Intake ABANDONED');
  lines.push('Time: ' + new Date().toISOString());
  lines.push('');
  lines.push('A sponsor previewed intake ' + ageMin + ' minutes ago and never applied.');
  lines.push('');
  lines.push('=== SPONSOR ===');
  lines.push('  slug    : ' + slug);
  lines.push('  title   : ' + (draft.form.title || '-'));
  lines.push('  pitch   : ' + (draft.form.pitch || '').slice(0, 200));
  lines.push('');
  lines.push('=== OWNER (follow up) ===');
  if (draft.form.owner) {
    lines.push('  name    : ' + (draft.form.owner.name || '-'));
    lines.push('  email   : ' + (draft.form.owner.email || '-'));
    lines.push('  phone US: ' + (draft.form.owner.phone_us || '-'));
    lines.push('  phone MX: ' + (draft.form.owner.phone_mx || '-'));
    lines.push('  whatsapp: ' + (draft.form.owner.whatsapp || '-'));
  }
  lines.push('');
  lines.push('Reach out to close the deal. To finalize, POST the intake JSON to:');
  lines.push('  POST /api/nadine/sponsor/apply');
  lines.push('');
  lines.push('=== RAW INTAKE ===');
  lines.push(JSON.stringify(draft.form, null, 2));
  lines.push('');
  lines.push('-- Nadine v' + AGENT_VERSION + ', LOAF Sponsor Onboarding agent --');
  return lines.join('\n');
}

async function checkAbandonments() {
  const now = Date.now();
  const stale = [];
  for (const [slug, draft] of _state.drafts.entries()) {
    if (now - draft.previewedAt >= ABANDONMENT_MS && !draft.alerted) {
      stale.push({ slug, draft });
      draft.alerted = true;  // mark so we only alert once
    }
  }
  for (const { slug, draft } of stale) {
    try {
      await sendAlert(
        '[Nadine] Sponsor intake ABANDONED: ' + slug,
        buildAbandonmentEmail(slug, draft)
      );
    } catch (err) {
      log('abandonment email failed for ' + slug + ': ' + err.message);
    }
  }
  if (stale.length > 0) log('alerted ' + stale.length + ' abandoned draft(s)');
}

// ============================================================================
// 6. ROUTES
// ============================================================================

function registerRoutes(app) {
  app.get('/api/nadine/health', (req, res) => {
    res.json({
      ok: true, agent: AGENT_NAME, version: AGENT_VERSION,
      startedAt: _state.startedAt, sponsorsAddedThisSession: _state.sponsorsAddedThisSession,
      lastError: _state.lastError, loafHtmlPath: _state.loafHtmlPath,
      drafts_pending: _state.drafts.size,
      failed_attempts_total: _state.failedAttempts.length,
      emails_sent: _state.emailsSent,
      last_email_at: _state.lastEmailAt,
      email_errors: _state.emailErrors,
      abandonment_threshold_min: ABANDONMENT_MS / 60000
    });
  });

  app.get('/api/nadine/sponsors', (req, res) => {
    try {
      const list = listExistingSponsors(_state.loafHtmlPath);
      res.json({ ok: true, count: list.length, sponsors: list });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/nadine/playbook', (req, res) => {
    res.json({
      ok: true,
      version: AGENT_VERSION,
      intake_schema: {
        slug: 'kebab-case alphanumeric, e.g. "tuntan-erendira"',
        title: 'string 3-40 chars',
        pitch: 'string 20-240 chars (carousel body)',
        tags: 'array of 2-4 short strings',
        ribbon: 'optional string e.g. "FEATURED" / "CLUB" / "NEW WAVE"',
        tagline: 'optional string for detail hero label',
        long_description: 'optional longer prose for detail screen',
        owner: {
          name: 'required string',
          role: 'optional string',
          phone_us: 'optional string with country code',
          phone_mx: 'optional string with country code',
          whatsapp: 'optional string with country code',
          email: 'optional valid email',
          location: 'optional string',
          website: 'optional URL'
        },
        colors: {
          primary: '#RRGGBB',
          secondary: '#RRGGBB',
          border: '#RRGGBB'
        },
        lead_routing: 'one of: saul-only | saul-plus-sponsor | hector-plus-saul | custom',
        sponsor_email: 'required if lead_routing = saul-plus-sponsor',
        voice: {
          angle: 'one-line pitch (English)',
          angle_es: 'optional one-line pitch (Spanish)',
          selling_points: 'array of 1-5 bullet selling points',
          cta: 'call to action (English)',
          cta_es: 'optional call to action (Spanish)'
        }
      },
      available_palettes: BRAND_PALETTES,
      taken_palettes: TAKEN_PALETTES
    });
  });

  app.post('/api/nadine/sponsor', async (req, res) => {
    const form = req.body || {};
    const errors = validateIntake(form);
    if (errors.length) {
      // Track failed attempt + email Saul
      _state.failedAttempts.push({ form, errors, at: new Date().toISOString() });
      if (_state.failedAttempts.length > 50) _state.failedAttempts.shift();
      sendAlert(
        '[Nadine] Sponsor intake FAILED: ' + (form.slug || 'no-slug'),
        buildFailedAttemptEmail(form, errors)
      ).catch(err => log('failed-attempt email error: ' + err.message));
      return res.status(400).json({ ok: false, errors: errors });
    }
    try {
      const generated = {
        carousel_slot : generateCarouselSlot(form),
        css           : generateCSS(form),
        detail_screen : generateDetailScreen(form),
        js_handlers   : generateJSHandlers(form),
        voice_scripts : generateVoiceScripts(form)
      };
      // Track as draft until /apply is called
      _state.drafts.set(form.slug, {
        form: form,
        previewedAt: Date.now(),
        alerted: false
      });
      log('draft tracked: ' + form.slug + ' (will alert if not applied within ' + (ABANDONMENT_MS/60000) + ' min)');
      res.json({ ok: true, sponsor: form.slug, mode: 'preview', generated: generated });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/nadine/sponsor/apply', (req, res) => {
    const form = req.body || {};
    const errors = validateIntake(form);
    if (errors.length) {
      _state.failedAttempts.push({ form, errors, at: new Date().toISOString() });
      if (_state.failedAttempts.length > 50) _state.failedAttempts.shift();
      sendAlert(
        '[Nadine] Sponsor APPLY validation FAILED: ' + (form.slug || 'no-slug'),
        buildFailedAttemptEmail(form, errors)
      ).catch(err => log('apply-failed email error: ' + err.message));
      return res.status(400).json({ ok: false, errors: errors });
    }
    try {
      const result = applySponsorToFile(form, _state.loafHtmlPath);
      _state.sponsorsAddedThisSession++;
      _state.lastError = null;
      // Clear from draft tracker - successfully applied
      if (_state.drafts.has(form.slug)) {
        _state.drafts.delete(form.slug);
        log('draft cleared (applied): ' + form.slug);
      }
      res.json(result);
    } catch (err) {
      _state.lastError = err.message;
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Inspect draft tracker
  app.get('/api/nadine/drafts', (req, res) => {
    const drafts = [];
    for (const [slug, draft] of _state.drafts.entries()) {
      drafts.push({
        slug: slug,
        title: draft.form.title,
        owner_name: draft.form.owner ? draft.form.owner.name : null,
        owner_email: draft.form.owner ? draft.form.owner.email : null,
        previewed_at: new Date(draft.previewedAt).toISOString(),
        age_minutes: Math.round((Date.now() - draft.previewedAt) / 60000),
        alerted: draft.alerted
      });
    }
    res.json({
      ok: true,
      count: drafts.length,
      abandonment_threshold_min: ABANDONMENT_MS / 60000,
      drafts: drafts,
      failed_attempts_recent: _state.failedAttempts.slice(-10)
    });
  });

  // Manual abandonment check trigger (testing)
  app.post('/api/nadine/check-abandonments', async (req, res) => {
    await checkAbandonments();
    res.json({ ok: true, drafts_remaining: _state.drafts.size });
  });

  // Test email send
  app.post('/api/nadine/email/test', async (req, res) => {
    const result = await sendAlert(
      '[Nadine] Test email from agent',
      'Nadine test email\nTime: ' + new Date().toISOString() + '\nIf you see this, the Gmail API + SMTP fallback chain is working.'
    );
    res.json(result);
  });
}

// ============================================================================
// 6. INIT
// ============================================================================

function init(app, pool) {
  if (!app) {
    console.error('[' + AGENT_NAME + '] init requires (app, pool)');
    return;
  }
  registerRoutes(app);
  // Start abandonment poller
  setInterval(() => {
    checkAbandonments().catch(err => log('abandonment poll error: ' + err.message));
  }, ABANDONMENT_CHECK_MS);
  log('ONLINE - LOAF html path = ' + _state.loafHtmlPath);
  log('abandonment monitor: alert after ' + (ABANDONMENT_MS/60000) + ' min, poll every ' + (ABANDONMENT_CHECK_MS/60000) + ' min');
  log('alert email = ' + SAUL_EMAIL);
  log('endpoints: GET /api/nadine/health | GET /api/nadine/sponsors | GET /api/nadine/playbook | GET /api/nadine/drafts | POST /api/nadine/sponsor | POST /api/nadine/sponsor/apply | POST /api/nadine/check-abandonments | POST /api/nadine/email/test');
}

module.exports = {
  init, validateIntake, generateCarouselSlot, generateCSS, generateDetailScreen,
  generateJSHandlers, generateVoiceScripts, applySponsorToFile, listExistingSponsors,
  phoneToPhonetic, emailToPhonetic, sendAlert, checkAbandonments, _state
};
