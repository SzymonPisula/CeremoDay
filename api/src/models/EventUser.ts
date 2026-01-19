import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";
import { Event } from "./Event";
import { User } from "./User";

export class EventUser extends Model {
  public event_id!: string;
  public user_id!: string;
  public role!: "owner" | "coorganizer" | "guest";
  public status!: "pending" | "active" | "removed";
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
      type: DataTypes.ENUM("owner", "coorganizer", "guest"),
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
