// src/models/User.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class User extends Model {
  public id!: string;
  public email!: string;
  public password_hash!: string;
  public name?: string;
  public role?: string;
  public created_at?: Date;
  public updated_at?: Date;
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "users", timestamps: true }
);
