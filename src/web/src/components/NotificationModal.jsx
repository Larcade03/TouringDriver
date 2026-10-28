import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

export default function NotificationModal({ isOpen, onClose }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  async function loadNotifications() {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.listNotifications(token);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function handleMarkRead(id) {
    try {
      await api.markNotificationRead(token, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.markAllNotificationsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Notificaciones del sistema</h2>
            <p>Confirmaciones de turnos, recordatorios y alertas de progreso.</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="modal-actions-bar">
          <span className="text-muted">
            {unreadCount > 0 ? `${unreadCount} no leída(s)` : "Todas leídas"}
          </span>
          {unreadCount > 0 && (
            <button className="btn btn-link" onClick={handleMarkAllRead}>
              Marcar todas como leídas
            </button>
          )}
        </div>

        <div className="modal-body">
          {loading ? (
            <p className="empty-state">Cargando avisos…</p>
          ) : notifications.length === 0 ? (
            <p className="empty-state">No tienes notificaciones pendientes.</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`notification-item ${n.is_read ? "is-read" : "is-unread"} type-${n.type}`}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                >
                  <div className="notification-icon" aria-hidden="true">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="notification-text">
                    <div className="notification-title-row">
                      <strong className="notification-title">{n.title}</strong>
                      <span className="notification-date">{formatDate(n.created_at)}</span>
                    </div>
                    <p className="notification-message">{n.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

function getNotificationIcon(type) {
  switch (type) {
    case "reserva":
      return "📅";
    case "cancelacion":
      return "⚠️";
    case "progreso":
      return "📈";
    case "examen":
      return "📝";
    default:
      return "ℹ️";
  }
}

function formatDate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
