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

// używane tylko do ustawienia flagi rehydratacji w konfiguracji persist
let __setAuthState: ((partial: Partial<AuthState>) => void) | null = null;

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  me: MeUser | null;

  // ✅ żeby uniknąć "pustych scen" przy rehydratacji zustand-persist
  hasHydrated: boolean;

  login: (token: string) => void;
  logout: () => void;

  setMe: (me: MeUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => {
      __setAuthState = set;
      return {
      token: null,
      isAuthenticated: false,
      me: null,

      hasHydrated: false,

      login: (token: string) => set({ token, isAuthenticated: true }),
      logout: () => set({ token: null, isAuthenticated: false, me: null }),

      setMe: (me) => set({ me }),
    };
    },
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),

      // ✅ ustawiamy flagę po odczycie storage
      onRehydrateStorage: () => (state, error) => {
        // mimo błędu uznajemy, że rehydratacja "zakończona" (żeby nie wisieć w nieskończoność)
        if (error) {
          __setAuthState?.({ me: null });
        }
        __setAuthState?.({ hasHydrated: true });
      },
    }
  )
);
