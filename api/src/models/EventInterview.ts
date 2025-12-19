// CeremoDay/api/src/models/EventInterview.ts
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database"; 

export type ModelCeremonyType = "CIVIL" | "CHURCH" | "RECEPTION_ONLY";
export type ModelGuestCountRange = "0_30" | "31_60" | "61_100" | "101_150" | "150_PLUS";
export type ModelGuestListStatus = "READY" | "PARTIAL" | "NOT_STARTED";
export type ModelNotificationFrequency = "DAILY" | "EVERY_3_DAYS" | "WEEKLY" | "ONLY_CRITICAL";

export type ModelMusicProviderChoice = "DJ" | "BAND";
export type ModelVenueChoice = "WEDDING_HALL" | "RURAL_VENUE";

// Uwaga: VendorKey w modelu to lista “kategorii usług”, a nie wybory DJ/BAND czy WEDDING_HALL/RURAL_VENUE
export type VendorKey =
  | "DJ_OR_BAND"
  | "VENUE"
  | "CATERING"
  | "PHOTOGRAPHER"
  | "VIDEOGRAPHER"
  | "DECOR_FLORIST"
  | "TRANSPORT";

export interface EventInterviewAttributes {
  id: string;
  event_id: string;

  ceremony_type: ModelCeremonyType;
  event_date: string | null;

  guest_count_range: ModelGuestCountRange;
  guest_list_status: ModelGuestListStatus;

  // “Checklisty usług”
  required_vendors: VendorKey[];
  optional_vendors: VendorKey[];

  // Dwa wybory wymagane, o które prosisz (DJ vs orkiestra, sala weselna vs wiejska)
  music_provider_choice: ModelMusicProviderChoice;
  venue_choice: ModelVenueChoice;

  wedding_day_enabled: boolean;
  notification_frequency: ModelNotificationFrequency;

  created_at?: Date;
  updated_at?: Date;
}

export type EventInterviewCreationAttributes = Optional<
  EventInterviewAttributes,
  "id" | "event_date" | "created_at" | "updated_at"
>;

function normalizeVendorArray(value: unknown): VendorKey[] {
  // akceptujemy:
  // - tablicę stringów
  // - JSON-string tablicy (legacy / różne dialekty)
  // - null/undefined -> []
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.filter((v): v is VendorKey => typeof v === "string") as VendorKey[];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is VendorKey => typeof v === "string") as VendorKey[];
      }
      return [];
    } catch {
      return [];
    }
  }

  return [];
}

class EventInterview
  extends Model<EventInterviewAttributes, EventInterviewCreationAttributes>
  implements EventInterviewAttributes
{
  declare id: string;
  declare event_id: string;

  declare ceremony_type: ModelCeremonyType;
  declare event_date: string | null;

  declare guest_count_range: ModelGuestCountRange;
  declare guest_list_status: ModelGuestListStatus;

  declare required_vendors: VendorKey[];
  declare optional_vendors: VendorKey[];

  declare music_provider_choice: ModelMusicProviderChoice;
  declare venue_choice: ModelVenueChoice;

  declare wedding_day_enabled: boolean;
  declare notification_frequency: ModelNotificationFrequency;

  declare created_at?: Date;
  declare updated_at?: Date;
}

EventInterview.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },

    ceremony_type: {
      type: DataTypes.ENUM("CIVIL", "CHURCH", "RECEPTION_ONLY"),
      allowNull: false,
    },

    event_date: {
      type: DataTypes.STRING(10), // YYYY-MM-DD
      allowNull: true,
    },

    guest_count_range: {
      type: DataTypes.ENUM("0_30", "31_60", "61_100", "101_150", "150_PLUS"),
      allowNull: false,
    },

    guest_list_status: {
      type: DataTypes.ENUM("READY", "PARTIAL", "NOT_STARTED"),
      allowNull: false,
    },

    required_vendors: {
      // Najbezpieczniej w MySQL: JSON (trzyma tablicę)
      type: DataTypes.JSON,
      allowNull: false,
      // kluczowa rzecz: to ma być TABLICA, nie string
      defaultValue: [] as VendorKey[],
      get() {
        const raw = (this as EventInterview).getDataValue("required_vendors") as unknown;
        return normalizeVendorArray(raw);
      },
      set(value: unknown) {
        // kluczowa rzecz: zapisujemy TABLICĘ
        (this as EventInterview).setDataValue("required_vendors", normalizeVendorArray(value));
      },
    },

    optional_vendors: {
      type: DataTypes.JSON,
      allowNull: false,
      // kluczowa rzecz: to ma być TABLICA, nie string
      defaultValue: [] as VendorKey[],
      get() {
        const raw = (this as EventInterview).getDataValue("optional_vendors") as unknown;
        return normalizeVendorArray(raw);
      },
      set(value: unknown) {
        // kluczowa rzecz: zapisujemy TABLICĘ
        (this as EventInterview).setDataValue("optional_vendors", normalizeVendorArray(value));
      },
    },

    music_provider_choice: {
      type: DataTypes.ENUM("DJ", "BAND"),
      allowNull: false,
      defaultValue: "DJ",
    },

    venue_choice: {
      type: DataTypes.ENUM("WEDDING_HALL", "RURAL_VENUE"),
      allowNull: false,
      defaultValue: "WEDDING_HALL",
    },

    wedding_day_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    notification_frequency: {
      type: DataTypes.ENUM("DAILY", "EVERY_3_DAYS", "WEEKLY", "ONLY_CRITICAL"),
      allowNull: false,
      defaultValue: "EVERY_3_DAYS",
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "event_interviews",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default EventInterview;
