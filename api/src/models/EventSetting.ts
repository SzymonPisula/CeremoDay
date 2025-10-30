import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class EventSetting extends Model {
  public id!: string;
  public event_id!: string;
  public interview_data?: string;
  public theme?: string;
  public preferences?: string;
  public updated_at?: Date;
}

EventSetting.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },
    interview_data: { type: DataTypes.TEXT },
    theme: { type: DataTypes.STRING },
    preferences: { type: DataTypes.TEXT },
    updated_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: "event_settings", timestamps: false }
);


