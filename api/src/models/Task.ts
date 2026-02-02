// CeremoDay/api/src/models/Task.ts
import {
  DataTypes,
  Model,
  Optional,
  Sequelize,
} from "sequelize";
import { sequelize } from "../config/database";

export type TaskStatus = "pending" | "in_progress" | "done";

export type TaskCategory =
  | "FORMALNOSCI"
  | "ORGANIZACJA"
  | "USLUGI"
  | "DEKORACJE"
  | "LOGISTYKA"
  | "DZIEN_SLUBU";

export interface TaskAttributes {
  id: string;
  event_id: string;

  title: string;
  description?: string | null;

  status: TaskStatus;

  category?: TaskCategory | null;

  due_date?: Date | null;

  auto_generated?: boolean;
  generated_from?: string | null;

  source: "generator" | "manual" | "document";
  linked_document_id: string | null;


  created_at?: Date;
  updated_at?: Date;
}

export type TaskCreationAttributes = Optional<
  TaskAttributes,
  | "id"
  | "description"
  | "status"
  | "category"
  | "due_date"
  | "auto_generated"
  | "generated_from"
  | "created_at"
  | "updated_at"
>;

export class Task
  extends Model<TaskAttributes, TaskCreationAttributes>
  implements TaskAttributes
{
  declare id: string;
  declare event_id: string;

  declare title: string;
  declare description: string | null;

  declare status: TaskStatus;
  declare category: TaskCategory | null;

  declare due_date: Date | null;

  declare auto_generated: boolean;
  declare generated_from: string | null;

  declare source: "generator" | "manual" | "document";
  declare linked_document_id: string | null;

  declare created_at: Date;
  declare updated_at: Date;
}

Task.init(
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "in_progress", "done"),
      allowNull: false,
      defaultValue: "pending",
    },
    category: {
      type: DataTypes.ENUM(
        "FORMALNOSCI",
        "ORGANIZACJA",
        "USLUGI",
        "DEKORACJE",
        "LOGISTYKA",
        "DZIEN_SLUBU"
      ),
      allowNull: true,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    auto_generated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    generated_from: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "manual",
    },
    linked_document_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: (Sequelize as any).literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: (Sequelize as any).literal(
        "CURRENT_TIMESTAMP"
      ),
    },
  },
  {
    sequelize,
    tableName: "tasks",
    modelName: "Task",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Task;
