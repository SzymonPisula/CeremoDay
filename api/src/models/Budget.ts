// CeremoDay/api/src/models/Budget.ts
import {
  DataTypes,
  Model,
  Optional,
  Sequelize,
} from "sequelize";
import { sequelize } from "../config/database";

export interface BudgetAttributes {
  id: string;
  event_id: string;
  initial_budget: number | null; // budżet początkowy
  currency: string;             // np. "PLN"
  notes: string | null;

  created_at?: Date;
  updated_at?: Date;
}

export type BudgetCreationAttributes = Optional<
  BudgetAttributes,
  "id" | "initial_budget" | "notes" | "created_at" | "updated_at"
>;

export class Budget
  extends Model<BudgetAttributes, BudgetCreationAttributes>
  implements BudgetAttributes
{
  declare id: string;
  declare event_id: string;
  declare initial_budget: number | null;
  declare currency: string;
  declare notes: string | null;

  declare created_at: Date;
  declare updated_at: Date;
}

Budget.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    initial_budget: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "PLN",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: (Sequelize as unknown as { literal: (v: string) => unknown }).literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: (Sequelize as unknown as { literal: (v: string) => unknown }).literal("CURRENT_TIMESTAMP"),
    },
  },
  {
    sequelize,
    tableName: "budgets",
    modelName: "Budget",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);




export default Budget;
