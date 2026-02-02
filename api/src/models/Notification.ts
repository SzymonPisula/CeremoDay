import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export interface NotificationAttributes {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string | null;
  message: string | null;
  type: string | null;
  read: boolean;
  created_at?: Date;
}

export type NotificationCreationAttributes = Optional<
  NotificationAttributes,
  "id" | "task_id" | "title" | "message" | "type" | "read" | "created_at"
>;

/**
 * WAŻNE:
 * `declare` zamiast `public ...!:`, żeby nie shadowować getterów Sequelize.
 */
export class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  declare id: string;
  declare user_id: string;
  declare task_id: string | null;
  declare title: string | null;
  declare message: string | null;
  declare type: string | null;
  declare read: boolean;
  declare created_at: Date;
}

Notification.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    task_id: { type: DataTypes.UUID, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.STRING, allowNull: true },
    read: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "notifications", timestamps: false }
);


