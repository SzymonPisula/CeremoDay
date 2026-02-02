import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Guest extends Model {
  declare id: string;
  declare event_id: string;
  declare parent_guest_id?: string;
  declare first_name?: string;
  declare last_name?: string;
  declare phone?: string;
  declare email?: string;
  declare relation?: string;
  declare side?: string;
  declare rsvp?: string;
  declare allergens?: string;
  declare notes?: string;
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
