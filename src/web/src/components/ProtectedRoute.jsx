import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ roles, children }) {
  const { user, token, loading } = useAuth();

  if (loading) return <div className="page-loading">Cargando…</div>;
  if (!token || !user) return <Navigate to="/ingresar" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}
