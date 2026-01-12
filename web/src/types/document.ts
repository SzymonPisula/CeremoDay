export type DocumentStatus = "pending" | "done";

export type DocumentCategory = "USC" | "KOSCIOŁ" | "URZĄD" | "INNE";
export type DocumentHolder = "bride" | "groom" | "both";
export type DocumentType = "civil" | "church" | "custom";

export interface Document {
  id: string;
  event_id: string;
  name: string;

  // ✅ było: description: string
  description?: string | null;

  status?: DocumentStatus;

  category?: DocumentCategory | null;
  holder?: DocumentHolder | null;
  due_date?: string | null;
  valid_until?: string | null;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;

  // w backendzie jest wymagane, ale backend może jeszcze nie zwracać w starych rekordach
  type?: DocumentType;

  checked?: boolean;
  notes?: string | null;
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

export type DocumentPayload = Partial<Document>;
