// CeremoDay/web/src/routes/RequireAdmin.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export default function RequireAdmin() {
  const me = useAuthStore((s) => s.me);

  if (!me) return null; // czekamy aż AppLayout dociągnie /auth/me
  if (me.role !== "admin") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
