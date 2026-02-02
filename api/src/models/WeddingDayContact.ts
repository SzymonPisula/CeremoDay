import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

type Attrs = {
  id: string;
  event_id: string;

  name: string;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  note?: string | null;

  created_at?: Date;
  updated_at?: Date;
};

type Creation = Optional<Attrs, "id" | "role" | "phone" | "email" | "note" | "created_at" | "updated_at">;

export class WeddingDayContact extends Model<Attrs, Creation> implements Attrs {
  declare id: string;
  declare event_id: string;

  declare name: string;
  declare role?: string | null;
  declare phone?: string | null;
  declare email?: string | null;
  declare note?: string | null;

  declare created_at?: Date;
  declare updated_at?: Date;
}

WeddingDayContact.init(
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

    name: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "wedding_day_contacts",
    underscored: true,
  }
);
