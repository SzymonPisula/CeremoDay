import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export interface InspirationsBoardAttributes {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface Creation extends Optional<InspirationsBoardAttributes, "id"> {}

export class InspirationsBoard
  extends Model<InspirationsBoardAttributes, Creation>
  implements InspirationsBoardAttributes
{
  public id!: string;
  public event_id!: string;
  public name!: string;
  public description?: string;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

InspirationsBoard.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    event_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING },
  },
  {
    sequelize,
    tableName: "inspirations_boards",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);
