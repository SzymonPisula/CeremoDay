import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

interface InspirationsItemAttributes {
  id: string;
  board_id: string | null;
  event_id: string;
  file_url: string;
  thumb_url: string | null;
  note: string | null;
  source_type: "upload" | "link";
  position: number;          // <-- dodane
  created_at?: Date;
  updated_at?: Date;
}

interface InspirationsItemCreationAttributes
  extends Optional<InspirationsItemAttributes, "id" | "thumb_url" | "note" | "position"> {} // <-- dodane position

export class InspirationsItem
  extends Model<InspirationsItemAttributes, InspirationsItemCreationAttributes>
  implements InspirationsItemAttributes
{
  public id!: string;
  public board_id!: string | null;
  public event_id!: string;
  public file_url!: string;
  public thumb_url!: string | null;
  public note!: string | null;
  public source_type!: "upload" | "link";
  public position!: number;     // <-- dodane

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

InspirationsItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    board_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    file_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    thumb_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    source_type: {
      type: DataTypes.ENUM("upload", "link"),
      allowNull: false,
      defaultValue: "link",
    },

    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 999, // domyślna pozycja
    },
  },
  {
    sequelize,
    tableName: "inspirations_items",
    timestamps: true,
    underscored: true,
  }
);
