const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const generateReceipt = async (uploadInfo) => {
  const doc = new PDFDocument();
  const filename = \\_receipt.pdf\;
  const filepath = path.join(__dirname, '..', 'receipts', filename);

  const qrData = \AuditDNA Upload: \ | \\;
  const qrImage = await QRCode.toDataURL(qrData);

  // Ensure receipts folder exists
  fs.mkdirSync(path.join(__dirname, '..', 'receipts'), { recursive: true });

  const writeStream = fs.createWriteStream(filepath);
  doc.pipe(writeStream);

  doc.fontSize(20).text('?? AuditDNA Upload Receipt', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(\Filename: \\);
  doc.text(\MIME Type: \\);
  doc.text(\Size: \ bytes\);
  doc.text(\Upload Time: \\);
  doc.moveDown();

  doc.text('QR Code:', { underline: true });
  doc.image(Buffer.from(qrImage.split(",")[1], 'base64'), { fit: [150, 150] });

  doc.end();

  return filepath;
};

module.exports = { generateReceipt };
