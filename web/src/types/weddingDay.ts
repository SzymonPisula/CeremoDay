export type WeddingDayScheduleStatus = "planned" | "in_progress" | "done";

export type WeddingDayScheduleItem = {
  id: string;
  event_id: string;
  time: string;
  title: string;
  description?: string | null;
  location?: string | null;
  responsible?: string | null;
  status: WeddingDayScheduleStatus;
};

export type WeddingDayChecklistItem = {
  id: string;
  event_id: string;
  title: string;
  note?: string | null;
  schedule_item_id?: string | null;
  done: boolean;
};

export type WeddingDayContact = {
  id: string;
  event_id: string;
  name: string;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
};

export type WeddingDayResponse = {
  schedule: WeddingDayScheduleItem[];
  checklist: WeddingDayChecklistItem[];
  contacts: WeddingDayContact[];
};
