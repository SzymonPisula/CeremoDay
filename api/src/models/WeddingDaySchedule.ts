import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class WeddingDaySchedule extends Model {
  public id!: string;
  public event_id!: string;
  public time?: Date;
  public title?: string;
  public description?: string;
  public responsible?: string;
  public completed?: boolean;
  public created_at?: Date;
}

WeddingDaySchedule.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },
    time: { type: DataTypes.DATE },
    title: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    responsible: { type: DataTypes.STRING },
    completed: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "wedding_day_schedule", timestamps: false }
);


