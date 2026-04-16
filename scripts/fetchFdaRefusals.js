import axios from "axios";
import csv from "csv-parser";
import fs from "fs";
import mongoose from "mongoose";
import Safety from "../models/Safety.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// FDA data source (CSV or API)
const fdaUrl = "https://www.accessdata.fda.gov/scripts/ImportRefusals/ir_by_country.cfm?format=csv";

async function downloadCSV() {
  const response = await axios.get(fdaUrl, { responseType: "stream" });
  const filePath = "./downloads/fda_refusals.csv";
  response.data.pipe(fs.createWriteStream(filePath));
  return new Promise((resolve) => response.data.on("end", resolve));
}

async function parseCSV() {
  const results = [];
  fs.createReadStream("./downloads/fda_refusals.csv")
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      // Map results to Safety model fields and insertMany
      await Safety.insertMany(results);
      mongoose.disconnect();
    });
}

async function run() {
  await mongoose.connect(MONGO_URI);
  await downloadCSV();
  await parseCSV();
}

run();
