import express from 'express';
import Grower from '../models/Grower.js';

const router = express.Router();

// GET /api/growers?country=Mexico&commodity=Avocado&cert_status=Valid
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.country) query.country = new RegExp(req.query.country, 'i');
    if (req.query.commodity) query.commodity = { $in: [new RegExp(req.query.commodity, 'i')] };
    if (req.query.cert_status) query.cert_status = new RegExp(req.query.cert_status, 'i');
    if (req.query.food_safety_status) query.food_safety_status = new RegExp(req.query.food_safety_status, 'i');
    const growers = await Grower.find(query);
    res.json(growers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;