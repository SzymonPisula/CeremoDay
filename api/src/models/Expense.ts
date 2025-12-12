// CeremoDay/api/src/models/Expense.ts
import {
  DataTypes,
  Model,
  Optional,
  Sequelize,
} from "sequelize";
import { sequelize } from "../config/database";

export type ExpenseCategory =
  | "HALL"
  | "CATERING"
  | "MUSIC"
  | "OUTFITS"
  | "TRANSPORT"
  | "DECOR"
  | "PHOTO_VIDEO"
  | "OTHER";

export interface ExpenseAttributes {
  id: string;
  event_id: string;

  name: string;             // nazwa wydatku, np. "Zaliczka za salę"
  category: ExpenseCategory;

  planned_amount: number | null;
  actual_amount: number | null;

  due_date: Date | null;   // termin płatności
  paid_date: Date | null;  // faktyczna data płatności

  vendor_name: string | null;
  notes: string | null;

  created_at?: Date;
  updated_at?: Date;
}

export type ExpenseCreationAttributes = Optional<
  ExpenseAttributes,
  | "id"
  | "planned_amount"
  | "actual_amount"
  | "due_date"
  | "paid_date"
  | "vendor_name"
  | "notes"
  | "created_at"
  | "updated_at"
>;

export class Expense
  extends Model<ExpenseAttributes, ExpenseCreationAttributes>
  implements ExpenseAttributes
{
  public id!: string;
  public event_id!: string;

  public name!: string;
  public category!: ExpenseCategory;

  public planned_amount!: number | null;
  public actual_amount!: number | null;

  public due_date!: Date | null;
  public paid_date!: Date | null;

  public vendor_name!: string | null;
  public notes!: string | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Expense.init(
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    planned_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    actual_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    paid_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    vendor_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
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
    tableName: "expenses",
    modelName: "Expense",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Expense;
