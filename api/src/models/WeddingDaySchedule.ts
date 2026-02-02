import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class WeddingDaySchedule extends Model {
  declare id: string;
  declare event_id: string;
  declare time?: Date;
  declare title?: string;
  declare description?: string;
  declare responsible?: string;
  declare completed?: boolean;
  declare created_at?: Date;
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


