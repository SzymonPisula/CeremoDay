// CeremoDay/web/src/lib/api.ts
import { useAuthStore } from "../store/auth";

import type { Guest, GuestPayload } from "../types/guest";
import type { GuestsImportItem, GuestsImportResponse } from "../types/guest";

import type { Document, DocumentFile, StorageLocation } from "../types/document";

import type { Vendor } from "../types/vendor";

import type { Task, TaskPayload } from "../types/task";

import type {
  InspirationBoard,
  InspirationItem,
  InspirationBoardPayload,
  InspirationItemPayload,
} from "../types/inspiration";

import type {
  Budget,
  BudgetPayload,
  Expense,
  ExpenseCreatePayload,
  ExpenseUpdatePayload,
  FinanceSummary,
} from "../types/finance";

import type {
  WeddingDayResponse,
  WeddingDayScheduleItem,
  WeddingDayChecklistItem,
  WeddingDayContact,
} from "../types/weddingDay";

import type { MeResponse, UpdateMePayload } from "../types/user";
import type { EventUsersResponse } from "../types/eventUsers";
import type { AdminCreateUserPayload, AdminUpdateUserPayload, AdminUser, MeUser } from "../types/admin";

import {
  saveLocalDocumentFile,
  getLocalDocumentFile,
  deleteLocalDocumentFile,
} from "../services/localDocumentStorage";

import type { ReportExportPdfBody } from "../types/reports";

// -------------------------------------------------
// Helpers
// -------------------------------------------------

// helper: id bez uuid
const makeId = (): string => {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};


// -------------------------------------------------
// Guests: budowa hierarchii (osoba kontaktowa -> współgoście)
// Backend zwraca listę płaską z parent_guest_id.
// UI Guests.tsx oczekuje, że top-level rekordy będą miały SubGuests[].
// -------------------------------------------------
function buildGuestsTree(flat: Guest[]): Guest[] {
  const map = new Map<string, Guest>();
  // 1) sklonuj, wyczyść SubGuests
  for (const g of flat) {
    if (!g?.id) continue;
    map.set(String(g.id), { ...g, SubGuests: [] });
  }

  const roots: Guest[] = [];
  // 2) podepnij dzieci pod rodziców
  for (const g0 of map.values()) {
    const parentId = g0.parent_guest_id ? String(g0.parent_guest_id) : "";
    if (parentId && map.has(parentId)) {
      const parent = map.get(parentId)!;
      parent.SubGuests = [...(parent.SubGuests || []), g0];
    } else {
      roots.push(g0);
    }
  }

  // 3) porządek: sort alfabetyczny + w subach też
  const byName = (a: Guest, b: Guest) =>
    `${a.last_name ?? ""} ${a.first_name ?? ""}`.localeCompare(
      `${b.last_name ?? ""} ${b.first_name ?? ""}`,
      "pl"
    );

  roots.sort(byName);
  for (const r of roots) {
    if (r.SubGuests && r.SubGuests.length) r.SubGuests.sort(byName);
  }

  return roots;
}


export const BASE_URL = "http://localhost:4000";

// -------------------------------------------------
// ApiError + parsowanie walidacji (bez any)
// -------------------------------------------------

export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string>;

  constructor(status: number, message: string, code?: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
async function requestWithFallback<T>(
  primary: { endpoint: string; options: RequestInit },
  fallback?: { endpoint: string; options: RequestInit }
): Promise<T> {
  try {
    return await request<T>(primary.endpoint, primary.options);
  } catch (e) {
    // fallback tylko gdy 404 (zła metoda/ścieżka) lub endpoint z undefined (często kończy się 404)
    if (e instanceof ApiError && e.status === 404 && fallback) {
      return await request<T>(fallback.endpoint, fallback.options);
    }
    throw e;
  }
}


type ValidationErrorPayloadA = {
  code?: string;
  errors?: Array<{ field?: string; message?: string }>;
};

type ValidationErrorPayloadB = {
  ok?: boolean;
  fields?: Record<string, unknown>;
};

// ✅ NOWY: format C używany w Twoim backendzie: { code:"VALIDATION_ERROR", details:{ field: "msg" } }
type ValidationErrorPayloadC = {
  code?: unknown;
  details?: Record<string, unknown>;
};

function mapValidationFields(data: unknown): Record<string, string> | undefined {
  if (typeof data !== "object" || data === null) return undefined;

  // Format A: { code:"VALIDATION_ERROR", errors:[{field,message}] }
  const a = data as ValidationErrorPayloadA;
  if (a.code === "VALIDATION_ERROR" && Array.isArray(a.errors)) {
    const out: Record<string, string> = {};
    for (const e of a.errors) {
      if (e?.field && e?.message) out[String(e.field)] = String(e.message);
    }
    return Object.keys(out).length ? out : undefined;
  }

  // Format B: { ok:false, fields:{...} }
  const b = data as ValidationErrorPayloadB;
  if (b.ok === false && b.fields && typeof b.fields === "object") {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(b.fields)) out[String(k)] = String(v);
    return Object.keys(out).length ? out : undefined;
  }

  // ✅ Format C: { code:"VALIDATION_ERROR", details:{...} }
  const c = data as ValidationErrorPayloadC;
  const cCode = typeof c.code === "string" ? c.code : c.code != null ? String(c.code) : undefined;
  if (cCode === "VALIDATION_ERROR" && c.details && typeof c.details === "object") {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(c.details)) {
      if (v == null) continue;
      const msg = String(v).trim();
      if (msg) out[String(k)] = msg;
    }
    return Object.keys(out).length ? out : undefined;
  }

  return undefined;
}

type ApiErrorPayload = {
  message?: unknown;
  error?: unknown;
  code?: unknown;
};

async function readResponsePayload(res: Response): Promise<{ text: string; data: unknown }> {
  const text = await res.text();
  if (!text) return { text: "", data: null };

  try {
    return { text, data: JSON.parse(text) as unknown };
  } catch {
    // np. HTML / plain text
    return { text, data: null };
  }
}

function pickApiMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null) {
    const p = data as ApiErrorPayload;
    const msg =
      typeof p.message === "string"
        ? p.message
        : typeof p.error === "string"
          ? p.error
          : null;

    if (msg) return msg;
  }
  return fallback;
}

function pickApiCode(data: unknown): string | undefined {
  if (typeof data === "object" && data !== null && "code" in (data as Record<string, unknown>)) {
    const raw = (data as Record<string, unknown>).code;
    if (typeof raw === "string") return raw;
    if (raw != null) return String(raw);
  }
  return undefined;
}

function buildApiError(res: Response, data: unknown, fallbackMsg?: string): ApiError {
  const fields = mapValidationFields(data);
  const code = pickApiCode(data);
  const msg = pickApiMessage(data, fallbackMsg ?? `Błąd API: ${res.status}`);
  return new ApiError(res.status, msg, code, fields);
}

function handleUnauthorized() {
  try {
    useAuthStore.getState().logout();
  } catch (e) {
    void e;
  }

  try {
    localStorage.removeItem("token"); // legacy
  } catch (e) {
    void e;
  }

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// -------------------------------------------------
// request() dla JSON (jeden standard w całej appce)
// -------------------------------------------------

function isFormDataBody(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}
function isBlobBody(body: unknown): body is Blob {
  return typeof Blob !== "undefined" && body instanceof Blob;
}
function isStringBody(body: unknown): body is string {
  return typeof body === "string";
}

/**
 * Uniwersalny helper do requestów.
 * - automatycznie dokleja BASE_URL
 * - ustawia nagłówki (Authorization)
 * - dla JSON: ustawia Content-Type i stringifuje obiekt
 * - parsuje JSON, obsługuje błędy
 */
async function request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;

  const rawBody = options.body;

  // ✅ jeśli ktoś podał obiekt (a nie string), to tu go stringifujemy
  // (ale: string / FormData / Blob zostają jak są)
  const body =
    rawBody == null
      ? undefined
      : isStringBody(rawBody) || isFormDataBody(rawBody) || isBlobBody(rawBody)
        ? rawBody
        : JSON.stringify(rawBody);

  // ✅ Content-Type tylko gdy to JSON (czyli body jest stringiem i nie jest FormData)
  const shouldSetJsonContentType = body !== undefined && typeof body === "string";

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
    ...(shouldSetJsonContentType ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // ✅ DEV debug – zobaczysz dokładnie czy idzie event_id
  if (typeof import.meta !== "undefined" && (import.meta as unknown as { env?: { DEV?: boolean } })?.env?.DEV) {
    if (endpoint.startsWith("/guests") && (options.method ?? "GET") !== "GET") {
      console.log("[api.request][guests]", {
        endpoint,
        method: options.method ?? "GET",
        bodyPreview: body,
      });
    }
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body,
  });

  const { data, text } = await readResponsePayload(res);

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const fallbackMsg = text ? `${text}` : undefined;
    throw buildApiError(res, data, fallbackMsg);
  }

  return data as T;
}

// -------------------------------------------------
// fetch() helpers dla multipart / blob (bez kopiowania błędów)
// -------------------------------------------------

async function fetchJsonWithAuth<T>(url: string, init: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const { data, text } = await readResponsePayload(res);

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    throw buildApiError(res, data, text || undefined);
  }

  return data as T;
}

async function fetchBlobWithAuth(url: string, init?: RequestInit): Promise<Blob> {
  const token = useAuthStore.getState().token;
  const res = await fetch(url, {
    ...(init ?? {}),
    headers: {
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const { data, text } = await readResponsePayload(res);
    if (res.status === 401) handleUnauthorized();
    throw buildApiError(res, data, text || undefined);
  }

  return res.blob();
}

// -------------------------------------------------
// FINANCE helpers (typed)
// -------------------------------------------------

type ExpenseStatus = "PLANNED" | "IN_PROGRESS" | "PAID";

type ExpenseApiLike = {
  planned_amount: number | string | null;
  actual_amount: number | string | null;
  due_date: string | null;
  paid_date: string | null;
  status?: ExpenseStatus | null;
};

const toNumOrNull = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const resolveExpenseStatus = (e: ExpenseApiLike): ExpenseStatus => {
  if (e.status === "PAID" || e.status === "IN_PROGRESS" || e.status === "PLANNED") return e.status;
  if (e.paid_date) return "PAID";
  if (e.due_date) return "IN_PROGRESS";
  return "PLANNED";
};

const normalizeExpenseFromApi = <T extends ExpenseApiLike>(e: T) => {
  return {
    ...e,
    planned_amount: toNumOrNull(e.planned_amount),
    actual_amount: toNumOrNull(e.actual_amount),
    status: resolveExpenseStatus(e),
  };
};

// -------------------------------------------------
// API publiczne (to czego używa frontend)
// -------------------------------------------------

export const api = {
  // -----------------------------
  // AUTH
  // -----------------------------
  register: (body: { email: string; password: string; name: string }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  authMe: (): Promise<MeUser> => request<MeUser>("/auth/me", { method: "GET" }),

  // -----------------------------
  // ADMIN
  // -----------------------------
  adminListUsers: (): Promise<AdminUser[]> => request<AdminUser[]>("/admin/users", { method: "GET" }),

  adminCreateUser: (payload: AdminCreateUserPayload): Promise<AdminUser> =>
    request<AdminUser>("/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  adminUpdateUser: (userId: string, payload: AdminUpdateUserPayload): Promise<AdminUser> =>
    request<AdminUser>(`/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  adminSetUserPassword: (userId: string, password: string): Promise<{ success: true }> =>
    request<{ success: true }>(`/admin/users/${userId}/password`, {
      method: "PATCH",
      body: JSON.stringify({ password }),
    }),

  // -----------------------------
  // EVENTS
  // -----------------------------
  getEvents: () => request("/events"),

  createEvent: (body: { name: string; access_code?: string }) =>
    request("/events", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  joinEvent: (body: { access_code: string }) =>
    request("/events/join", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  leaveEvent: (eventId: string) => request(`/events/${eventId}/leave`, { method: "POST" }),

  // -----------------------------
  // EVENT USERS
  // -----------------------------
  getEventUsers: (eventId: string): Promise<EventUsersResponse> =>
    request<EventUsersResponse>(`/events/${eventId}/users`),

  removeEventUser: (eventId: string, userId: string) =>
    request<{ success: true }>(`/events/${eventId}/users/${userId}`, { method: "DELETE" }),

  approveEventUser: (eventId: string, userId: string) =>
    request<{ success: true }>(`/events/${eventId}/users/${userId}/approve`, {
      method: "POST",
    }),

  rejectEventUser: (eventId: string, userId: string) =>
    request<{ success: true }>(`/events/${eventId}/users/${userId}/reject`, { method: "POST" }),



  // -----------------------------
  // PROFILE
  // -----------------------------
  getMe: (): Promise<MeResponse> => request<MeResponse>("/users/me"),

  updateMe: (payload: UpdateMePayload) =>
    request<{ success: boolean; user: MeResponse }>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // -----------------------------
  // GUESTS
  // -----------------------------
getGuests: (eventId: string): Promise<Guest[]> =>
    request<{ guests?: Guest[] } | Guest[]>(`/guests/${eventId}`).then((data) => {
      const flat: Guest[] = Array.isArray(data)
        ? data
        : data && typeof data === "object" && Array.isArray((data as { guests?: Guest[] }).guests)
          ? (data as { guests: Guest[] }).guests
          : [];

      return buildGuestsTree(flat);
    }),

createGuest: (body: GuestPayload) =>
  request<Guest>(`/guests`, { method: "POST", body: JSON.stringify(body) }),

updateGuest: (id: string, body: GuestPayload) =>
  request<Guest>(`/guests/${id}`, { method: "PUT", body: JSON.stringify(body) }),

/** USUŃ tę starą linię: 
deleteGuest: (id: string) => request<{ success?: boolean }>(`/guests/${id}`, { method: "DELETE" }),
**/

deleteGuest: (id: string, opts?: { cascade?: boolean }) => {
  const qs = opts?.cascade ? "?cascade=1" : "";
  return request<{ success?: boolean; deleted?: { guest?: number; subGuests?: number } }>(
    `/guests/${id}${qs}`,
    { method: "DELETE" }
  );
},

importGuests: (eventId: string, items: GuestsImportItem[]) =>
  request<GuestsImportResponse>(`/guests/${eventId}/import`, {
    method: "POST",
    body: JSON.stringify(items), // ✅ UWAGA: tablica jako JSON, nie { items }
  }),


    


  // -----------------------------
  // DOCUMENTS 2.0
  // -----------------------------
  getDocuments: (eventId: string): Promise<Document[]> => request<Document[]>(`/documents/event/${eventId}`),

  generateDefaultDocuments: (
    eventId: string,
    ceremonyType: "civil" | "concordat",
    includeExtras = true
  ): Promise<Document[]> =>
    request<Document[]>(`/documents/event/${eventId}/generate-default`, {
      method: "POST",
      body: JSON.stringify({ ceremony_type: ceremonyType, include_extras: includeExtras }),
    }),

  createDocument: (eventId: string, body: Partial<Document>): Promise<Document> =>
    request<Document>(`/documents/event/${eventId}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

    


  updateDocument: (id: string, body: Partial<Document>): Promise<Document> =>
    request<Document>(`/documents/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  setDocumentPinned: (id: string, pinned: boolean): Promise<Document> =>
    request<Document>(`/documents/${id}`, { method: "PUT", body: JSON.stringify({ is_pinned: pinned }) }),

  changeDocumentStatus: (id: string, status: "todo" | "in_progress" | "done"): Promise<Document> =>
    request<Document>(`/documents/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),

  deleteDocument: (documentId: string) =>
  request<{ ok?: boolean } | { success?: boolean }>(`/documents/${documentId}`, {
    method: "DELETE",
  }),

  getDocumentFiles: (documentId: string): Promise<DocumentFile[]> =>
    request<DocumentFile[]>(`/documents/${documentId}/files`),

  deleteDocumentFile: async (fileId: string): Promise<{ success: boolean }> => {
    const res = await request<{ success: boolean }>(`/documents/files/${fileId}`, { method: "DELETE" });

    try {
      await deleteLocalDocumentFile(fileId);
    } catch (e) {
      void e;
    }

    return res;
  },

  uploadDocumentFile: async (documentId: string, file: File, storageLocation: StorageLocation): Promise<DocumentFile> => {
    // local
    if (storageLocation === "local") {
      const meta = await request<DocumentFile>(`/documents/${documentId}/files`, {
        method: "POST",
        body: JSON.stringify({
          storage_location: "local",
          original_name: file.name,
          mime_type: file.type || "application/octet-stream",
          size: file.size,
        }),
      });

      await saveLocalDocumentFile(meta.id || makeId(), documentId, file);
      return meta;
    }

    // server (multipart)
    const formData = new FormData();
    formData.append("file", file);
    formData.append("storage_location", "server");

    return fetchJsonWithAuth<DocumentFile>(`${BASE_URL}/documents/${documentId}/files`, {
      method: "POST",
      body: formData,
    });
  },

  downloadDocumentFile: async (fileId: string): Promise<Blob> => {
    const local = await getLocalDocumentFile(fileId);
    if (local) return local;

    return fetchBlobWithAuth(`${BASE_URL}/documents/files/${fileId}/download`);
  },

  // -----------------------------
  // TASKS / HARMONOGRAM
  // -----------------------------
  getTasks: (eventId: string) => request<Task[]>(`/tasks/event/${eventId}`),

  createTask: (eventId: string, body: TaskPayload) =>
    request<Task>(`/tasks/event/${eventId}`, { method: "POST", body: JSON.stringify(body) }),

  updateTask: (id: string, body: TaskPayload) =>
    request<Task>(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),

  // -----------------------------
  // VENDORS (Google Places)
  // -----------------------------
  getVendors: (location: string, radius: number, category: string): Promise<Vendor[]> =>
    request<Vendor[]>(
      `/api/google/places?location=${encodeURIComponent(location)}&radius=${radius}&type=${encodeURIComponent(category)}`
    ),

  // -----------------------------
  // RURAL VENUES / SALE GMINNE
  // -----------------------------
  getRuralVenues: (params: { county?: string; minCapacity?: number; maxCapacity?: number; q?: string }) => {
    const searchParams = new URLSearchParams();

    if (params.county) searchParams.append("county", params.county);
    if (params.minCapacity !== undefined) searchParams.append("minCapacity", String(params.minCapacity));
    if (params.maxCapacity !== undefined) searchParams.append("maxCapacity", String(params.maxCapacity));
    if (params.q && params.q.trim()) searchParams.append("q", params.q.trim());

    const queryString = searchParams.toString();
    const url = queryString ? `/vendors/rural/search?${queryString}` : "/vendors/rural/search";

    return request<Vendor[]>(url);
  },

  // -----------------------------
  // USŁUGODAWCY WYDARZENIA
  // -----------------------------
  getEvent: (id: string) => request<{ id: string; location?: string | null }>(`/events/${id}`),

getEventVendors: (eventId: string) => {
  const id = String(eventId ?? "").trim();
  if (!id) throw new Error("Brak eventId w getEventVendors()");
  return request<Vendor[]>(`/vendors?event_id=${encodeURIComponent(id)}`);
},

  createVendor: (body: {
    event_id: string;
    name: string;

    source?: import("../types/vendor").VendorSource;
    type?: import("../types/vendor").VendorType | string;

    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    google_maps_url?: string;
    notes?: string;
    lat?: number | null;
    lng?: number | null;

    county?: string;
    max_participants?: number | null;
    equipment?: string;
    pricing?: string;
    rental_info?: string;
    commune_office?: string;
    rural_type?: string;
    usable_area?: number;
  }) =>
    request<Vendor>("/vendors", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateVendor: (
    id: string,
    body: Partial<{
      name: string;
      source: import("../types/vendor").VendorSource;
      type: import("../types/vendor").VendorType | string;
      address: string;
      phone: string;
      email: string;
      website: string;
      google_maps_url: string;
      notes: string;

      county: string;
      max_participants: number | null;
      equipment: string;
      pricing: string;
      rental_info: string;
      commune_office: string;
      rural_type: string;
      usable_area: number | null;

      lat: number | null;
      lng: number | null;
    }>
  ) =>
    request<Vendor>(`/vendors/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteVendor: (id: string) => request<void>(`/vendors/${id}`, { method: "DELETE" }),

  // -----------------------------
  // INSPIRATIONS / INSPIRACJE
  // -----------------------------
  getInspirationBoards: (eventId: string) =>
    request<InspirationBoard[]>(`/inspirations/events/${eventId}/boards`),

  createInspirationBoard: (eventId: string, body: InspirationBoardPayload) =>
    request<InspirationBoard>(`/inspirations/events/${eventId}/boards`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

 updateInspirationBoard: (boardId: string, body: Partial<InspirationBoardPayload>) => {
  const id = String(boardId ?? "").trim();
  if (!id) throw new Error("Brak boardId w updateInspirationBoard()");

  // 1) PUT /inspirations/boards/:id
  // 2) fallback PATCH /inspirations/boards/:id
  return requestWithFallback<InspirationBoard>(
    {
      endpoint: `/inspirations/boards/${id}`,
      options: { method: "PUT", body: JSON.stringify(body) },
    },
    {
      endpoint: `/inspirations/boards/${id}`,
      options: { method: "PATCH", body: JSON.stringify(body) },
    }
  );
},

deleteInspirationBoard: (boardId: string) => {
  const id = String(boardId ?? "").trim();
  if (!id) throw new Error("Brak boardId w deleteInspirationBoard()");

  // 1) DELETE /inspirations/boards/:id
  // 2) fallback DELETE /inspirations/board/:id (częsty wariant)
  return requestWithFallback<void>(
    { endpoint: `/inspirations/boards/${id}`, options: { method: "DELETE" } },
    { endpoint: `/inspirations/board/${id}`, options: { method: "DELETE" } }
  );
},


  getInspirationItems: (boardId: string) =>
    request<InspirationItem[]>(`/inspirations/boards/${boardId}/items`),

  createInspirationItem: (boardId: string, body: InspirationItemPayload) =>
    request<InspirationItem>(`/inspirations/boards/${boardId}/items`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

 updateInspirationItem: (itemId: string, body: Partial<InspirationItemPayload>) => {
  const id = String(itemId ?? "").trim();
  if (!id) throw new Error("Brak itemId w updateInspirationItem()");

  // 1) PUT /inspirations/items/:id
  // 2) fallback PATCH /inspirations/items/:id
  // 3) fallback alternatywny endpoint (item vs items) – jeśli backend ma inną ścieżkę
  return requestWithFallback<InspirationItem>(
    {
      endpoint: `/inspirations/items/${id}`,
      options: { method: "PUT", body: JSON.stringify(body) },
    },
    // fallback #1
    {
      endpoint: `/inspirations/items/${id}`,
      options: { method: "PATCH", body: JSON.stringify(body) },
    }
  ).catch(async (e) => {
    if (e instanceof ApiError && e.status === 404) {
      // fallback #2 (inna ścieżka)
      return requestWithFallback<InspirationItem>(
        {
          endpoint: `/inspirations/item/${id}`,
          options: { method: "PUT", body: JSON.stringify(body) },
        },
        {
          endpoint: `/inspirations/item/${id}`,
          options: { method: "PATCH", body: JSON.stringify(body) },
        }
      );
    }
    throw e;
  });
},

deleteInspirationItem: (itemId: string, opts?: { event_id?: string }) => {
  const id = String(itemId ?? "").trim();
  if (!id) throw new Error("Brak itemId w deleteInspirationItem()");

  // część backendów czyta event_id z body nawet dla DELETE
  const body = opts?.event_id ? JSON.stringify({ event_id: opts.event_id }) : undefined;

  return requestWithFallback<void>(
    { endpoint: `/inspirations/items/${id}`, options: { method: "DELETE", body } },
    { endpoint: `/inspirations/item/${id}`, options: { method: "DELETE", body } }
  );
},


  uploadInspirationImage: async (itemId: string, file: File): Promise<InspirationItem> => {
    const formData = new FormData();
    formData.append("file", file);

    return fetchJsonWithAuth<InspirationItem>(`${BASE_URL}/inspirations/items/${itemId}/upload`, {
      method: "POST",
      body: formData,
    });
  },
  

  // -----------------------------
  // FINANCE / BUDŻET I WYDATKI
  // -----------------------------
  getFinanceBudget: (eventId: string): Promise<Budget | null> => request<Budget | null>(`/finance/${eventId}/budget`),

  saveFinanceBudget: (eventId: string, payload: BudgetPayload): Promise<Budget> =>
    request<Budget>(`/finance/${eventId}/budget`, { method: "POST", body: JSON.stringify(payload) }),

  getFinanceExpenses: (eventId: string): Promise<Expense[]> =>
    request<Expense[]>(`/finance/${eventId}/expenses`).then((list) => (list ?? []).map((e) => normalizeExpenseFromApi(e))),

  createFinanceExpense: (eventId: string, payload: Omit<ExpenseCreatePayload, "event_id">): Promise<Expense> =>
    request<Expense>(`/finance/${eventId}/expenses`, { method: "POST", body: JSON.stringify(payload) }).then((e) =>
      normalizeExpenseFromApi(e)
    ),

  updateFinanceExpense: (eventId: string, expenseId: string, payload: ExpenseUpdatePayload): Promise<Expense> =>
    request<Expense>(`/finance/${eventId}/expenses/${expenseId}`, { method: "PUT", body: JSON.stringify(payload) }).then(
      (e) => normalizeExpenseFromApi(e)
    ),

  deleteFinanceExpense: (eventId: string, expenseId: string): Promise<void> =>
    request<void>(`/finance/${eventId}/expenses/${expenseId}`, { method: "DELETE" }),

  getFinanceSummary: (eventId: string): Promise<FinanceSummary> =>
    request<FinanceSummary>(`/finance/${eventId}/summary`),

  exportFinanceExpensesXlsx: async (eventId: string): Promise<Blob> =>
    fetchBlobWithAuth(`${BASE_URL}/finance/${eventId}/expenses/export-xlsx`, { method: "GET" }),

  exportReportPdf: async (eventId: string, body: ReportExportPdfBody): Promise<Blob> => {
    const token = useAuthStore.getState().token;

    const res = await fetch(`${BASE_URL}/reports/${eventId}/export/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const { data, text } = await readResponsePayload(res);
      if (res.status === 401) handleUnauthorized();
      throw buildApiError(res, data, text || undefined);
    }

    return res.blob();
  },

  // -----------------------------
  // REPORTS / RAPORTY
  // -----------------------------
  getReportsSummary: (eventId: string) =>
    request<import("../types/reports").ReportsSummary>(`/reports/${eventId}/summary`),

  downloadReportsPdf: async (eventId: string): Promise<Blob> =>
    fetchBlobWithAuth(`${BASE_URL}/reports/${eventId}/pdf`, { method: "GET" }),

  // -----------------------------
  // INTERVIEW / WYWIAD
  // -----------------------------
  getInterview: (eventId: string) =>
    request<import("../types/interview").InterviewResponse | null>(`/interview/${eventId}`, { method: "GET" }),

  saveInterview: (eventId: string, payload: import("../types/interview").InterviewPayload) =>
    request<import("../types/interview").InterviewResponse>(`/interview/${eventId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  generateEvent(eventId: string, body?: { mode?: "initial" | "regen"; keep_done?: boolean }) {
    return request(`/events/${eventId}/generate`, {
      method: "POST",
      body: JSON.stringify({
        mode: body?.mode ?? "initial",
        keep_done: body?.keep_done ?? true,
      }),
    });
  },

  // -----------------------------
  // WEDDING DAY
  // -----------------------------
  getWeddingDay: (eventId: string) =>
    request<WeddingDayResponse>(`/events/${eventId}/wedding-day`, { method: "GET" }),

  getEventInterview: (eventId: string) => request(`/events/${eventId}/interview`, { method: "GET" }),

  addWeddingDaySchedule: (
    eventId: string,
    body: Pick<WeddingDayScheduleItem, "time" | "title"> &
      Partial<Pick<WeddingDayScheduleItem, "description" | "location" | "responsible">>
  ) =>
    request<WeddingDayScheduleItem>(`/events/${eventId}/wedding-day/schedule`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateWeddingDaySchedule: (
    eventId: string,
    itemId: string,
    body: Partial<
      Pick<WeddingDayScheduleItem, "time" | "title" | "description" | "location" | "responsible" | "status">
    >
  ) =>
    request<WeddingDayScheduleItem>(`/events/${eventId}/wedding-day/schedule/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteWeddingDaySchedule: (eventId: string, itemId: string) =>
    request<{ success: true }>(`/events/${eventId}/wedding-day/schedule/${itemId}`, { method: "DELETE" }),

  addWeddingDayChecklist: (
    eventId: string,
    body: Pick<WeddingDayChecklistItem, "title"> & Partial<Pick<WeddingDayChecklistItem, "note" | "schedule_item_id">>
  ) =>
    request<WeddingDayChecklistItem>(`/events/${eventId}/wedding-day/checklist`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateWeddingDayChecklist: (
    eventId: string,
    itemId: string,
    body: Partial<Pick<WeddingDayChecklistItem, "title" | "note" | "schedule_item_id" | "done">>
  ) =>
    request<WeddingDayChecklistItem>(`/events/${eventId}/wedding-day/checklist/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteWeddingDayChecklist: (eventId: string, itemId: string) =>
    request<{ success: true }>(`/events/${eventId}/wedding-day/checklist/${itemId}`, { method: "DELETE" }),

  addWeddingDayContact: (
    eventId: string,
    body: Pick<WeddingDayContact, "name"> & Partial<Pick<WeddingDayContact, "role" | "phone" | "email" | "note">>
  ) =>
    request<WeddingDayContact>(`/events/${eventId}/wedding-day/contacts`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateWeddingDayContact: (
    eventId: string,
    contactId: string,
    body: Partial<Pick<WeddingDayContact, "name" | "role" | "phone" | "email" | "note">>
  ) =>
    request<WeddingDayContact>(`/events/${eventId}/wedding-day/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteWeddingDayContact: (eventId: string, contactId: string) =>
    request<{ success: true }>(`/events/${eventId}/wedding-day/contacts/${contactId}`, { method: "DELETE" }),

  // -----------------------------
  // NOTIFICATIONS
  // -----------------------------
  getEventNotifications(eventId: string) {
    return request(`/events/${eventId}/notifications`);
  },

  markNotificationsRead(eventId: string, ids?: string[]) {
    return request(`/events/${eventId}/notifications/mark-read`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },
};
