import { useAuthStore } from "../store/auth";
import type { Guest, GuestPayload } from "../types/guest";
import type { GuestsImportItem, GuestsImportResponse } from "../types/guest";
import type {
  Document,
  DocumentFile,
  StorageLocation,
} from "../types/document";
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


import type { MeResponse, UpdateMePayload } from "../types/User";
import type { EventUsersResponse } from "../types/eventUsers";

import {
  saveLocalDocumentFile,
  getLocalDocumentFile,
  deleteLocalDocumentFile,
} from "../services/localDocumentStorage";
import { ReportExportPdfBody } from "../types/reports";

// helper: id bez uuid
const makeId = (): string => {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const BASE_URL = "http://localhost:4000";

/**
 * Uniwersalny helper do JSON-owych requestów.
 * - automatycznie dokleja BASE_URL
 * - ustawia nagłówki (Content-Type, Authorization)
 * - parsuje JSON, obsługuje błędy
 */
async function request<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    console.error("⚠️ Invalid JSON response:", text);
    data = null;
  }

  if (!res.ok) {
    // Jeśli token wygasł / brak autoryzacji → natychmiast wracamy na logowanie
    if (res.status === 401) {
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

    const msg =

      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Błąd API: ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}
// -------------------------------------------------
// FINANCE helpers (typed, no any)
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
  // jeśli backend już zwraca status — użyj
  if (e.status === "PAID" || e.status === "IN_PROGRESS" || e.status === "PLANNED") return e.status;

  // fallback (legacy)
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

export const api = {
  // -----------------------------
  // AUTH
  // -----------------------------
  register: (body: {
    email: string;
    password: string;
    name: string;
    role?: string;
  }) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
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

  // -----------------------------
  // EVENT USERS
  // -----------------------------
  getEventUsers: (eventId: string): Promise<EventUsersResponse> =>
    request<EventUsersResponse>(`/events/${eventId}/users`),

  removeEventUser: (eventId: string, userId: string) =>
    request<{ success: true }>(`/events/${eventId}/users/${userId}`, {
      method: "DELETE",
    }),

  leaveEvent: (eventId: string) =>
    request<{ success: true }>(`/events/${eventId}/leave`, {
      method: "POST",
    }),

  approveEventUser: (eventId: string, userId: string, role?: "guest" | "coorganizer") =>
    request<{ success: true }>(`/events/${eventId}/users/${userId}/approve`, {
      method: "POST",
      body: JSON.stringify({ role }),
    }),

  rejectEventUser: (eventId: string, userId: string) =>
    request<{ success: true }>(`/events/${eventId}/users/${userId}/reject`, {
      method: "POST",
    }),

    changeEventUserRole: (eventId: string, userId: string, role: "guest" | "coorganizer") =>
  request(`/events/${eventId}/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  }),

  

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
    request<{ guests?: Guest[] } | Guest[]>(`/guests/${eventId}`).then(
      (data) => {
        if (Array.isArray(data)) return data;
        if (
          data &&
          typeof data === "object" &&
          Array.isArray((data as { guests?: Guest[] }).guests)
        ) {
          return (data as { guests: Guest[] }).guests;
        }
        return [];
      }
    ),

  createGuest: (body: GuestPayload) =>
    request<Guest>(`/guests`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateGuest: (id: string, body: GuestPayload) =>
    request<Guest>(`/guests/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteGuest: (id: string) =>
    request<{ success?: boolean }>(`/guests/${id}`, {
      method: "DELETE",
    }),

  importGuests: (eventId: string, items: GuestsImportItem[]) =>
  request<GuestsImportResponse>(`/guests/${eventId}/import`, {
    method: "POST",
    body: JSON.stringify({ items }),
  }),




// -----------------------------
// DOCUMENTS 2.0
// -----------------------------
getDocuments: (eventId: string): Promise<Document[]> =>
  request<Document[]>(`/documents/event/${eventId}`),

generateDefaultDocuments: (
  eventId: string,
  ceremonyType: "civil" | "concordat",
  includeExtras = true
): Promise<Document[]> =>
  request<Document[]>(`/documents/event/${eventId}/generate-default`, {
    method: "POST",
    body: JSON.stringify({
      ceremony_type: ceremonyType,
      include_extras: includeExtras,
    }),
  }),

createDocument: (eventId: string, body: Partial<Document>): Promise<Document> =>
  request<Document>(`/documents/event/${eventId}`, {
    method: "POST",
    body: JSON.stringify(body),
  }),

updateDocument: (id: string, body: Partial<Document>): Promise<Document> =>
  request<Document>(`/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  }),

setDocumentPinned: (id: string, pinned: boolean): Promise<Document> =>
  request<Document>(`/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify({ is_pinned: pinned }),
  }),

changeDocumentStatus: (
  id: string,
  status: "todo" | "in_progress" | "done"
): Promise<Document> =>
  request<Document>(`/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  }),

deleteDocument: (id: string): Promise<{ success: boolean }> =>
  request<{ success: boolean }>(`/documents/${id}`, { method: "DELETE" }),

getDocumentFiles: (documentId: string): Promise<DocumentFile[]> =>
  request<DocumentFile[]>(`/documents/${documentId}/files`),

deleteDocumentFile: async (fileId: string): Promise<{ success: boolean }> => {
  // 1) usuń rekord pliku (i ewentualnie plik na serwerze)
  const res = await request<{ success: boolean }>(`/documents/files/${fileId}`, {
    method: "DELETE",
  });

  // 2) posprzątaj też lokalny IndexedDB (bezpieczne nawet gdy pliku nie ma)
  try {
    await deleteLocalDocumentFile(fileId);
  } catch (e) {
    void e;
  }

  return res;
},

/**
 * Upload pliku do dokumentu:
 * - server: multipart
 * - local: zapis do IndexedDB + metadata do backendu JSON
 */
uploadDocumentFile: async (
  documentId: string,
  file: File,
  storageLocation: StorageLocation
): Promise<DocumentFile> => {
  const token = useAuthStore.getState().token;

  if (storageLocation === "local") {
    // 1) najpierw metadata do backendu -> dostajemy prawdziwe id
    const meta = await request<DocumentFile>(`/documents/${documentId}/files`, {
      method: "POST",
      body: JSON.stringify({
        storage_location: "local",
        original_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size: file.size,
      }),
    });

    // 2) zapis blob pod id z backendu (spójność listy)
    await saveLocalDocumentFile(meta.id || makeId(), documentId, file);
    return meta;
  }

  // server
  const formData = new FormData();
  formData.append("file", file);
  formData.append("storage_location", "server");

  const res = await fetch(`${BASE_URL}/documents/${documentId}/files`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload error ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as DocumentFile;
},

downloadDocumentFile: async (fileId: string): Promise<Blob> => {
  const local = await getLocalDocumentFile(fileId);
  if (local) return local;

  const token = useAuthStore.getState().token;
  const res = await fetch(`${BASE_URL}/documents/files/${fileId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Nie udało się pobrać pliku");
  }

  return res.blob();
},



  // -----------------------------
// TASKS / HARMONOGRAM
// -----------------------------
getTasks: (eventId: string) =>
  request<Task[]>(`/tasks/event/${eventId}`),

createTask: (eventId: string, body: TaskPayload) =>
  request<Task>(`/tasks/event/${eventId}`, {
    method: "POST",
    body: JSON.stringify(body),
  }),

updateTask: (id: string, body: TaskPayload) =>
  request<Task>(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  }),

deleteTask: (id: string) =>
  request<void>(`/tasks/${id}`, {
    method: "DELETE",
  }),

  // -----------------------------
  // VENDORS (Google Places)
  // -----------------------------
  getVendors: (
    location: string,
    radius: number,
    category: string
  ): Promise<Vendor[]> =>
    request<Vendor[]>(
      `/api/google/places?location=${encodeURIComponent(
        location
      )}&radius=${radius}&type=${encodeURIComponent(category)}`
    ),


    // -----------------------------
  // RURAL VENUES / SALE GMINNE
  // -----------------------------
  getRuralVenues: (params: {
    county?: string;
    minCapacity?: number;
    maxCapacity?: number;
    q?: string;
  }) => {
    const searchParams = new URLSearchParams();

    if (params.county) {
      searchParams.append("county", params.county);
    }
    if (params.minCapacity !== undefined) {
      searchParams.append("minCapacity", String(params.minCapacity));
    }
    if (params.maxCapacity !== undefined) {
      searchParams.append("maxCapacity", String(params.maxCapacity));
    }
    if (params.q && params.q.trim()) {
      searchParams.append("q", params.q.trim());
    }

    const queryString = searchParams.toString();
    const url = queryString
      ? `/vendors/rural/search?${queryString}`
      : "/vendors/rural/search";

    return request<Vendor[]>(url);
  },

  // -----------------------------
  //  USŁUGODAWCY WYDARZENIA
  // -----------------------------
 getEvent: (id: string) => request<{ id: string; location?: string | null }>(`/events/${id}`),

  getEventVendors: (eventId: string) =>
    request<Vendor[]>(`/vendors?event_id=${eventId}`),

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

  // ✅ rural snapshot
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



  deleteVendor: (id: string) =>
    request<void>(`/vendors/${id}`, { method: "DELETE" }),


  

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

  updateInspirationBoard: (boardId: string, body: Partial<InspirationBoardPayload>) =>
    request<InspirationBoard>(`/inspirations/boards/${boardId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteInspirationBoard: (boardId: string) =>
    request<void>(`/inspirations/boards/${boardId}`, {
      method: "DELETE",
    }),

  getInspirationItems: (boardId: string) =>
    request<InspirationItem[]>(`/inspirations/boards/${boardId}/items`),

  createInspirationItem: (boardId: string, body: InspirationItemPayload) =>
    request<InspirationItem>(`/inspirations/boards/${boardId}/items`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateInspirationItem: (itemId: string, body: Partial<InspirationItemPayload>) =>
    request<InspirationItem>(`/inspirations/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteInspirationItem: (itemId: string) =>
    request<void>(`/inspirations/items/${itemId}`, {
      method: "DELETE",
    }),

  uploadInspirationImage: async (itemId: string, file: File) => {
    const token = useAuthStore.getState().token;
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE_URL}/inspirations/items/${itemId}/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Błąd uploadu pliku inspiracji");
    }

    return (await res.json()) as InspirationItem;
  },

  

// -----------------------------
// FINANCE / BUDŻET I WYDATKI
// -----------------------------
getFinanceBudget: (eventId: string): Promise<Budget | null> =>
  request<Budget | null>(`/finance/${eventId}/budget`),

saveFinanceBudget: (eventId: string, payload: BudgetPayload): Promise<Budget> =>
  request<Budget>(`/finance/${eventId}/budget`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),

getFinanceExpenses: (eventId: string): Promise<Expense[]> =>
  request<Expense[]>(`/finance/${eventId}/expenses`).then((list) =>
    (list ?? []).map((e) => normalizeExpenseFromApi(e))
  ),

createFinanceExpense: (
  eventId: string,
  payload: Omit<ExpenseCreatePayload, "event_id">
): Promise<Expense> =>
  request<Expense>(`/finance/${eventId}/expenses`, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((e) => normalizeExpenseFromApi(e)),

updateFinanceExpense: (
  eventId: string,
  expenseId: string,
  payload: ExpenseUpdatePayload
): Promise<Expense> =>
  request<Expense>(`/finance/${eventId}/expenses/${expenseId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }).then((e) => normalizeExpenseFromApi(e)),

deleteFinanceExpense: (eventId: string, expenseId: string): Promise<void> =>
  request<void>(`/finance/${eventId}/expenses/${expenseId}`, {
    method: "DELETE",
  }),

getFinanceSummary: (eventId: string): Promise<FinanceSummary> =>
  request<FinanceSummary>(`/finance/${eventId}/summary`),

exportFinanceExpensesXlsx: async (eventId: string): Promise<Blob> => {
  const token = useAuthStore.getState().token;

  const res = await fetch(`${BASE_URL}/finance/${eventId}/expenses/export-xlsx`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Błąd eksportu wydatków (${res.status}): ${text || res.statusText}`);
  }

  return res.blob();
},

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
    const text = await res.text();
    throw new Error(text || "Nie udało się wygenerować PDF");
  }

  return res.blob();
},






// -----------------------------
// REPORTS / RAPORTY
// -----------------------------
getReportsSummary: (eventId: string) =>
  request<import("../types/reports").ReportsSummary>(`/reports/${eventId}/summary`),

downloadReportsPdf: async (eventId: string): Promise<Blob> => {
  const token = useAuthStore.getState().token;

  const res = await fetch(`${BASE_URL}/reports/${eventId}/pdf`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Błąd generowania PDF (${res.status}): ${text || res.statusText}`);
  }

  return res.blob();
},

// -----------------------------
// INTERVIEW / WYWIAD
// -----------------------------
getInterview: (eventId: string) =>
  request<import("../types/interview").InterviewResponse | null>(`/interview/${eventId}`, {
    method: "GET",
  }),

saveInterview: (eventId: string, payload: import("../types/interview").InterviewPayload) =>
  request<import("../types/interview").InterviewResponse>(`/interview/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }),

// -----------------------------
// WEDDING DAY
// -----------------------------

getWeddingDay: (eventId: string) =>
  request<WeddingDayResponse>(`/events/${eventId}/wedding-day`, { method: "GET" }),

getEventInterview: (eventId: string) =>
    request(`/events/${eventId}/interview`, { method: "GET" }),

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
  body: Partial<Pick<WeddingDayScheduleItem, "time" | "title" | "description" | "location" | "responsible" | "status">>
) =>
  request<WeddingDayScheduleItem>(`/events/${eventId}/wedding-day/schedule/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }),

deleteWeddingDaySchedule: (eventId: string, itemId: string) =>
  request<{ success: true }>(`/events/${eventId}/wedding-day/schedule/${itemId}`, { method: "DELETE" }),

addWeddingDayChecklist: (
  eventId: string,
  body: Pick<WeddingDayChecklistItem, "title"> &
    Partial<Pick<WeddingDayChecklistItem, "note" | "schedule_item_id">>
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
  body: Pick<WeddingDayContact, "name"> &
    Partial<Pick<WeddingDayContact, "role" | "phone" | "email" | "note">>
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


};