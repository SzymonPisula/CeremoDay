import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Expense extends Model {
  public id!: string;
  public budget_id!: string;
  public category?: string;
  public description?: string;
  public planned_amount?: number;
  public actual_amount?: number;
  public paid?: boolean;
  public due_date?: Date;
  public created_at?: Date;
}

Expense.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    budget_id: { type: DataTypes.UUID, allowNull: false },
    category: { type: DataTypes.STRING },
    description: { type: DataTypes.STRING },
    planned_amount: { type: DataTypes.DECIMAL },
    actual_amount: { type: DataTypes.DECIMAL },
    paid: { type: DataTypes.BOOLEAN, defaultValue: false },
    due_date: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "expenses", timestamps: false }
);

