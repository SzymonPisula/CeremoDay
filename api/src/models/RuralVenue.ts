// CeremoDay/api/src/models/RuralVenue.ts
import {
  DataTypes,
  Model,
  Optional,
  Sequelize,
} from "sequelize";
import { sequelize } from "../config/database";

export interface RuralVenueAttributes {
  id: string;

  commune_office: string;      // Urząd Gminy
  name: string;                // Nazwa obiektu
  address: string;             // Dokładna lokalizacja
  type: string | null;         // Typ obiektu

  usable_area: string | null;  // Powierzchnia użytkowa (tekstowo)
  max_participants: number | null; // Maksymalna liczba uczestników

  equipment: string | null;    // Wyposażenie
  rental_info: string | null;  // Informacje dot. wynajmu
  pricing: string | null;      // Obowiązujące stawki
  county: string | null;       // Powiat
  notes: string | null;        // Notatki

  lat: number | null;          // Szerokość geograficzna
  lng: number | null;          // Długość geograficzna

  created_at?: Date;
  updated_at?: Date;
}

export type RuralVenueCreationAttributes = Optional<
  RuralVenueAttributes,
  | "id"
  | "type"
  | "usable_area"
  | "max_participants"
  | "equipment"
  | "rental_info"
  | "pricing"
  | "county"
  | "notes"
  | "lat"
  | "lng"
  | "created_at"
  | "updated_at"
>;

export class RuralVenue
  extends Model<RuralVenueAttributes, RuralVenueCreationAttributes>
  implements RuralVenueAttributes
{
  public id!: string;

  public commune_office!: string;
  public name!: string;
  public address!: string;
  public type!: string | null;

  public usable_area!: string | null;
  public max_participants!: number | null;

  public equipment!: string | null;
  public rental_info!: string | null;
  public pricing!: string | null;
  public county!: string | null;
  public notes!: string | null;

  public lat!: number | null;
  public lng!: number | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

RuralVenue.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    commune_office: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    usable_area: {
      type: DataTypes.STRING(100),
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
    rental_info: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pricing: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    county: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
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
    tableName: "rural_venues",
    modelName: "RuralVenue",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default RuralVenue;
