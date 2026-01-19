// api/src/models/associations.ts
import { User } from "./User";
import { Event } from "./Event";
import { Guest } from "./Guest";
import { Task } from "./Task";
import { Notification } from "./Notification";
import { Budget } from "./Budget";
import { Expense } from "./Expense";
import { Vendor } from "./Vendor";
import { Document } from "./Document";
import { WeddingDaySchedule } from "./WeddingDaySchedule";
import { File } from "./File";
import { SyncLog } from "./SyncLog";
import { UserSetting } from "./UserSetting";
import { EventSetting } from "./EventSetting";
import { EventUser } from "./EventUser";

import { WeddingDayChecklistItem } from "./WeddingDayChecklistItem";
import { WeddingDayContact } from "./WeddingDayContact";

import { InspirationBoard } from "./InspirationBoard";
import { InspirationItem } from "./InspirationItem";

export function applyAssociations() {
  // === USER / EVENTS ===
  Event.belongsTo(User, { foreignKey: "created_by", as: "creator" });
  User.hasMany(Event, { foreignKey: "created_by", as: "created_events" });

  // Event ↔ User (many-to-many)
  Event.belongsToMany(User, {
    through: EventUser,
    foreignKey: "event_id",
    otherKey: "user_id",
    as: "users",
  });
  User.belongsToMany(Event, {
    through: EventUser,
    foreignKey: "user_id",
    otherKey: "event_id",
    as: "events",
  });

  // EventUser → Event/User (łatwe include w listach użytkowników eventu)
  EventUser.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(EventUser, { foreignKey: "event_id", as: "event_users" });

  EventUser.belongsTo(User, { foreignKey: "user_id", as: "user" });
  User.hasMany(EventUser, { foreignKey: "user_id", as: "event_users" });

  // === GUESTS ===
  Guest.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(Guest, { foreignKey: "event_id", as: "guests" });

  // Guest → Parent Guest
  Guest.belongsTo(Guest, { foreignKey: "parent_guest_id", as: "parent" });
  Guest.hasMany(Guest, { foreignKey: "parent_guest_id", as: "children" });

  // === TASKS ===
  Task.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(Task, { foreignKey: "event_id", as: "tasks" });

  // Notification ↔ Task & User
  Notification.belongsTo(Task, { foreignKey: "task_id", as: "task" });
  Task.hasMany(Notification, { foreignKey: "task_id", as: "notifications" });

  Notification.belongsTo(User, { foreignKey: "user_id", as: "user" });
  User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" });

  // === VENDORS ===
  Vendor.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(Vendor, { foreignKey: "event_id", as: "vendors" });

  // === BUDGET / EXPENSE ===
  Budget.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(Budget, { foreignKey: "event_id", as: "budgets" });

  Expense.belongsTo(Budget, { foreignKey: "budget_id", as: "budget" });
  Budget.hasMany(Expense, { foreignKey: "budget_id", as: "expenses" });

  // === DOCUMENTS ===
  Document.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(Document, { foreignKey: "event_id", as: "documents" });

  // === INSPIRATIONS ===
  InspirationBoard.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(InspirationBoard, { foreignKey: "event_id", as: "inspiration_boards" });

  InspirationItem.belongsTo(InspirationBoard, { foreignKey: "board_id", as: "board" });
  InspirationBoard.hasMany(InspirationItem, {
    foreignKey: "board_id",
    as: "items",
    onDelete: "CASCADE",
  });

  InspirationItem.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(InspirationItem, { foreignKey: "event_id", as: "inspiration_items" });

  // === WEDDING DAY (harmonogram + checklista + kontakty) ===

  // Harmonogram dnia (u Ciebie: WeddingDaySchedule)
  WeddingDaySchedule.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(WeddingDaySchedule, { foreignKey: "event_id", as: "wedding_day_schedule" });

  // Checklista
  WeddingDayChecklistItem.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(WeddingDayChecklistItem, { foreignKey: "event_id", as: "wedding_day_checklist" });

  // Powiązanie checklisty z harmonogramem (opcjonalne)
  // FK: schedule_item_id w WeddingDayChecklistItem → id w WeddingDaySchedule
  WeddingDayChecklistItem.belongsTo(WeddingDaySchedule, {
    foreignKey: "schedule_item_id",
    as: "schedule_item",
  });
  WeddingDaySchedule.hasMany(WeddingDayChecklistItem, {
    foreignKey: "schedule_item_id",
    as: "checklist_items",
  });

  // Kontakty
  WeddingDayContact.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(WeddingDayContact, { foreignKey: "event_id", as: "wedding_day_contacts" });

  // === FILES ===
  File.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(File, { foreignKey: "event_id", as: "files" });

  // === SYNC LOG ===
  SyncLog.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(SyncLog, { foreignKey: "event_id", as: "sync_logs" });

  SyncLog.belongsTo(User, { foreignKey: "user_id", as: "user" });
  User.hasMany(SyncLog, { foreignKey: "user_id", as: "sync_logs" });

  // === SETTINGS ===
  UserSetting.belongsTo(User, { foreignKey: "user_id", as: "user" });
  User.hasMany(UserSetting, { foreignKey: "user_id", as: "user_settings" });

  EventSetting.belongsTo(Event, { foreignKey: "event_id", as: "event" });
  Event.hasMany(EventSetting, { foreignKey: "event_id", as: "event_settings" });
}
