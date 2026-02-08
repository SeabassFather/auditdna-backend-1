import express from "express";
import { COMMODITIES } from "../../../frontend/src/data/commoditiesData.js";

const router = express.Router();

router.get("/top50", (req, res) => {
  res.json(COMMODITIES);
});

export default router;
