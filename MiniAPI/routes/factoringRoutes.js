import express from 'express';
const router = express.Router();

// Submit invoice for factoring
router.post('/submit', async (req, res) => {
  const { invoice } = req.body;
  
  // TODO: Save submission to DB
  // TODO: Notify factoring company via email/portal
  
  return res.json({
    success: true,
    message: "Invoice submitted for factoring.",
    invoiceId: invoice.id,
    status: "pending_review"
  });
});

// Factoring company approves/declines
router.post('/review', async (req, res) => {
  const { invoiceId, decision } = req.body;
  
  // TODO: Update DB decision
  
  return res.json({
    success: true,
    invoiceId,
    decision
  });
});

export default router;

