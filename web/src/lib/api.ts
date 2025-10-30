import { useAuthStore } from "../store/auth";
import type { GuestPayload } from "../types/guest";

const BASE_URL = "http://localhost:4000";

async function request(endpoint: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Invalid JSON:", text);
    data = text;
  }

  if (!res.ok) {
    console.error("API error:", res.status, data);
    throw new Error(data?.message || `Błąd API: ${res.status}`);
  }

  return data;
}

export const api = {
  register: (body: { email: string; password: string; name: string; role?: string }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  getEvents: () => request("/events"),
  createEvent: (body: { name: string; access_code?: string }) =>
    request("/events", { method: "POST", body: JSON.stringify(body) }),
  joinEvent: (body: { access_code: string }) =>
    request("/events/join", { method: "POST", body: JSON.stringify(body) }),

    getGuests: (eventId: string) =>
    request(`/guests/${eventId}`).then(data => Array.isArray(data) ? data : data.guests || []),
  createGuest: (body: GuestPayload) =>
    request("/guests", { method: "POST", body: JSON.stringify(body) }),
  updateGuest: (id: string, body: GuestPayload) =>
    request(`/guests/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteGuest: (id: string) => request(`/guests/${id}`, { method: "DELETE" }),
};
