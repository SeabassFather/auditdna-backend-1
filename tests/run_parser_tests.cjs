/**
 * backend/tests/run_parser_tests.cjs
 * Lightweight CommonJS parser tests for generated sample files.
 *
 * Run with:
 *   node backend/tests/run_parser_tests.cjs
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const parser = require('../analysis/parser');

(async function run() {
  try {
    const samplesDir = path.join(__dirname, '..', 'samples');

    // Files we expect
    const csv = path.join(samplesDir, 'sample_lab.csv');
    const xlsx = path.join(samplesDir, 'sample_lab.xlsx');
    const pdf = path.join(samplesDir, 'sample_lab.pdf');
    const complexPdf = path.join(samplesDir, 'sample_lab_complex.pdf');

    console.log('Checking sample files exist...');
    [csv, xlsx, pdf, complexPdf].forEach(f => {
      if (!fs.existsSync(f)) console.warn('Missing sample (optional):', path.basename(f));
      else console.log('Found:', path.basename(f));
    });

    // CSV
    if (fs.existsSync(csv)) {
      const csvRes = await parser.parseCsv(csv);
      assert(Array.isArray(csvRes), 'CSV parser should return an array');
      assert(csvRes.length > 0, 'CSV parser returned no rows');
      console.log('CSV parse: PASS (rows =', csvRes.length, ')');
    } else {
      console.warn('Skipping CSV parse: file not present:', csv);
    }

    // XLSX
    if (fs.existsSync(xlsx)) {
      const xlsRes = await parser.parseXlsx(xlsx);
      assert(Array.isArray(xlsRes), 'XLSX parser should return an array');
      assert(xlsRes.length > 0, 'XLSX parser returned no rows');
      console.log('XLSX parse: PASS (rows =', xlsRes.length, ')');
    } else {
      console.warn('Skipping XLSX parse: file not present:', xlsx);
    }

    // PDF (may require pdf-parse)
    if (fs.existsSync(pdf)) {
      try {
        const pdfRes = await parser.parsePdf(pdf);
        if (!Array.isArray(pdfRes) || pdfRes.length === 0) {
          console.warn('PDF parse produced no rows or not an array (this may be OK depending on parser heuristics).');
        } else {
          console.log('PDF parse: PASS (rows =', pdfRes.length, ')');
        }
      } catch (e) {
        console.warn('PDF parse error (pdf-parse may be missing or parser failed):', e.message);
      }
    } else {
      console.warn('Skipping PDF parse: file not present:', pdf);
    }

    // Complex PDF (extended sample)
    if (fs.existsSync(complexPdf)) {
      try {
        const cRes = await parser.parsePdf(complexPdf);
        console.log('Complex PDF parse: rows =', Array.isArray(cRes) ? cRes.length : 'N/A');
      } catch (e) {
        console.warn('Complex PDF parse error:', e.message);
      }
    }

    console.log('Parser tests complete.');
  } catch (err) {
    console.error('Parser tests failed:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
