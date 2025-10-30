import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Document extends Model {
  public id!: string;
  public event_id!: string;
  public name?: string;
  public description?: string;
  public status?: string;
  public due_date?: Date;
  public created_at?: Date;
}

Document.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING },
    due_date: { type: DataTypes.DATEONLY },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "documents", timestamps: false }
);

