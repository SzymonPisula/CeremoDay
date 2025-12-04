import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.warn("⚠️ GOOGLE_API_KEY nie jest ustawiony w środowisku!");
}

router.get("/places", async (req, res) => {
  const { location, radius, type } = req.query;

  if (!location || !radius || !type) {
    return res.status(400).json({ message: "Brak wymaganych parametrów: location, radius, type" });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`;
    console.log("Fetching Google Places:", url);

    const response = await fetch(url);
    const data = await response.json();

    // Log całej odpowiedzi od Google
    console.log("Google API response:", JSON.stringify(data, null, 2));

    if (data.status !== "OK") {
      console.error("Google API error:", data.status, data.error_message || "");
      return res.status(500).json({ message: `Google API error: ${data.status}` });
    }

    return res.json(data.results || []);
  } catch (err) {
    console.error("Błąd fetch Google Places:", err);
    return res.status(500).json({ message: "Błąd serwera przy pobieraniu vendorów" });
  }
});

export default router;
