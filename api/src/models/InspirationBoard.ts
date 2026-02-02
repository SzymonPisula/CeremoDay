// CeremoDay/api/src/models/InspirationBoard.ts
import {
  DataTypes,
  Model,
  Optional,
  Sequelize,
} from "sequelize";
import { sequelize } from "../config/database";

export interface InspirationBoardAttributes {
  id: string;
  event_id: string;

  name: string;
  description?: string | null;

  color?: string | null; // np. "#FDE68A" albo "amber"
  emoji?: string | null; // np. "💐"

  created_at?: Date;
  updated_at?: Date;
}

export type InspirationBoardCreationAttributes = Optional<
  InspirationBoardAttributes,
  "id" | "description" | "color" | "emoji" | "created_at" | "updated_at"
>;

export class InspirationBoard
  extends Model<InspirationBoardAttributes, InspirationBoardCreationAttributes>
  implements InspirationBoardAttributes
{
  declare id: string;
  declare event_id: string;

  declare name: string;
  declare description: string | null;

  declare color: string | null;
  declare emoji: string | null;

  declare created_at: Date;
  declare updated_at: Date;
}

InspirationBoard.init(
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
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    emoji: {
      type: DataTypes.STRING(10),
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
    tableName: "inspiration_boards",
    modelName: "InspirationBoard",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default InspirationBoard;
