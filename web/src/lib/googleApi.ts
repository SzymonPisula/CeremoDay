// CeremoDay/web/src/lib/googleApi.ts
import { useAuthStore } from "../store/auth";
import type { Vendor } from "../types/vendor";

const BASE_URL = "http://localhost:4000";

/**
 * eventId był nieużywany → ESLint error
 * Usuwamy go z sygnatury funkcji (API Google i tak go nie używa)
 */

export async function getVendors(): Promise<Vendor[]> {
  try {
    const token = useAuthStore.getState().token;

    const res = await fetch(
      `${BASE_URL}/api/google/places?location=52.2297,21.0122&radius=5000&type=catering`,
      {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      }
    );

    if (!res.ok) {
      console.error("Błąd API Google Vendors:", res.status, res.statusText);
      return [];
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.warn("Otrzymano nieprawidłową odpowiedź od Google:", data);
      return [];
    }

    return data as Vendor[];
  } catch (err) {
    console.error("Błąd fetch vendors:", err);
    return [];
  }
}
