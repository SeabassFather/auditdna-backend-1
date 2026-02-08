import express from 'express';
import fetch from 'node-fetch';
const router = express.Router();

// This is placeholder — replace with real D&B keys later.
const DNB_API_KEY = process.env.DNB_API_KEY || "YOUR_DNB_API_KEY_HERE";

router.post('/lookup', async (req, res) => {
  const { businessName, city, state } = req.body;

  try {
    // This is the standard D&B structure.
    const response = await fetch(`https://api.dnb.com/v1/businesses/search?businessName=${businessName}&city=${city}&state=${state}`, {
      headers: {
        "Authorization": `Bearer ${DNB_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    return res.json({ success: true, data });

  } catch (err) {
    console.error("D&B Lookup Error:", err);
    return res.status(500).json({
      success: false,
      error: "D&B lookup failed"
    });
  }
});

export default router;
