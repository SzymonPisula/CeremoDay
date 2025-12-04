export type VendorCategory =
  | "catering"
  | "dj"
  | "florist"
  | "photographer"
  | "venue"
  | "other";

export interface Vendor {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: VendorCategory;
  rating?: number;
  place_id?: string;
}
