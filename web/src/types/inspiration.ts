// web/src/types/inspiration.ts
export interface Item {
  id: string;
  board_id: string;
  event_id: string;
  url: string;
  source_type: "upload" | "pinterest" | "instagram" | "gallery";
  category?: "decorations" | "flowers" | "outfits";
  tags?: string[];
  note?: string;
  position?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Board {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  cover_image?: string;
  history?: any[];
  created_at?: string;
  updated_at?: string;
}
