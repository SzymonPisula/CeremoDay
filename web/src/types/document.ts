export type DocumentStatus = "pending" | "done";

export type DocumentCategory = "USC" | "KOSCIOŁ" | "URZĄD" | "INNE";
export type DocumentHolder = "bride" | "groom" | "both";
export type DocumentType = "civil" | "church";

export interface Document {
  id: string;
  event_id: string;
  name: string;
  description: string;

  // status dokumentu (checklista)
  status?: DocumentStatus;

  // rozszerzenia na przyszłość — backend może ich jeszcze nie zwracać
  category?: DocumentCategory | null;
  holder?: DocumentHolder | null;
  due_date?: string | null;
  valid_until?: string | null;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;

  // KLUCZOWE: typ ślubu, do filtrowania listy
  type?: DocumentType;

  // istniejące w Twoim modelu pola (zgodnie z backendem)
  checked?: boolean;
  notes?: string;
  attachments?: unknown;
}

export type StorageLocation = "server" | "local";
export type FilePerson = "bride" | "groom" | "both";

export interface DocumentFile {
  id: string;
  event_id: string;
  document_id: string;
  user_id: string;
  storage_location: StorageLocation;
  storage_key: string | null;
  original_name: string;
  mime_type: string;
  size: number;
  person: FilePerson | null;
  created_at?: string;
  updated_at?: string;
}

// Na wszelki wypadek, jeśli gdzieś jeszcze używasz DocumentPayload:
export type DocumentPayload = Partial<Document>;
