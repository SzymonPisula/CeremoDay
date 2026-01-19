import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

type Attrs = {
  id: string;
  event_id: string;

  title: string;
  note?: string | null;

  schedule_item_id?: string | null;

  done: boolean;

  created_at?: Date;
  updated_at?: Date;
};

type Creation = Optional<
  Attrs,
  "id" | "note" | "schedule_item_id" | "done" | "created_at" | "updated_at"
>;

export class WeddingDayChecklistItem extends Model<Attrs, Creation> implements Attrs {
  public id!: string;
  public event_id!: string;

  public title!: string;
  public note?: string | null;

  public schedule_item_id?: string | null;

  public done!: boolean;

  public readonly created_at?: Date;
  public readonly updated_at?: Date;
}

WeddingDayChecklistItem.init(
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

    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    schedule_item_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    done: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: "wedding_day_checklist_items",
    underscored: true,
  }
);
