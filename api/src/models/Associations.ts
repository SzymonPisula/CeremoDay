// src/models/associations.ts
import { User } from "./User";
import { Event } from "./Event";
import { Guest } from "./Guest";
import { Task } from "./Task";
import { Notification } from "./Notification";
import { Budget } from "./Budget";
import { Expense } from "./Expense";
import { Vendor } from "./Vendor";
import { Document } from "./Document";
import { Inspiration } from "./Inspiration";
import { WeddingDaySchedule } from "./WeddingDaySchedule";
import { File } from "./File";
import { SyncLog } from "./SyncLog";
import { UserSetting } from "./UserSetting";
import { EventSetting } from "./EventSetting";
import { EventUser } from "./EventUser";

export function applyAssociations() {
  // User ↔ Event
  Event.belongsTo(User, { foreignKey: "created_by" });
  User.hasMany(Event, { foreignKey: "created_by" });
  
  // Event ↔ User (wiele do wielu przez EventUser)
  Event.belongsToMany(User, { through: EventUser, foreignKey: "event_id", as: "users" });
  User.belongsToMany(Event, { through: EventUser, foreignKey: "user_id", as: "events" });

  // Event ↔ Guests
  Guest.belongsTo(Event, { foreignKey: "event_id" });
  Event.hasMany(Guest, { foreignKey: "event_id" });
  Guest.belongsTo(Guest, { foreignKey: "parent_guest_id", as: "parent" });

  // Event ↔ Tasks
  Task.belongsTo(Event, { foreignKey: "event_id" });
  Event.hasMany(Task, { foreignKey: "event_id" });

  // Notification ↔ Task & User
  Notification.belongsTo(Task, { foreignKey: "task_id" });
  Task.hasMany(Notification, { foreignKey: "task_id" });
  Notification.belongsTo(User, { foreignKey: "user_id" });
  User.hasMany(Notification, { foreignKey: "user_id" });

  // Event ↔ Vendors
  Vendor.belongsTo(Event, { foreignKey: "event_id" });
  Event.hasMany(Vendor, { foreignKey: "event_id" });

  // Event ↔ Budgets ↔ Expenses
  Budget.belongsTo(Event, { foreignKey: "event_id" });
  Event.hasMany(Budget, { foreignKey: "event_id" });
  Expense.belongsTo(Budget, { foreignKey: "budget_id" });
  Budget.hasMany(Expense, { foreignKey: "budget_id" });

  // Event ↔ Documents
  Document.belongsTo(Event, { foreignKey: "event_id" });
  Event.hasMany(Document, { foreignKey: "event_id" });

  // Event ↔ Inspirations
  Inspiration.belongsTo(Event, { foreignKey: "event_id" });
  Event.hasMany(Inspiration, { foreignKey: "event_id" });

  // Event ↔ WeddingDaySchedule
  WeddingDaySchedule.belongsTo(Event, { foreignKey: "event_id" });
  Event.hasMany(WeddingDaySchedule, { foreignKey: "event_id" });

  // Event ↔ Files
  File.belongsTo(Event, { foreignKey: "event_id" });
  Event.hasMany(File, { foreignKey: "event_id" });

  // Event ↔ SyncLogs
  SyncLog.belongsTo(Event, { foreignKey: "event_id" });
  Event.hasMany(SyncLog, { foreignKey: "event_id" });
  SyncLog.belongsTo(User, { foreignKey: "user_id" });
  User.hasMany(SyncLog, { foreignKey: "user_id" });

  // User ↔ UserSettings
  UserSetting.belongsTo(User, { foreignKey: "user_id" });
  User.hasMany(UserSetting, { foreignKey: "user_id" });

  // Event ↔ EventSettings
  EventSetting.belongsTo(Event, { foreignKey: "event_id" });
  Event.hasMany(EventSetting, { foreignKey: "event_id" });
}
