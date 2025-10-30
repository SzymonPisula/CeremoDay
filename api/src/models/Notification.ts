import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";


export class Notification extends Model {
  public id!: string;
  public user_id!: string;
  public task_id!: string;
  public title?: string;
  public message?: string;
  public type?: string;
  public read?: boolean;
  public created_at?: Date;
}

Notification.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    task_id: { type: DataTypes.UUID },
    title: { type: DataTypes.STRING },
    message: { type: DataTypes.TEXT },
    type: { type: DataTypes.STRING },
    read: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "notifications", timestamps: false }
);


