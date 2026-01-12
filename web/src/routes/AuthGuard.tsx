import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}
