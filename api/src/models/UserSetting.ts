import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export interface UserSettingAttributes {
  id: string;
  user_id: string;
  language: string | null;
  theme: string | null;
  notifications_enabled: boolean | null;
}

export type UserSettingCreationAttributes = Optional<
  UserSettingAttributes,
  "id" | "language" | "theme" | "notifications_enabled"
>;

export class UserSetting
  extends Model<UserSettingAttributes, UserSettingCreationAttributes>
  implements UserSettingAttributes
{
  declare id: string;
  declare user_id: string;
  declare language: string | null;
  declare theme: string | null;
  declare notifications_enabled: boolean | null;
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

