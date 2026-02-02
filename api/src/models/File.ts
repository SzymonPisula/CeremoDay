import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class File extends Model {
  declare id: string;
  declare event_id: string;
  declare file_name?: string;
  declare file_path?: string;
  declare mime_type?: string;
  declare size?: number;
  declare created_at?: Date;
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
