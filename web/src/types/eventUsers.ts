// CeremoDay/web/src/types/eventUsers.ts

/**
 * FIX: casing conflict on Windows / TS
 * Było:
 *   import type { UserPublic } from "./user";
 * A w projekcie istnieje też "./User.ts"
 *
 * Zostawiamy JEDEN kanoniczny plik: User.ts
 * i wszędzie importujemy z "./User"
 */

import type { UserPublic } from "./user";

export type EventRole = "owner" | "coorganizer";

export type EventUserStatus = "pending" | "active" | "removed";

export type EventUserRow = {
  event_id: string;
  user_id: string;
  role: EventRole;
  status?: EventUserStatus;
  user?: UserPublic;
};

export type EventUsersResponse = {
  my_user_id: string;
  my_role: EventRole;
  my_status?: EventUserStatus;
  users: EventUserRow[];
};
