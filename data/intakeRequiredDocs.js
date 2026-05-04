// ============================================================================
// INTAKE REQUIRED DOCS - Backend Wrapper
// File: C:\AuditDNA\backend\data\intakeRequiredDocs.js
// Re-exports the per-mode catalogs as CommonJS so intake.routes.js can require
// ============================================================================

// IMPORTANT: These two files (spartanRequiredDocs.js, trojanRequiredDocs.js)
// are written using ES module syntax (export default).
// We support both by importing once and re-exporting on either shape.

let spartan;
let trojan;

try {
  const sp = require('./spartanRequiredDocs');
  spartan = sp.SPARTAN_REQUIRED_DOCS || sp.default || sp;
} catch (e) {
  console.error('[intakeRequiredDocs] failed to load spartan catalog:', e.message);
  spartan = {};
}

try {
  const tr = require('./trojanRequiredDocs');
  trojan = tr.TROJAN_REQUIRED_DOCS || tr.default || tr;
} catch (e) {
  console.error('[intakeRequiredDocs] failed to load trojan catalog:', e.message);
  trojan = {};
}

module.exports = {
  spartanRequiredDocs: spartan,
  trojanRequiredDocs:  trojan,
};
