const express = require("express");
const router = express.Router();

// Sample loan match route
router.get("/", (req, res) => {
  res.json({ message: " LoanMatch route live" });
});

module.exports = router;
