/**
 * backend/tests/e2e_run_and_verify.js
 *
 * End-to-end test:
 *  - Uploads an existing sample file to /api/verify/upload
 *  - Polls /api/verify/report/:verification_id until status != 'pending' or timeout
 *
 * Usage:
 *   node backend/tests/e2e_run_and_verify.js
 *
 * Environment:
 *   API_BASE (optional, default http://localhost:4000)
 *   GROWER_ID (optional, default placeholder)
 *
 * NOTE: Ensure backend server is running before executing.
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE || process.env.REACT_APP_API_URL || 'http://localhost:4000';
const GROWER_ID = process.env.GROWER_ID || '00000000-0000-0000-0000-000000000000';
const SAMPLE_FILE = path.join(__dirname, '..', 'samples', 'sample_lab_complex.pdf');
const PRODUCT = 'Avocados';
const POLL_INTERVAL_MS = 5000;
const TIMEOUT_MS = 120000; // 2 minutes

async function uploadSample() {
  if (!fs.existsSync(SAMPLE_FILE)) {
    console.error('Sample file not found:', SAMPLE_FILE);
    process.exit(2);
  }
  const form = new FormData();
  form.append('file', fs.createReadStream(SAMPLE_FILE));
  form.append('grower_id', GROWER_ID);
  form.append('product', PRODUCT);
  form.append('lot_number', 'LOT-E2E-001');
  form.append('destination_country', 'USA');

  console.log('Uploading sample to', `${API_BASE}/api/verify/upload`);
  const headers = form.getHeaders();
  const res = await axios.post(`${API_BASE}/api/verify/upload`, form, { headers });
  return res.data;
}

async function pollReport(verification_id) {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    try {
      const res = await axios.get(`${API_BASE}/api/verify/report/${encodeURIComponent(verification_id)}`);
      const v = res.data.verification;
      console.log('Polled status:', v.status, 'overall_score=', v.analysis_report?.overall_score);
      if (v.status && v.status !== 'pending') {
        return v;
      }
    } catch (e) {
      console.error('Poll error (ignored):', e.message);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Timeout waiting for verification to complete');
}

(async () => {
  try {
    const uploadRes = await uploadSample();
    console.log('Upload response:', uploadRes);
    const verification_id = uploadRes.verification_id || uploadRes.verificationId || uploadRes.id;
    if (!verification_id) {
      console.error('No verification_id returned by upload.');
      process.exit(3);
    }
    console.log('Verification ID:', verification_id);
    console.log('Polling for analysis to complete (timeout 2 mins) ...');
    const report = await pollReport(verification_id);
    console.log('FINAL REPORT:', JSON.stringify(report, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('E2E failed:', e);
    process.exit(4);
  }
})();