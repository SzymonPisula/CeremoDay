// CeremoDay/api/src/models/EventSetting.ts
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export interface EventSettingAttributes {
  id: string;
  event_id: string;

  interview_data: unknown | null;
  theme: string | null;
  preferences: unknown | null;

  updated_at?: Date;
}

export type EventSettingCreationAttributes = Optional<
  EventSettingAttributes,
  "id" | "interview_data" | "theme" | "preferences" | "updated_at"
>;

export class EventSetting
  extends Model<EventSettingAttributes, EventSettingCreationAttributes>
  implements EventSettingAttributes
{
  declare id: string;
  declare event_id: string;

  declare interview_data: unknown | null;
  declare theme: string | null;
  declare preferences: unknown | null;

  declare updated_at: Date;
}

EventSetting.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },

    event_id: { type: DataTypes.UUID, allowNull: false },

    interview_data: { type: DataTypes.JSON, allowNull: true },
    theme: { type: DataTypes.STRING, allowNull: true },
    preferences: { type: DataTypes.JSON, allowNull: true },

    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: "event_settings",

    // U Ciebie wygląda, że chcesz tylko updated_at, więc wyłączamy automatyczne timestampy
    timestamps: false,
  }
);
