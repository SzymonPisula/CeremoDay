import { useAuthStore } from "../store/auth";
import type { Guest, GuestPayload } from "../types/guest";
import type { Document, DocumentPayload } from "../types/document";

const BASE_URL = "http://localhost:4000";

async function request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const text = await res.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    console.error("⚠️ Invalid JSON:", text);
    data = null;
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "message" in data
        ? (data as { message: string }).message
        : `Błąd API: ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: { email: string; password: string; name: string; role?: string }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  // Events
  getEvents: () => request("/events"),
  createEvent: (body: { name: string; access_code?: string }) =>
    request("/events", { method: "POST", body: JSON.stringify(body) }),
  joinEvent: (body: { access_code: string }) =>
    request("/events/join", { method: "POST", body: JSON.stringify(body) }),

  // Guests
  getGuests: (eventId: string) =>
    request<{ guests?: Guest[] } | Guest[]>(`/guests/${eventId}`).then((data) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === "object" && Array.isArray((data as { guests?: Guest[] }).guests)) {
        return (data as { guests: Guest[] }).guests;
      }
      return [];
    }),

  createGuest: (body: GuestPayload) =>
    request<Guest>(`/guests`, { method: "POST", body: JSON.stringify(body) }),

  updateGuest: (id: string, body: GuestPayload) =>
    request<Guest>(`/guests/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  deleteGuest: (id: string) => request(`/guests/${id}`, { method: "DELETE" }),

  // Documents
  getDocuments: (eventId: string) =>
    request<Document[]>(`/documents/${eventId}`),

  createDocument: (body: DocumentPayload) =>
    request<Document>(`/documents`, { method: "POST", body: JSON.stringify(body) }),

  updateDocument: (id: string, body: Partial<DocumentPayload>) =>
    request<Document>(`/documents/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  deleteDocument: (id: string) => request(`/documents/${id}`, { method: "DELETE" }),

  toggleDocumentStatus: async (id: string, status: "pending" | "done") =>
    request<Document>(`/documents/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),

  // Upload attachments (frontend only, backend musi obsłużyć)
  uploadAttachment: async (id: string, file: File) => {
    const token = useAuthStore.getState().token;
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE_URL}/documents/${id}/attachments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) throw new Error(`Błąd uploadu: ${res.statusText}`);
    return res.json() as Promise<{ name: string; url: string }>;
  },
  uploadDocument: (id: string, formData: FormData) =>
  fetch(`${BASE_URL}/documents/${id}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${useAuthStore.getState().token ?? ""}`,
    },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) throw new Error("Błąd uploadu pliku");
    return res.json();
  }),

};
