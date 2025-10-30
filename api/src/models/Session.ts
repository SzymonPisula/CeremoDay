import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Session extends Model {
  public id!: string;
  public user_id!: string;
  public jwt_token!: string;
  public created_at!: Date;
  public expires_at!: Date;
}

Session.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    jwt_token: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE },
    expires_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: "sessions", timestamps: false }
);


