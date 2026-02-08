/**
 * backend/samples/generate_extended_samples.js
 *
 * Generates extended sample lab files for parser testing:
 *  - sample_lab_complex.csv
 *  - sample_lab_complex.xlsx
 *  - sample_lab_complex.pdf  (multi-table text layout)
 *
 * Run:
 *   node backend/samples/generate_extended_samples.js
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');

const outDir = path.join(__dirname);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// CSV (complex: additional columns)
const csvPath = path.join(outDir, 'sample_lab_complex.csv');
const csvLines = [
  'SampleID,Parameter,Result,Unit,LOD,Method,Lab,Notes',
  'SAMP-EXT-001,Lead (Pb),0.018,mg/kg,0.001,EPA 200.8,AcmeLab,"result reported; duplicate checked"',
  'SAMP-EXT-001,E.coli,5,CFU/100g,1,ISO 16649,AcmeLab,"colony count reported after enrichment"',
  'SAMP-EXT-001,Glyphosate,0.035,mg/kg,0.005,QuEChERS,AcmeLab,"QC acceptable"',
  'SAMP-EXT-001,Total Coliforms,12,CFU/100g,1,ISO 9308,AcmeLab,"indicator organism"',
];
fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
console.log('Wrote', csvPath);

// XLSX (complex sheet with multiple sections)
const xlsxPath = path.join(outDir, 'sample_lab_complex.xlsx');
const sheetData = [
  ['SampleID','Parameter','Result','Unit','LOD','Method','Lab'],
  ['SAMP-EXT-001','Lead (Pb)',0.018,'mg/kg',0.001,'EPA 200.8','AcmeLab'],
  ['SAMP-EXT-001','E.coli',5,'CFU/100g',1,'ISO 16649','AcmeLab'],
  ['SAMP-EXT-001','Glyphosate',0.035,'mg/kg',0.005,'QuEChERS','AcmeLab'],
  [],
  ['Notes', 'Analyst', 'Date'],
  ['All results verified', 'Analyst A', '2025-10-29']
];
const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet(sheetData);
xlsx.utils.book_append_sheet(wb, ws, 'Results');
xlsx.writeFile(wb, xlsxPath);
console.log('Wrote', xlsxPath);

// PDF (complex layout with header + two tables + footer)
const pdfPath = path.join(outDir, 'sample_lab_complex.pdf');
const doc = new PDFDocument({ size: 'A4', margin: 50 });
const stream = fs.createWriteStream(pdfPath);
doc.pipe(stream);

doc.fontSize(18).text('AcmeLab - Extended Laboratory Report', { align: 'center' });
doc.moveDown();
doc.fontSize(10).text('Report ID: EXT-2025-001      Sample: SAMP-EXT-001      Product: Avocados', { align: 'left' });
doc.moveDown();

doc.fontSize(12).text('Chemical Analysis', { underline: true });
doc.moveDown(0.5);

const chemLines = [
  'Parameter                   Result     Unit     LOD     Method',
  'Lead (Pb)                   0.018      mg/kg    0.001   EPA 200.8',
  'Glyphosate                  0.035      mg/kg    0.005   QuEChERS',
  'Arsenic (As)                0.005      mg/kg    0.001   ICP-MS',
];

chemLines.forEach(l => { doc.text(l); doc.moveDown(0.2); });

doc.moveDown();
doc.fontSize(12).text('Microbiological Analysis', { underline: true });
doc.moveDown(0.5);

const microLines = [
  'Parameter                   Result     Unit       Method',
  'E.coli                      5          CFU/100g   ISO 16649',
  'Total Coliforms             12         CFU/100g   ISO 9308',
  'Salmonella                  ND         per 25g    ISO 6579',
];

microLines.forEach(l => { doc.text(l); doc.moveDown(0.2); });

doc.moveDown();
doc.fontSize(10).text('Notes: ND = Not Detected. LOD = Limit of Detection. Methods and units as indicated.', { italics: true });
doc.end();

stream.on('finish', () => {
  console.log('Wrote', pdfPath);
  console.log('All extended sample files generated in', outDir);
});