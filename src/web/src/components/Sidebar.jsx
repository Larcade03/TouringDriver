import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api";
import NotificationModal from "./NotificationModal.jsx";

const LINKS = {
  student: [
    { to: "/", label: "Mis reservas", icon: "📅" },
    { to: "/mi-progreso", label: "Mi progreso", icon: "📈" },
    { to: "/mi-expediente", label: "Mi expediente", icon: "📋" },
    { to: "/simulacro", label: "Simulacro de examen", icon: "📝" },
  ],
  instructor: [
    { to: "/", label: "Mi horario", icon: "⏱️" },
    { to: "/alumnos", label: "Seguimiento de alumnos", icon: "👥" },
    { to: "/expedientes", label: "Expedientes", icon: "📋" },
  ],
  admin: [
    { to: "/", label: "Panel general", icon: "📊" },
    { to: "/expedientes", label: "Expedientes de matrícula", icon: "📋" },
    { to: "/personal", label: "Personal e instructores", icon: "👥" },
    { to: "/vehiculos", label: "Flota de vehículos", icon: "🚗" },
  ],
};

export default function Sidebar() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .listNotifications(token)
      .then((data) => setUnreadCount(data.unreadCount || 0))
      .catch(() => {});
  }, [token, showModal]);

  if (!user) return null;
  const links = LINKS[user.role] || [];

  function handleLogout() {
    logout();
    navigate("/ingresar");
  }

  return (
    <>
      {/* Botón flotante móvil (hamburger) */}
      <div className="mobile-bar">
        <button
          className="btn-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Abrir menú"
        >
          ☰
        </button>
        <span className="mobile-brand">Touring Driver</span>
        <button
          className="btn-notification-mobile"
          onClick={() => setShowModal(true)}
          aria-label="Notificaciones"
        >
          🔔 {unreadCount > 0 && <span className="notification-badge-mobile">{unreadCount}</span>}
        </button>
      </div>

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="sidebar-mark" aria-hidden="true" />
          <div>
            <p className="sidebar-title">Touring Driver</p>
            <p className="sidebar-subtitle">Escuela de conductores</p>
          </div>
        </div>

        {/* Botón de notificaciones */}
        <div className="sidebar-alerts">
          <button
            type="button"
            className="btn-notification-pill"
            onClick={() => setShowModal(true)}
          >
            <span>🔔 Avisos</span>
            {unreadCount > 0 ? (
              <span className="notification-badge">{unreadCount} nuevos</span>
            ) : (
              <span className="notification-badge is-zero">0</span>
            )}
          </button>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => "sidebar-link" + (isActive ? " is-active" : "")}
            >
              <span className="sidebar-link-icon">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <p className="sidebar-user-name">{user.name}</p>
            <p className="sidebar-user-role">{roleLabel(user.role)}</p>
          </div>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <NotificationModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          // refrescar contador
          if (token) {
            api.listNotifications(token).then((d) => setUnreadCount(d.unreadCount || 0)).catch(() => {});
          }
        }}
      />
    </>
  );
}

function roleLabel(role) {
  if (role === "admin") return "Administrador";
  if (role === "instructor") return "Instructor";
  return "Alumno";
}
