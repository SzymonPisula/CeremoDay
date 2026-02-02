import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";
import { Event } from "./Event";
import { User } from "./User";

export type EventUserRole = "owner" | "coorganizer";
export type EventUserStatus = "pending" | "active" | "removed";

export interface EventUserAttributes {
  event_id: string;
  user_id: string;
  role: EventUserRole;
  status: EventUserStatus;
}

export type EventUserCreationAttributes = Optional<EventUserAttributes, "status" | "role">;

/**
 * WAŻNE:
 * Używamy `declare` zamiast `public ...!:`, żeby NIE shadowować getterów Sequelize.
 * Shadowing powoduje "losowe" undefined np. na `user_id`, mimo że rekord istnieje w DB.
 */
export class EventUser
  extends Model<EventUserAttributes, EventUserCreationAttributes>
  implements EventUserAttributes
{
  declare event_id: string;
  declare user_id: string;
  declare role: EventUserRole;
  declare status: EventUserStatus;
}

EventUser.init(
  {
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Event, key: "id" },
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: User, key: "id" },
    },
    role: {
      type: DataTypes.ENUM("owner", "coorganizer"),
      allowNull: false,
      defaultValue: "coorganizer", 
    },
    status: {
      type: DataTypes.ENUM("pending", "active", "removed"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    sequelize,
    modelName: "EventUser",
    tableName: "event_users",
    timestamps: false,
  }
);
