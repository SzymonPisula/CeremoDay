import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export type WeddingDayScheduleStatus = "planned" | "in_progress" | "done";

type Attrs = {
  id: string;
  event_id: string;

  time: string; // "HH:mm"
  title: string;
  description?: string | null;
  location?: string | null;
  responsible?: string | null;

  status: WeddingDayScheduleStatus;

  created_at?: Date;
  updated_at?: Date;
};

type Creation = Optional<
  Attrs,
  "id" | "description" | "location" | "responsible" | "status" | "created_at" | "updated_at"
>;

class WeddingDayScheduleItem extends Model<Attrs, Creation> implements Attrs {
  public id!: string;
  public event_id!: string;

  public time!: string;
  public title!: string;
  public description?: string | null;
  public location?: string | null;
  public responsible?: string | null;

  public status!: WeddingDayScheduleStatus;

  public readonly created_at?: Date;
  public readonly updated_at?: Date;
}

WeddingDayScheduleItem.init(
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

    time: {
      type: DataTypes.STRING(5),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(180),
      allowNull: true,
    },
    responsible: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("planned", "in_progress", "done"),
      allowNull: false,
      defaultValue: "planned",
    },
  },
  {
    sequelize,
    tableName: "wedding_day_schedule_items",
    underscored: true,
  }
);

export default WeddingDayScheduleItem;
