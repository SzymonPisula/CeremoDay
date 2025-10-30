import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class File extends Model {
  public id!: string;
  public event_id!: string;
  public file_name?: string;
  public file_path?: string;
  public mime_type?: string;
  public size?: number;
  public created_at?: Date;
}

File.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },
    file_name: { type: DataTypes.STRING },
    file_path: { type: DataTypes.STRING },
    mime_type: { type: DataTypes.STRING },
    size: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "files", timestamps: false }
);
