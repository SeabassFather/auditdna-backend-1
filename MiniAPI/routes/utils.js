import express from 'express';
import { sendReportEmail } from '../utils/emailService.js';
const router = express.Router();

router.post('/email-report', async (req, res) => {
  try {
    const { reportName } = req.body;
    const response = await sendReportEmail(reportName);
    res.json(response);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

