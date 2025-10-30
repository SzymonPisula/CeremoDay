import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";
import { User } from "./User";

export class Event extends Model {
  public id!: string;
  public name!: string;
  public access_code!: string;
  public created_by!: string;
  public start_date?: Date;
  public location?: string;
  public created_at?: Date;
  public updated_at?: Date;
  public deleted_at?: Date;

  // === Dla TS ===
  public addUser!: (user: User | string) => Promise<void>;
  public hasUser!: (user: User | string) => Promise<boolean>;
  public getUsers!: () => Promise<User[]>;
}

Event.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    access_code: { type: DataTypes.STRING, allowNull: false, unique: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
    start_date: { type: DataTypes.DATEONLY },
    location: { type: DataTypes.STRING },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deleted_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: "events", timestamps: false }
);
