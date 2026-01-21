export type DocumentStatus = "todo" | "in_progress" | "done";

export type DocumentType = "civil" | "concordat" | "custom";

export interface Document {
  id: string;
  event_id: string;

  name: string;
  description: string | null;

  category: string | null;
  holder: string | null;

  type: DocumentType;

  status: DocumentStatus;

  due_date: string | null;
  valid_until: string | null;

  is_system: boolean;
  is_pinned: boolean;

  created_at: string;
  updated_at: string;
}

export type StorageLocation = "server" | "local";

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

  person: "bride" | "groom" | "both" | null;

  created_at: string;
}
