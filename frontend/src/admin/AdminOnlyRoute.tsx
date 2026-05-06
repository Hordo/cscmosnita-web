import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Allows any admin: superuser, is_staff, or has any discipline role */
export const AdminOnlyRoute: React.FC = () => {
  const { isAnyAdmin } = useAuth();
  if (!isAnyAdmin()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

/** Allows only superusers */
export const SuperAdminRoute: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

export default AdminOnlyRoute;
