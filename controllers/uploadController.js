const path = require('path');
const Upload = require('../models/Upload');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const { generateReceipt } = require('../utils/receiptGenerator');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const uploadFile = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const newUpload = await Upload.create({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    await generateReceipt(newUpload);

    const emailMsg = {
      to: process.env.SENDGRID_SENDER,
      from: process.env.SENDGRID_SENDER,
      subject: \?? AuditDNA Upload: \\,
      text: \File: \\nType: \\nSize: \\nUploaded.\,
    };
    await sgMail.send(emailMsg);

    await twilioClient.messages.create({
      body: \AuditDNA - File uploaded: \\,
      from: process.env.TWILIO_PHONE,
      to: process.env.NOTIFY_SMS_ADMIN,
    });

    res.json({ message: '? File uploaded, logged, receipt generated' });
  } catch (error) {
    console.error('? Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

module.exports = { uploadFile };
