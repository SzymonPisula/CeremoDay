// CeremoDay/api/src/models/User.ts
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export type UserRole = "user" | "admin";

export interface UserAttributes {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;

  role: UserRole;

  created_at?: Date;
  updated_at?: Date;
}

export type UserCreationAttributes = Optional<
  UserAttributes,
  "id" | "name" | "role" | "created_at" | "updated_at"
>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password_hash!: string;
  public name!: string | null;

  public role!: UserRole;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

User.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: true },

    role: {
      type: DataTypes.ENUM("user", "admin"),
      allowNull: false,
      defaultValue: "user",
    },

    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "users", timestamps: true }
);
