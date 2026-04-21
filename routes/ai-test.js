const express = require("express");
const router = express.Router();
const executionEngine = require("../ai-core/orchestrator/executionEngine");

router.get("/", async (req, res) => {
  try {
    const result = await executionEngine.executeAgent("dev-repair-agent", {
      issue: "Test execution",
      timestamp: Date.now()
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

