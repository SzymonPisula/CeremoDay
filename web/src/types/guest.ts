export type Relation =
  | "rodzic"
  | "dziadkowie"
  | "wujostwo"
  | "kuzynostwo"
  | "znajomy"
  | "usługodawca";

export type Side = "panna młoda" | "pan młody";

export type RSVP = "tak" | "nie" | "brak odpowiedzi";

export interface SubGuest {
  id: number;
  firstName: string;
  relation: string;
  allergens?: string;
  notes?: string;
  rsvp: RSVP;
}

export interface Guest {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  relation: Relation;
  side: Side;
  allergens?: string;
  notes?: string;
  rsvp: RSVP;
  subGuests: SubGuest[];
}
