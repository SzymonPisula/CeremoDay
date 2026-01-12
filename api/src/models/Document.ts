import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Document extends Model {
  public id!: string;
  public event_id!: string;
  public name!: string;
  public description?: string | null;
  public status!: "pending" | "done";
  public due_date?: Date | null;
  public created_at?: Date;

  // ✅ teraz wspiera custom
  public type!: "civil" | "church" | "custom";

  public checked?: boolean;
  public notes?: string | null;
  public attachments?: { id: string; name: string; url: string; created_at: string }[];
}

Document.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },

    // ✅ allow null / optional
description: { type: DataTypes.TEXT, allowNull: true },

    status: { type: DataTypes.ENUM("pending", "done"), defaultValue: "pending" },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },

    // ✅ kluczowa zmiana
type: {
  type: DataTypes.ENUM("civil", "church", "custom"),
  allowNull: false,
  defaultValue: "custom",
},

    checked: { type: DataTypes.BOOLEAN, defaultValue: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    attachments: { type: DataTypes.JSON, defaultValue: [] },
  },
  { sequelize, tableName: "documents", timestamps: false }
);
