import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Vendor extends Model {
  public id!: string;
  public event_id!: string;
  public type?: string;
  public name?: string;
  public contact_name?: string;
  public phone?: string;
  public email?: string;
  public website?: string;
  public price_estimate?: number;
  public rating?: number;
  public selected?: boolean;
  public notes?: string;
  public created_at?: Date;
}

Vendor.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.ENUM('venue','catering','music','photographer','videographer','decor','transport','entertainment') },
    name: { type: DataTypes.STRING },
    contact_name: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    website: { type: DataTypes.STRING },
    address: { type: DataTypes.STRING },
    latitude: { type: DataTypes.DECIMAL(10,8) },
    longitude: { type: DataTypes.DECIMAL(11,8) },
    price_estimate: { type: DataTypes.DECIMAL },
    price_range: { type: DataTypes.ENUM('low','medium','high') },
    rating: { type: DataTypes.DECIMAL(2,1) },
    selected: { type: DataTypes.BOOLEAN, defaultValue: false },
    notes: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "vendors", timestamps: false }
);



