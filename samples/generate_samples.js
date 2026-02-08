/**
 * backend/samples/generate_samples.js
 *
 * Generates 3 sample lab files for testing the parser:
 *  - CSV:  backend/samples/sample_lab.csv
 *  - XLSX: backend/samples/sample_lab.xlsx
 *  - PDF:  backend/samples/sample_lab.pdf
 *
 * Uses: xlsx, pdfkit
 *
 * Run:
 *   node backend/samples/generate_samples.js
 *
 * The produced files are simple but realistic and match the parser heuristic
 * (lines containing "Parameter  <number>  unit").
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');

const outDir = path.join(__dirname);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// CSV
const csvPath = path.join(outDir, 'sample_lab.csv');
const csvLines = [
  'Parameter,Result,Unit,Method,Lab',
  'Lead (Pb),0.02,mg/kg,EPA 200.8,AcmeLab',
  'E.coli,12,CFU/100g,ISO 16649,AcmeLab',
  'Glyphosate,0.04,mg/kg,QuEChERS,AcmeLab',
];
fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
console.log('Wrote', csvPath);

// XLSX
const xlsxPath = path.join(outDir, 'sample_lab.xlsx');
const sheetData = [
  ['Parameter', 'Result', 'Unit', 'Method', 'Lab'],
  ['Lead (Pb)', 0.02, 'mg/kg', 'EPA 200.8', 'AcmeLab'],
  ['E.coli', 12, 'CFU/100g', 'ISO 16649', 'AcmeLab'],
  ['Glyphosate', 0.04, 'mg/kg', 'QuEChERS', 'AcmeLab'],
];
const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet(sheetData);
xlsx.utils.book_append_sheet(wb, ws, 'Results');
xlsx.writeFile(wb, xlsxPath);
console.log('Wrote', xlsxPath);

// PDF
const pdfPath = path.join(outDir, 'sample_lab.pdf');
const doc = new PDFDocument({ size: 'A4', margin: 50 });
const stream = fs.createWriteStream(pdfPath);
doc.pipe(stream);

doc.fontSize(18).text('Laboratory Report - AcmeLab', { align: 'center' });
doc.moveDown();

doc.fontSize(12);
doc.text('Sample ID: SAMP-001', { continued: false });
doc.text('Product: Avocados');
doc.text('Lot: LOT-2025-10');

doc.moveDown();
doc.font('Helvetica-Bold').text('Results:', { underline: true });
doc.moveDown(0.5);
doc.font('Helvetica');

// Write lines that the parser's regex should match
const pdfLines = [
  'Lead (Pb)                      0.02   mg/kg   EPA 200.8',
  'E.coli                         12     CFU/100g  ISO 16649',
  'Glyphosate                     0.04   mg/kg   QuEChERS',
];

pdfLines.forEach(l => {
  doc.text(l);
  doc.moveDown(0.2);
});

doc.moveDown();
doc.font('Helvetica-Oblique').fontSize(10).text('End of report.');

doc.end();

stream.on('finish', () => {
  console.log('Wrote', pdfPath);
  console.log('All sample files generated in', outDir);
});