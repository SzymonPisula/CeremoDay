// CeremoDay/api/src/models/Expense.ts
import { DataTypes, Model, Optional } from "sequelize";
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

export type ExpenseStatus = "PLANNED" | "IN_PROGRESS" | "PAID";

export interface ExpenseAttributes {
  id: string;
  event_id: string;

  name: string;
  category: ExpenseCategory;

  status: ExpenseStatus;

  planned_amount: number | null;
  actual_amount: number | null;

  due_date: Date | null;
  paid_date: Date | null;

  vendor_name: string | null;
  notes: string | null;

  created_at?: Date;
  updated_at?: Date;
}

export type ExpenseCreationAttributes = Optional<
  ExpenseAttributes,
  "id" | "status" | "planned_amount" | "actual_amount" | "due_date" | "paid_date" | "vendor_name" | "notes" | "created_at" | "updated_at"
>;

export class Expense extends Model<ExpenseAttributes, ExpenseCreationAttributes> implements ExpenseAttributes {
  public id!: string;
  public event_id!: string;

  public name!: string;
  public category!: ExpenseCategory;

  public status!: ExpenseStatus;

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
    event_id: { type: DataTypes.UUID, allowNull: false },

    name: { type: DataTypes.STRING, allowNull: false },
    category: {
      type: DataTypes.ENUM(
        "HALL",
        "CATERING",
        "MUSIC",
        "OUTFITS",
        "TRANSPORT",
        "DECOR",
        "PHOTO_VIDEO",
        "OTHER"
      ),
      allowNull: false,
      defaultValue: "OTHER",
    },

    status: {
      type: DataTypes.ENUM("PLANNED", "IN_PROGRESS", "PAID"),
      allowNull: false,
      defaultValue: "PLANNED",
    },

    planned_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    actual_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },

    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    paid_date: { type: DataTypes.DATEONLY, allowNull: true },

    vendor_name: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },

    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "expenses", timestamps: true }
);

export default Expense;
