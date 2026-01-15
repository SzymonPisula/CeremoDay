export interface GuestPayload {
  id?: string;
  event_id: string;
  parent_guest_id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  relation?: string;
  side?: string;
  rsvp?: string;
  allergens?: string;
  notes?: string;
}

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
  success: boolean;
  created: number;
  errors?: string[];
};


export type Guest = GuestPayload & { SubGuests?: Guest[] };
