import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;



router.get("/places", async (req, res) => {
  const { location, radius, type } = req.query;

  if (!location || !radius || !type) {
    return res.status(400).json({ message: "Brak wymaganych parametrów: location, radius, type" });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`;
    console.log("Fetching Google Places:", url);

    const response = await fetch(url);
const data: unknown = await res.json();
const obj = (typeof data === "object" && data !== null) ? (data as Record<string, unknown>) : {};
const results = Array.isArray(obj.results) ? obj.results : Array.isArray(obj.candidates) ? obj.candidates : [];
return res.json(results);


    
  } catch (err) {
    console.error("Błąd fetch Google Places:", err);
    return res.status(500).json({ message: "Błąd serwera przy pobieraniu vendorów" });
  }
});

export default router;
