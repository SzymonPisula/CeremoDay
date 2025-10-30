import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class UserSetting extends Model {
  public id!: string;
  public user_id!: string;
  public language?: string;
  public theme?: string;
  public notifications_enabled?: boolean;
}

UserSetting.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    language: { type: DataTypes.STRING },
    theme: { type: DataTypes.STRING },
    notifications_enabled: { type: DataTypes.BOOLEAN },
  },
  { sequelize, tableName: "user_settings", timestamps: false }
);

