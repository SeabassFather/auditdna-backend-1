// backend/MiniAPI/routes/fueloil.js
import express from "express";
const router = express.Router();

router.post("/api/ai/fuel-oil", async (req, res) => {
  const { fuel, oil } = req.body;
  console.log("Fuel & Oil Data Received:", { fuel, oil });

  res.json({
    EcoIndex: 92,
    RiskFlags: ["Low Wear", "Efficient Fuel Burn"],
    Recommendations: [
      "Maintain oil viscosity levels within standard range.",
      "Inspect injectors for minor fuel dilution.",
      "Fuel use efficiency optimal: no leak detected."
    ],
    Timestamp: new Date().toISOString()
  });
});

export default router;

