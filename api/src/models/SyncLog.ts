import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";
import { Event } from "./Event";
import { User } from "./User";

export class SyncLog extends Model {
  public id!: string;
  public event_id!: string;
  public user_id!: string;
  public table_name?: string;
  public record_id?: string;
  public operation?: string;
  public client_timestamp?: Date;
  public server_timestamp?: Date;
  public status?: string;
}

SyncLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    table_name: { type: DataTypes.STRING },
    record_id: { type: DataTypes.UUID },
    operation: { type: DataTypes.STRING },
    client_timestamp: { type: DataTypes.DATE },
    server_timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    status: { type: DataTypes.STRING },
  },
  { sequelize, tableName: "sync_logs", timestamps: false }
);

SyncLog.belongsTo(Event, { foreignKey: "event_id" });
Event.hasMany(SyncLog, { foreignKey: "event_id" });

SyncLog.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(SyncLog, { foreignKey: "user_id" });
