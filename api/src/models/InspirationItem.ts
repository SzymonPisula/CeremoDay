// CeremoDay/api/src/models/InspirationItem.ts
import {
  DataTypes,
  Model,
  Optional,
  Sequelize,
} from "sequelize";
import { sequelize } from "../config/database";

export type InspirationCategory =
  | "DEKORACJE"
  | "KWIATY"
  | "STROJE"
  | "PAPETERIA"
  | "INNE";

export interface InspirationItemAttributes {
  id: string;
  board_id: string;

  title: string;
  description?: string | null;

  category?: InspirationCategory | null;
  tags?: string | null; // np. "rustykalny, drewniane stoły"

  image_url?: string | null; // ścieżka do pliku na serwerze, np. "/uploads/inspirations/xxx.jpg"
  source_url?: string | null; // opcjonalny link zewnętrzny

  created_at?: Date;
  updated_at?: Date;
}

export type InspirationItemCreationAttributes = Optional<
  InspirationItemAttributes,
  | "id"
  | "description"
  | "category"
  | "tags"
  | "image_url"
  | "source_url"
  | "created_at"
  | "updated_at"
>;

export class InspirationItem
  extends Model<InspirationItemAttributes, InspirationItemCreationAttributes>
  implements InspirationItemAttributes
{
  declare id: string;
  declare board_id: string;

  declare title: string;
  declare description: string | null;

  declare category: InspirationCategory | null;
  declare tags: string | null;

  declare image_url: string | null;
  declare source_url: string | null;

  declare created_at: Date;
  declare updated_at: Date;
}

InspirationItem.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    board_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM(
        "DEKORACJE",
        "KWIATY",
        "STROJE",
        "PAPETERIA",
        "INNE"
      ),
      allowNull: true,
    },
    tags: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    source_url: {
      type: DataTypes.STRING(500),
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
      defaultValue: (Sequelize as any).literal("CURRENT_TIMESTAMP"),
    },
  },
  {
    sequelize,
    tableName: "inspiration_items",
    modelName: "InspirationItem",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default InspirationItem;
