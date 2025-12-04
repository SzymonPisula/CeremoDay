import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Document extends Model {
  public id!: string;
  public event_id!: string;
  public name!: string;
  public description?: string;
  public status!: "pending" | "done";
  public due_date?: Date;
  public created_at?: Date;
  public type!: "civil" | "church";
  public checked?: boolean;
  public notes?: string;
  public attachments?: { id: string; name: string; url: string; created_at: string }[];
}

Document.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.ENUM("pending", "done"), defaultValue: "pending" },
    due_date: { type: DataTypes.DATEONLY },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    type: { type: DataTypes.ENUM("civil", "church"), allowNull: false },
    checked: { type: DataTypes.BOOLEAN, defaultValue: false },
    notes: { type: DataTypes.TEXT },
    attachments: { type: DataTypes.JSON, defaultValue: [] },
  },
  { sequelize, tableName: "documents", timestamps: false }
);
