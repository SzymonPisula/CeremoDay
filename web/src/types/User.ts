export type UserPublic = {
  id: string;
  name?: string | null;
  email: string;
};

export type MeResponse = {
  id: string;
  name?: string | null;
  email: string;
  role?: string | null;
  created_at?: string | null;
};

export type UpdateMePayload = {
  name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
};
