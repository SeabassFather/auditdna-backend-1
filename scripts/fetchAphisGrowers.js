import axios from "axios";
import pdf from "pdf-parse";
import fs from "fs";
import mongoose from "mongoose";
import Grower from "../models/Grower.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// Example: Download and parse the Avocado Mexico PDF grower list from APHIS
const url = "https://www.aphis.usda.gov/plant_health/plant_export/downloads/Avocado-Mexico-Approved-Growers.pdf";
const pdfPath = "./downloads/Avocado-Mexico-Approved-Growers.pdf";

async function downloadPDF() {
  const response = await axios({ url, responseType: "stream" });
  response.data.pipe(fs.createWriteStream(pdfPath));
  return new Promise((resolve) => response.data.on("end", resolve));
}

async function parsePDF() {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  // TODO: Write regex/parser for grower fields from data.text
  // Example: const lines = data.text.split('\n');
  // Parse and upsert to MongoDB
}

async function run() {
  await mongoose.connect(MONGO_URI);
  await downloadPDF();
  await parsePDF();
  mongoose.disconnect();
}

run();
