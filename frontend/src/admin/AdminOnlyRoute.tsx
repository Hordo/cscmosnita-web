import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const AdminOnlyRoute: React.FC = () => {
  const { user } = useAuth();
  if (!user || !user.is_staff) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

export default AdminOnlyRoute;
