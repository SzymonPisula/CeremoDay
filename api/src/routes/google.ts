// server/src/routes/google.ts
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // trzymamy w .env

router.get("/places", async (req, res) => {
  const { location, radius, type } = req.query;

  if (!location || !radius || !type) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Google API request failed" });
  }
});

export default router;
