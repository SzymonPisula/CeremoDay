import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";
import { Event } from "./Event";
import { User } from "./User";

export class EventUser extends Model {
  public event_id!: string;
  public user_id!: string;
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
  },
  { sequelize, modelName: "EventUser", tableName: "event_users", timestamps: false }
);
