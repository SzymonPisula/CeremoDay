// CeremoDay/web/src/types/admin.ts
export type UserRole = "user" | "admin";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
};

export type AdminUpdateUserPayload = {
  email?: string;
  name?: string | null;
  role?: UserRole;
};

export type AdminCreateUserPayload = {
  email: string;
  password: string;
  name?: string | null;
  role?: UserRole;
};

export type MeUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};
