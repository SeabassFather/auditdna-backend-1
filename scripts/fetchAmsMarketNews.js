import axios from "axios";
import mongoose from "mongoose";
import Price from "../models/Price.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// Replace with your actual AMS market API or CSV endpoint
const amsUrl = "https://mymarketnews.ams.usda.gov/api/report/XXXX";

async function fetchPrices() {
  const { data } = await axios.get(amsUrl);
  // TODO: Parse and transform to Price model fields, insertMany or upsert
}

async function run() {
  await mongoose.connect(MONGO_URI);
  await fetchPrices();
  mongoose.disconnect();
}

run();

