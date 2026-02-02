import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export type DocumentStatus = "todo" | "in_progress" | "done";
export type DocumentType = "civil" | "concordat" | "custom";

export interface DocumentAttributes {
  id: string;
  event_id: string;

  name: string;
  description: string | null;

  category: string | null;
  holder: string | null;

  type: DocumentType;
  status: DocumentStatus;

  due_date: Date | null;
  valid_until: Date | null;

  is_system: boolean;
  is_pinned: boolean;

  created_at?: Date;
  updated_at?: Date;
}

export type DocumentCreationAttributes = Optional<
  DocumentAttributes,
  | "id"
  | "description"
  | "category"
  | "holder"
  | "type"
  | "status"
  | "due_date"
  | "valid_until"
  | "is_system"
  | "is_pinned"
  | "created_at"
  | "updated_at"
>;

export class Document
  extends Model<DocumentAttributes, DocumentCreationAttributes>
  implements DocumentAttributes
{
  declare id: string;
  declare event_id: string;

  declare name: string;
  declare description: string | null;

  declare category: string | null;
  declare holder: string | null;

  declare type: DocumentType;
  declare status: DocumentStatus;

  declare due_date: Date | null;
  declare valid_until: Date | null;

  declare is_system: boolean;
  declare is_pinned: boolean;

  declare created_at: Date;
  declare updated_at: Date;
}

Document.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },

    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },

    category: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    holder: { type: DataTypes.STRING, allowNull: true, defaultValue: null },

    type: {
      type: DataTypes.ENUM("civil", "concordat", "custom"),
      allowNull: false,
      defaultValue: "custom",
    },


    status: {
      type: DataTypes.ENUM("todo", "in_progress", "done"),
      allowNull: false,
      defaultValue: "todo",
    },

    due_date: { type: DataTypes.DATEONLY, allowNull: true, defaultValue: null },
    valid_until: { type: DataTypes.DATEONLY, allowNull: true, defaultValue: null },

    is_system: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_pinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    tableName: "documents",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);
