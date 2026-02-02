// CeremoDay/api/src/models/Event.ts
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export interface EventAttributes {
  id: string;
  name: string;
  access_code: string;
  created_by: string;

  start_date: string | null;
  location: string | null;

  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export type EventCreationAttributes = Optional<
  EventAttributes,
  "id" | "start_date" | "location" | "created_at" | "updated_at" | "deleted_at"
>;

/**
 * WAŻNE:
 * Używamy `declare` zamiast `public ...!:`, żeby NIE shadowować getterów Sequelize.
 * To naprawia przypadki gdzie np. `event.id` wychodziło undefined/null w runtime.
 */
export class Event
  extends Model<EventAttributes, EventCreationAttributes>
  implements EventAttributes
{
  declare id: string;
  declare name: string;
  declare access_code: string;
  declare created_by: string;

  declare start_date: string | null;
  declare location: string | null;

  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

Event.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },

    name: { type: DataTypes.STRING, allowNull: false },
    access_code: { type: DataTypes.STRING, allowNull: false },
    created_by: { type: DataTypes.UUID, allowNull: false },

    start_date: { type: DataTypes.STRING, allowNull: true },
    location: { type: DataTypes.STRING, allowNull: true },

    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: "events",

    // kluczowe: mapujemy createdAt/updatedAt na Twoje created_at/updated_at
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    paranoid: true,
  }
);
