// CeremoDay/web/src/store/auth.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type UserRole = "user" | "admin";

export type MeUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  me: MeUser | null;

  login: (token: string) => void;
  logout: () => void;

  setMe: (me: MeUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,
      me: null,

      login: (token: string) => set({ token, isAuthenticated: true }),
      logout: () => set({ token: null, isAuthenticated: false, me: null }),

      setMe: (me) => set({ me }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
