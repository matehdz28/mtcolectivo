// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isLoggedIn } from "../services/auth";

export default function ProtectedRoute() {
  const authed = isLoggedIn();
  const location = useLocation();

  if (!authed) {
    // guarda a dónde quería ir
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}