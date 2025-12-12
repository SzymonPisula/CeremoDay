import { useAuthStore } from "../store/auth";
import type { Guest, GuestPayload } from "../types/guest";
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

  // -----------------------------
  // DOCUMENTS 2.0
  // -----------------------------
  /**
   * Lista dokumentów dla wydarzenia.
   * Backend: GET /documents/event/:eventId
   */
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


  /**
   * Utworzenie nowego dokumentu (ręcznego).
   * Backend: POST /documents/event/:eventId
   */
  createDocument: (
    eventId: string,
    body: Partial<Document>
  ): Promise<Document> =>
    request<Document>(`/documents/event/${eventId}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /**
   * Aktualizacja dokumentu (status, opis, kategoria, terminy, itp.)
   * Backend: PUT /documents/:id
   */
  updateDocument: (
    id: string,
    body: Partial<Document>
  ): Promise<Document> =>
    request<Document>(`/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  /**
   * Usunięcie dokumentu.
   * Backend: DELETE /documents/:id
   */
  deleteDocument: (id: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/documents/${id}`, {
      method: "DELETE",
    }),

  /**
   * Skrót do zmiany samego statusu (pending/done).
   * W środku używa updateDocument.
   */
  toggleDocumentStatus: async (
    id: string,
    status: "pending" | "done"
  ): Promise<Document> => {
    return api.updateDocument(id, { status });
  },

  /**
   * Lista plików dla dokumentu.
   * Backend: GET /documents/:id/files
   */
  getDocumentFiles: (documentId: string): Promise<DocumentFile[]> =>
    request<DocumentFile[]>(`/documents/${documentId}/files`),

  /**
   * Upload pliku dla dokumentu – HYBRYDA:
   * - storageLocation = "server" -> plik na serwerze (zaszyfrowany w storageService)
   * - storageLocation = "local"  -> backend nie zapisuje pliku, tylko metadane
   *
   * Uwaga: tu NIE używamy helpera request(), bo wysyłamy FormData, nie JSON.
   */
  uploadDocumentFile: async (
    documentId: string,
    file: File,
    storageLocation: StorageLocation
  ): Promise<DocumentFile> => {
    const token = useAuthStore.getState().token;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("storage_location", storageLocation);

    const res = await fetch(
      `${BASE_URL}/documents/${documentId}/files`,
      {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
        body: formData,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Błąd uploadu pliku (${res.status}): ${text || res.statusText}`
      );
    }

    const data = (await res.json()) as DocumentFile;
    return data;
  },

  /**
   * Usunięcie załącznika dokumentu.
   * Backend: DELETE /documents/files/:fileId
   */
  deleteDocumentFile: (fileId: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/documents/files/${fileId}`, {
      method: "DELETE",
    }),

  /**
   * Pobieranie pliku dokumentu:
   * - dla storage_location="server" – backend zwraca binarny plik
   * - dla storage_location="local" – backend zwraca błąd (plik tylko lokalnie)
   *
   * Zwracamy BLOB, który frontend może zapisać jako URL i pobrać.
   */
  downloadDocumentFile: async (fileId: string): Promise<Blob> => {
    const token = useAuthStore.getState().token;

    const res = await fetch(
      `${BASE_URL}/documents/files/${fileId}/download`,
      {
        method: "GET",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Błąd pobierania pliku (${res.status}): ${text || res.statusText}`
      );
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
  // CUSTOM VENDORS / USŁUGODAWCY WYDARZENIA
  // -----------------------------
  getEventVendors: (eventId: string) =>
    request<Vendor[]>(`/vendors?event_id=${eventId}`),

  createVendor: (body: {
    event_id: string;
    name: string;
    type?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    google_maps_url?: string;
    notes?: string;
    lat?: number | null;
    lng?: number | null;
  }) => request<Vendor>("/vendors", {
    method: "POST",
    body: JSON.stringify(body),
  }),

  updateVendor: (id: string, body: Partial<{
    name: string;
    type: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    google_maps_url: string;
    notes: string;
    lat: number | null;
    lng: number | null;
  }>) => request<Vendor>(`/vendors/${id}`, {
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

  saveFinanceBudget: (
    eventId: string,
    payload: BudgetPayload
  ): Promise<Budget> =>
    request<Budget>(`/finance/${eventId}/budget`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getFinanceExpenses: (eventId: string): Promise<Expense[]> =>
    request<Expense[]>(`/finance/${eventId}/expenses`).then((list) =>
      // Zamiana stringów z DECIMAL na number
      list.map((e) => ({
        ...e,
        planned_amount:
          e.planned_amount != null
            ? Number(e.planned_amount)
            : null,
        actual_amount:
          e.actual_amount != null
            ? Number(e.actual_amount)
            : null,
      }))
    ),

  createFinanceExpense: (
    eventId: string,
    payload: Omit<ExpenseCreatePayload, "event_id">
  ): Promise<Expense> =>
    request<Expense>(`/finance/${eventId}/expenses`, {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((e) => ({
      ...e,
      planned_amount:
        e.planned_amount != null ? Number(e.planned_amount) : null,
      actual_amount:
        e.actual_amount != null ? Number(e.actual_amount) : null,
    })),

  updateFinanceExpense: (
    eventId: string,
    expenseId: string,
    payload: ExpenseUpdatePayload
  ): Promise<Expense> =>
    request<Expense>(`/finance/${eventId}/expenses/${expenseId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }).then((e) => ({
      ...e,
      planned_amount:
        e.planned_amount != null ? Number(e.planned_amount) : null,
      actual_amount:
        e.actual_amount != null ? Number(e.actual_amount) : null,
    })),

  deleteFinanceExpense: (
    eventId: string,
    expenseId: string
  ): Promise<void> =>
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


};