import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

export default function StudentDashboard() {
  const { token, user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [filterInstructor, setFilterInstructor] = useState("");
  const [filterTransmission, setFilterTransmission] = useState("");
  const [filterCircuit, setFilterCircuit] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [slotsData, reservationsData, instructorsData] = await Promise.all([
        api.listAvailability(token, { only_available: "true" }),
        api.listReservations(token),
        api.listInstructors(token),
      ]);
      setSlots(slotsData);
      setReservations(reservationsData);
      setInstructors(instructorsData);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBook(slotId) {
    setMessage(null);
    try {
      await api.createReservation(token, { slot_id: slotId });
      setMessage({ type: "success", text: "¡Reserva confirmada! Revisa tus notificaciones y te esperamos en el circuito." });
      loadAll();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleConfirmCancel() {
    if (!cancellingId) return;
    setMessage(null);
    try {
      await api.cancelReservation(token, cancellingId, cancelReason || "Cancelado por el alumno");
      setMessage({ type: "success", text: "Reserva cancelada correctamente." });
      setCancellingId(null);
      setCancelReason("");
      loadAll();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  const visibleSlots = slots.filter((s) => {
    if (filterInstructor && String(s.instructor_id) !== filterInstructor) return false;
    if (filterTransmission && s.vehicle_transmission !== filterTransmission) return false;
    if (filterCircuit && s.circuit !== filterCircuit) return false;
    return true;
  });

  const activeReservations = reservations.filter((r) => r.status === "confirmada");
  const pastReservations = reservations.filter((r) => r.status !== "confirmada");

  return (
    <div className="stack-lg">
      <header className="page-header">
        <div>
          <h1>Mis reservas de práctica</h1>
          <p>Hola {user?.name}, agenda tus turnos de manejo según la disponibilidad de instructores y vehículos.</p>
        </div>
      </header>

      {message && <div className={`banner banner-${message.type}`}>{message.text}</div>}

      {/* Próxima sesión destacada si existe */}
      {activeReservations.length > 0 && (
        <div className="next-session-banner">
          <div className="next-session-icon" aria-hidden="true">🚗</div>
          <div className="next-session-details">
            <span className="next-session-tag">Tu próxima práctica</span>
            <h3>{formatDate(activeReservations[0].date)} · {activeReservations[0].start_time} - {activeReservations[0].end_time}</h3>
            <p>
              Instructor: <strong>{activeReservations[0].instructor_name}</strong> · Lugar: <strong>{activeReservations[0].circuit}</strong>
              {activeReservations[0].vehicle_model && ` · Auto: ${activeReservations[0].vehicle_model} (${activeReservations[0].vehicle_plate})`}
            </p>
          </div>
        </div>
      )}

      {/* Horarios disponibles para reservar */}
      <section className="panel">
        <div className="panel-header">
          <h2>Horarios disponibles en circuito</h2>
        </div>

        <div className="filters-bar">
          <label>
            Instructor
            <select value={filterInstructor} onChange={(e) => setFilterInstructor(e.target.value)}>
              <option value="">Todos los instructores</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </label>

          <label>
            Transmisión
            <select value={filterTransmission} onChange={(e) => setFilterTransmission(e.target.value)}>
              <option value="">Cualquier tipo</option>
              <option value="manual">Manual (Mecánica)</option>
              <option value="automatica">Automática</option>
            </select>
          </label>

          <label>
            Circuito
            <select value={filterCircuit} onChange={(e) => setFilterCircuit(e.target.value)}>
              <option value="">Todos los circuitos</option>
              <option value="Circuito Principal">Circuito Principal</option>
              <option value="Circuito de Estacionamiento">Circuito de Estacionamiento</option>
            </select>
          </label>
        </div>

        {loading ? (
          <p className="empty-state">Cargando horarios…</p>
        ) : visibleSlots.length === 0 ? (
          <p className="empty-state">No hay bloques disponibles con esos filtros. Intenta con otros criterios.</p>
        ) : (
          <ul className="slot-list">
            {visibleSlots.map((slot) => (
              <li key={slot.id} className="slot-row">
                <div className="slot-info">
                  <span className="slot-date">{formatDate(slot.date)}</span>
                  <span className="slot-time">{slot.start_time} – {slot.end_time}</span>
                  <span className="slot-meta">
                    👤 {slot.instructor_name} · 📍 {slot.circuit}
                  </span>
                  {slot.vehicle_plate && (
                    <span className="slot-vehicle-badge">
                      🚗 {slot.vehicle_model} ({slot.vehicle_transmission === "automatica" ? "Automático" : "Mecánico"}) · Placa {slot.vehicle_plate}
                    </span>
                  )}
                </div>
                <button className="btn btn-primary" onClick={() => handleBook(slot.id)}>
                  Reservar turno
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mis reservas activas */}
      <section className="panel">
        <div className="panel-header">
          <h2>Mis turnos programados ({activeReservations.length})</h2>
        </div>
        {activeReservations.length === 0 ? (
          <p className="empty-state">No tienes reservas activas por ahora. Agenda una arriba.</p>
        ) : (
          <ul className="slot-list">
            {activeReservations.map((r) => (
              <li key={r.id} className="slot-row status-confirmada">
                <div className="slot-info">
                  <span className="slot-date">{formatDate(r.date)}</span>
                  <span className="slot-time">{r.start_time} – {r.end_time}</span>
                  <span className="slot-meta">Instructor: {r.instructor_name} · {r.circuit}</span>
                  {r.vehicle_plate && (
                    <span className="slot-vehicle-badge">
                      {r.vehicle_model} ({r.vehicle_plate})
                    </span>
                  )}
                  <span className="status-pill status-pill-confirmada">Confirmada</span>
                </div>
                <button className="btn btn-danger" onClick={() => setCancellingId(r.id)}>
                  Cancelar turno
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Historial de sesiones */}
      {pastReservations.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <h2>Historial de prácticas anteriores</h2>
          </div>
          <ul className="slot-list">
            {pastReservations.slice(0, 10).map((r) => (
              <li key={r.id} className={`slot-row status-${r.status}`}>
                <div className="slot-info">
                  <span className="slot-date">{formatDate(r.date)}</span>
                  <span className="slot-time">{r.start_time} – {r.end_time}</span>
                  <span className="slot-meta">Instructor: {r.instructor_name} · {r.circuit}</span>
                  {r.cancellation_reason && (
                    <span className="text-muted">Motivo: {r.cancellation_reason}</span>
                  )}
                </div>
                <span className={`status-pill status-pill-${r.status}`}>
                  {r.status === "completada" ? "Completada" : "Cancelada"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Modal para motivo de cancelación */}
      {cancellingId && (
        <div className="modal-backdrop" onClick={() => setCancellingId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cancelar reserva de práctica</h2>
              <button className="btn btn-ghost" onClick={() => setCancellingId(null)}>✕</button>
            </div>
            <div className="modal-body stack-md">
              <p>¿Estás seguro de que deseas cancelar este turno? El bloque quedará disponible inmediatamente para otros alumnos.</p>
              <label>
                Motivo de cancelación (opcional)
                <input
                  type="text"
                  placeholder="Ej. Cruce de horario laboral, salud, etc."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setCancellingId(null)}>
                Volver
              </button>
              <button className="btn btn-danger" onClick={handleConfirmCancel}>
                Confirmar cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short" });
}
