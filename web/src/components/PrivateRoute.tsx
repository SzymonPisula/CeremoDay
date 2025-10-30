import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export function PrivateRoute({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
