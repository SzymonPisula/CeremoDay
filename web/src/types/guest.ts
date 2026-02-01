export type GuestPayload = {
  id?: string;
  event_id: string;

  first_name: string;
  last_name: string;
  phone: string;

  email?: string | null;

  relation?: string | null;
  side?: string | null;
  rsvp?: string | null;

  allergens?: string | null;
  notes?: string | null;

  parent_guest_id?: string | null;
};



export type GuestsImportItem = {
  type: "guest" | "subguest";
  parent_key?: string | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  relation?: string | null;
  side?: string | null;
  rsvp?: string | null;
  allergens?: string | null;
  notes?: string | null;
};

export type GuestsImportResponse = {
  ok: boolean;
  createdGuests: number;
  createdSubguests: number;
  skippedGuests?: Array<{ first_name: string; last_name: string; reason: string }>;
  skippedSubguests?: Array<{ first_name: string; last_name: string; parent_key: string | null; reason: string }>;
  code?: string;
  message?: string;
};


export type Guest = GuestPayload & { SubGuests?: Guest[] };
