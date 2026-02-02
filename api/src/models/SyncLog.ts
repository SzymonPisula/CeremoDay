import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";
import { Event } from "./Event";
import { User } from "./User";

export interface SyncLogAttributes {
  id: string;
  event_id: string;
  user_id: string;
  table_name: string | null;
  record_id: string | null;
  operation: string | null;
  client_timestamp: Date | null;
  server_timestamp: Date | null;
  status: string | null;
}

export type SyncLogCreationAttributes = Optional<
  SyncLogAttributes,
  "id" | "table_name" | "record_id" | "operation" | "client_timestamp" | "server_timestamp" | "status"
>;

export class SyncLog extends Model<SyncLogAttributes, SyncLogCreationAttributes> implements SyncLogAttributes {
  declare id: string;
  declare event_id: string;
  declare user_id: string;
  declare table_name: string | null;
  declare record_id: string | null;
  declare operation: string | null;
  declare client_timestamp: Date | null;
  declare server_timestamp: Date | null;
  declare status: string | null;
}

SyncLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    table_name: { type: DataTypes.STRING, allowNull: true },
    record_id: { type: DataTypes.UUID, allowNull: true },
    operation: { type: DataTypes.STRING, allowNull: true },
    client_timestamp: { type: DataTypes.DATE, allowNull: true },
    server_timestamp: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    status: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, tableName: "sync_logs", timestamps: false }
);

SyncLog.belongsTo(Event, { foreignKey: "event_id" });
Event.hasMany(SyncLog, { foreignKey: "event_id" });

SyncLog.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(SyncLog, { foreignKey: "user_id" });
