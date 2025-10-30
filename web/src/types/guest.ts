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

export type Guest = GuestPayload & { SubGuests?: Guest[] };
