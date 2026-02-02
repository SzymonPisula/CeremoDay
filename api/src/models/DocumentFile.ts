import {
  DataTypes,
  Model,
  Optional,
} from "sequelize";
import { sequelize } from "../config/database";

export type StorageLocation = "server" | "local";
export type FilePerson = "bride" | "groom" | "both";

export interface DocumentFileAttributes {
  id: string;
  event_id: string;
  document_id: string;
  user_id: string;

  storage_location: StorageLocation;
  storage_key: string | null;

  original_name: string;
  mime_type: string;
  size: number;

  person: FilePerson | null;

  created_at?: Date;
  updated_at?: Date;
}

export type DocumentFileCreationAttributes = Optional<
  DocumentFileAttributes,
  "id" | "storage_key" | "person" | "created_at" | "updated_at"
>;

export class DocumentFile
  extends Model<DocumentFileAttributes, DocumentFileCreationAttributes>
  implements DocumentFileAttributes
{
  /**
   * WAŻNE:
   * Używamy `declare` zamiast `public ...!:`, żeby NIE shadowować getterów Sequelize.
   * Shadowing potrafi dawać "losowe" undefined (np. `user_id`) i ucinać funkcjonalności.
   */
  declare id: string;
  declare event_id: string;
  declare document_id: string;
  declare user_id: string;

  declare storage_location: StorageLocation;
  declare storage_key: string | null;

  declare original_name: string;
  declare mime_type: string;
  declare size: number;

  declare person: FilePerson | null;

  declare created_at: Date;
  declare updated_at: Date;
}

DocumentFile.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    document_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    storage_location: {
      type: DataTypes.ENUM("server", "local"),
      allowNull: false,
      defaultValue: "server",
    },
    storage_key: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    original_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    size: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    person: {
      type: DataTypes.ENUM("bride", "groom", "both"),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "document_files",
    modelName: "DocumentFile",
    underscored: true,
  }
);
