import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Inspiration extends Model {
  public id!: string;
  public event_id!: string;
  public title?: string;
  public image_url?: string;
  public category?: string;
  public note?: string;
  public created_at?: Date;
}

Inspiration.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING },
    image_url: { type: DataTypes.STRING },
    category: { type: DataTypes.STRING },
    note: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "inspirations", timestamps: false }
);

