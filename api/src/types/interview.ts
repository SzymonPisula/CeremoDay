export type CeremonyType = "civil" | "church" | "reception_only";

export type GuestCountRange = "0_30" | "31_60" | "61_100" | "101_150" | "150_plus";
export type GuestListStatus = "ready" | "partial" | "not_started";

export type VendorKey =
  | "DJ_OR_BAND"
  | "VENUE"
  | "CATERING"
  | "PHOTOGRAPHER"
  | "VIDEOGRAPHER"
  | "DECOR_FLORIST"
  | "TRANSPORT";

export type NotificationFrequency = "daily" | "every_3_days" | "weekly" | "only_critical";
export type FinanceCurrency = "PLN" | "EUR" | "USD";

// wymagane wybory (NOWE)
export type MusicProviderChoice = "DJ" | "BAND"; // DJ / Orkiestra
export type VenueChoice = "WEDDING_HALL" | "RURAL_VENUE"; // Sala weselna / Sala wiejska

export type InterviewPayload = {
  ceremony_type: CeremonyType;
  event_date: string | null;
  
  finance_initial_budget: number | null;

  guest_count_range: GuestCountRange;
  guest_list_status: GuestListStatus;

  music_provider_choice: MusicProviderChoice;
  venue_choice: VenueChoice;

  required_vendors: VendorKey[];
  optional_vendors: VendorKey[];

  wedding_day_enabled: boolean;
  notification_frequency: NotificationFrequency;
};

export type InterviewResponse = InterviewPayload & {
  id: string;
  event_id: string;

  created_at?: string;
  updated_at?: string;
  has_date: boolean;
};
