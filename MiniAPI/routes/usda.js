import fs from "fs";
router.get("/certificates", async (req,res) => {
  const files = fs.readdirSync("uploads/usda_certificates/");
  res.json({ files });
});