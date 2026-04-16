import axios from "axios";
import csv from "csv-parser";
import fs from "fs";
import mongoose from "mongoose";
import Import from "../models/Import.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// Example bulk CSV download from FAS GATS
const fasUrl = "https://apps.fas.usda.gov/gats/ExpressQuery1.aspx?format=csv&...";

async function downloadCSV() {
  const response = await axios.get(fasUrl, { responseType: "stream" });
  const filePath = "./downloads/fas_imports.csv";
  response.data.pipe(fs.createWriteStream(filePath));
  return new Promise((resolve) => response.data.on("end", resolve));
}

async function parseCSV() {
  const results = [];
  fs.createReadStream("./downloads/fas_imports.csv")
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      // Map results to Import model fields and insertMany
      await Import.insertMany(results);
      mongoose.disconnect();
    });
}

async function run() {
  await mongoose.connect(MONGO_URI);
  await downloadCSV();
  await parseCSV();
}

run();
