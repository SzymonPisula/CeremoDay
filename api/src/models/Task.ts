import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Task extends Model {
  public id!: string;
  public event_id!: string;
  public category?: string;
  public title?: string;
  public description?: string;
  public status?: string;
  public priority?: number;
  public due_date?: Date;
  public created_at?: Date;
}

Task.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },
    category: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING },
    priority: { type: DataTypes.INTEGER },
    due_date: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "tasks", timestamps: false }
);


