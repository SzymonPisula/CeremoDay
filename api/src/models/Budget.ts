import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Budget extends Model {
  public id!: string;
  public event_id!: string;
  public total_budget?: number;
  public currency?: string;
  public created_at?: Date;
}

Budget.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },
    total_budget: { type: DataTypes.DECIMAL },
    currency: { type: DataTypes.STRING },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "budgets", timestamps: false }
);

