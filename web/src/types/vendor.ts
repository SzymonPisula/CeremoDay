// CeremoDay/web/src/types/vendor.ts

export type VendorSource = "GOOGLE" | "RURAL" | "CUSTOM";

export type VendorType =
  | "venue"
  | "catering"
  | "music"
  | "photo_video"
  | "decorations"
  | "transport"
  | "other";


export interface VendorLocation {
  lat: number;
  lng: number;
}

export interface Vendor {
  id: string;

  // źródło rekordu (RURAL = baza gminna, CUSTOM = ręcznie dodany, GOOGLE = kiedyś z API)
  source: VendorSource;

  // wspólne
  name: string;
  address: string;
  location: VendorLocation | null;

  // typ (dla naszych custom vendorów)
  type?: VendorType;

  // kontakt
  phone?: string;
  email?: string;
  website?: string;

  // link do Google Maps (dla hybrydy)
  google_maps_url?: string;

  // dodatkowe informacje / notatki
  notes?: string;

  // ew. surowe współrzędne z backendu
  lat?: number | null;
  lng?: number | null;

  // Google-only (na przyszłość):
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;

  // Rural-only:
  max_participants?: number;
  equipment?: string;
  rental_info?: string;
  pricing?: string;
  county?: string;
  commune_office?: string;
  rural_type?: string;
  usable_area?: number;

  // event (dla CUSTOM)
  event_id?: string;
}
