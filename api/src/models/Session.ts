import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export interface SessionAttributes {
  id: string;
  user_id: string;
  jwt_token: string;
  created_at: Date;
  expires_at: Date;
}

export type SessionCreationAttributes = Optional<SessionAttributes, "id" | "created_at">;

/**
 * WAŻNE: `declare` zamiast `public ...!:` (unikanie shadowingu pól Sequelize).
 */
export class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
  declare id: string;
  declare user_id: string;
  declare jwt_token: string;
  declare created_at: Date;
  declare expires_at: Date;
}

Session.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    jwt_token: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    expires_at: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: "sessions", timestamps: false }
);


