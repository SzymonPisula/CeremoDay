import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Guest extends Model {
  public id!: string;
  public event_id!: string;
  public parent_guest_id?: string;
  public first_name?: string;
  public last_name?: string;
  public phone?: string;
  public email?: string;
  public relation?: string;
  public side?: string;
  public rsvp?: string;
  public allergens?: string;
  public notes?: string;
}

Guest.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    event_id: { type: DataTypes.UUID, allowNull: false },
    parent_guest_id: { type: DataTypes.UUID },
    first_name: { type: DataTypes.STRING },
    last_name: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    relation: { type: DataTypes.STRING },
    side: { type: DataTypes.STRING },
    rsvp: { type: DataTypes.STRING },
    allergens: { type: DataTypes.TEXT },
    notes: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "guests", timestamps: true }
);

Guest.belongsTo(Guest, { as: "Parent", foreignKey: "parent_guest_id" });
Guest.hasMany(Guest, { as: "SubGuests", foreignKey: "parent_guest_id" });
