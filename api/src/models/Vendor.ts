// CeremoDay/api/src/models/Vendor.ts
import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { sequelize } from "../config/database";

export interface VendorAttributes {
  id: string;
  event_id: string; // przypięty do konkretnego wydarzenia

  name: string;
  type: string | null; // np. HALL, DJ, PHOTO itd.

  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  google_maps_url: string | null;

  notes: string | null;

  county: string | null;
  max_participants: number | null;
  equipment: string | null;
  pricing: string | null;
  rental_info: string | null;
  commune_office: string | null;
  rural_type: string | null;
  usable_area: number | null;

  lat: number | null;
  lng: number | null;

  created_at?: Date;
  updated_at?: Date;
}

export type VendorCreationAttributes = Optional<
  VendorAttributes,
  | "id"
  | "type"
  | "address"
  | "phone"
  | "email"
  | "website"
  | "google_maps_url"
  | "notes"
  | "county"
  | "max_participants"
  | "equipment"
  | "pricing"
  | "rental_info"
  | "commune_office"
  | "rural_type"
  | "usable_area"
  | "lat"
  | "lng"
  | "created_at"
  | "updated_at"
>;


export class Vendor
  extends Model<VendorAttributes, VendorCreationAttributes>
  implements VendorAttributes
{
  public id!: string;
  public event_id!: string;

  public name!: string;
  public type!: string | null;

  public address!: string | null;
  public phone!: string | null;
  public email!: string | null;
  public website!: string | null;
  public google_maps_url!: string | null;

  public notes!: string | null;

  public county!: string | null;
  public max_participants!: number | null;
  public equipment!: string | null;
  public pricing!: string | null;
  public rental_info!: string | null;
  public commune_office!: string | null;
  public rural_type!: string | null;
  public usable_area!: number | null;

  public lat!: number | null;
  public lng!: number | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Vendor.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    address: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    google_maps_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // ✅ snapshot z bazy sal gminnych
    county: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    max_participants: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    equipment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pricing: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rental_info: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

        commune_office: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    rural_type: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    usable_area: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    lat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    lng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: (Sequelize as any).literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: (Sequelize as any).literal("CURRENT_TIMESTAMP"),
    },
  },
  {
    sequelize,
    tableName: "vendors",
    modelName: "Vendor",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Vendor;
