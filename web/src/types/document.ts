export type DocumentStatus = "pending" | "done";

export type DocumentType = "civil" | "church" | "concordat" | "other";

export interface DocumentAttachment {
  id: string;
  document_id: string;
  name: string;
  url: string;
  created_at: string;
}

export interface Document {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  status?: DocumentStatus;
  due_date?: string; // YYYY-MM-DD
  created_at?: string;
  type?: DocumentType; // typ dokumentu: ślub cywilny, kościelny, inne
  required_for?: string[]; // np. ["civil", "church"]
  file_path?: string;
  attachments?: DocumentAttachment[];
  notes?: string;
}

export interface DocumentPayload {
  event_id: string;
  name: string;
  description?: string;
  status?: DocumentStatus;
  due_date?: string;
  type?: DocumentType;
  required_for?: string[];
  notes?: string;
}
