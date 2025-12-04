import type { Vendor, VendorCategory } from "../types/vendor";

const API_KEY = "AIzaSyB5gclWaZ1Irg1XmRWae4sQcdC8LLGYDww";

// Typ dla wyniku Google Places API
interface GooglePlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  geometry: {
    location: { lat: number; lng: number };
  };
}

interface GooglePlacesResponse {
  results: GooglePlaceResult[];
}

export async function fetchVendors(
  category: VendorCategory,
  location: { lat: number; lng: number },
  radius: number = 5000
): Promise<Vendor[]> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${API_KEY}&location=${location.lat},${location.lng}&radius=${radius}&type=${category}`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error("Błąd fetchowania danych z Google Places API");

  const data: GooglePlacesResponse = await res.json();

  if (!data.results) return [];

  return data.results.map((place) => ({
    id: place.place_id,
    name: place.name,
    address: place.vicinity,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    category,
    rating: place.rating,
    place_id: place.place_id,
  }));
}
