const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "AuditDNA Backend Online" }));

app.get("/dashboard/stats", (req, res) => {
  res.json({
    stats: [],
    tickers: {
      mortgage: [
        { label: "30Y Fixed", value: "6.94%", change: "-0.02", isPositive: false },
        { label: "15Y Fixed", value: "6.23%", change: "+0.01", isPositive: true }
      ],
      commodities: [
        { label: "Corn", value: "$473.25", change: "+1.10", isPositive: true },
        { label: "Wheat", value: "$604.75", change: "+0.75", isPositive: true }
      ],
      markets: [
        { label: "S&P 500", value: "5,510", change: "+12", isPositive: true },
        { label: "NASDAQ", value: "23,784", change: "-31", isPositive: false }
      ]
    }
  });
});

app.post("/services/request", (req, res) => {
  console.log("Service request:", req.body);
  res.json({ success: true, requestId: "REQ-" + Date.now() });
});

app.post("/documents/upload", (req, res) => {
  res.json({ success: true, documentId: "DOC-" + Date.now() });
});

const PORT = 5050;
app.listen(PORT, () => console.log(`AuditDNA Backend running on http://localhost:${PORT}`));
