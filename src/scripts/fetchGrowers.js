import axios from 'axios';
import cheerio from 'cheerio';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Grower from '../models/Grower.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function fetchAPHISMexicoAvocadoGrowers() {
  const url = 'https://www.aphis.usda.gov/plant_health/plant_export/downloads/Avocado-Mexico-Approved-Growers.pdf';
  // For demonstration — recommend using pdf-parse or similar to extract from PDF.
  // For HTML/APIs, use axios + cheerio as below.

  // Placeholder for the real implementation.
  // Steps:
  // 1. Download PDF
  // 2. Parse grower name, region, cert #, status, etc.
  // 3. Upsert into MongoDB

  console.log(`Download the PDF manually and use pdf-parse or similar for extraction.`);
}

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(fetchAPHISMexicoAvocadoGrowers)
  .then(() => {
    console.log('Done fetching growers.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
