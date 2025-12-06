// CeremoDay/web/src/types/inspiration.ts

export type InspirationCategory =
  | "DEKORACJE"
  | "KWIATY"
  | "STROJE"
  | "PAPETERIA"
  | "INNE";

export interface InspirationBoard {
  id: string;
  event_id: string;

  name: string;
  description?: string | null;

  color?: string | null;
  emoji?: string | null;

  created_at?: string;
  updated_at?: string;
}

export interface InspirationBoardPayload {
  name: string;
  description?: string | null;
  color?: string | null;
  emoji?: string | null;
}

export interface InspirationItem {
  id: string;
  board_id: string;

  title: string;
  description?: string | null;

  category?: InspirationCategory | null;
  tags?: string | null;

  image_url?: string | null;
  source_url?: string | null;

  created_at?: string;
  updated_at?: string;
}

export interface InspirationItemPayload {
  title: string;
  description?: string | null;
  category?: InspirationCategory | null;
  tags?: string | null;
  source_url?: string | null;
}
