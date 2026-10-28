import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

const emptySlot = {
  date: "",
  start_time: "",
  end_time: "",
  circuit: "Circuito Principal",
  vehicle_id: "",
};

const emptyProgressForm = {
  student_id: "",
  hours_completed: "2.0",
  lessons_completed: "1",
  skill_level: "intermedio",
  notes: "",
  skills_eval: {
    estacionamiento_paralelo: 3,
    estacionamiento_diagonal: 4,
    control_pedales: 4,
    curvas_y_direccionales: 4,
    arranque_pendiente: 3,
    respeto_senales: 4,
  },
};

export default function InstructorDashboard() {
  const { token, user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptySlot);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal para registrar avance al completar sesión
  const [completingReservation, setCompletingReservation] = useState(null);
  const [progressForm, setProgressForm] = useState(emptyProgressForm);

  async function loadAll() {
    setLoading(true);
    try {
      const [slotsData, reservationsData, vehiclesData] = await Promise.all([
        api.listAvailability(token),
        api.listReservations(token),
        api.listVehicles(token),
      ]);
      setSlots(slotsData);
      setReservations(reservationsData);
      setVehicles(vehiclesData);
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

  async function handleCreateSlot(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.createAvailability(token, {
        ...form,
        vehicle_id: form.vehicle_id || null,
      });
      setMessage({ type: "success", text: "Bloque de horario publicado con éxito." });
      setForm(emptySlot);
      loadAll();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleDeleteSlot(id) {
    setMessage(null);
    try {
      await api.deleteAvailability(token, id);
      loadAll();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  function handleOpenComplete(reservation) {
    setCompletingReservation(reservation);
    setProgressForm({
      ...emptyProgressForm,
      student_id: reservation.student_id,
      notes: `Práctica en ${reservation.circuit}. Sesión completada satisfactoriamente.`,
    });
  }

  async function handleSaveCompletion(e) {
    e.preventDefault();
    if (!completingReservation) return;
    setMessage(null);
    try {
      // 1. Marcar reserva como completada
      await api.completeReservation(token, completingReservation.id);
      // 2. Registrar el progreso del alumno con la rúbrica
      await api.addProgress(token, {
        student_id: completingReservation.student_id,
        hours_completed: Number(progressForm.hours_completed) || 2.0,
        lessons_completed: Number(progressForm.lessons_completed) || 1,
        skill_level: progressForm.skill_level,
        skills_eval: progressForm.skills_eval,
        notes: progressForm.notes,
      });

      setMessage({
        type: "success",
        text: `Sesión de ${completingReservation.student_name} completada y progreso registrado exitosamente.`,
      });
      setCompletingReservation(null);
      loadAll();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  const upcomingSlots = slots.filter((s) => !s.is_booked);
  const activeReservations = reservations.filter((r) => r.status === "confirmada");
  const availableVehicles = vehicles.filter((v) => v.status === "disponible");

  return (
    <div className="stack-lg">
      <header className="page-header">
        <div>
          <h1>Panel del Instructor</h1>
          <p>Bienvenido {user?.name}. Administra tus bloques de disponibilidad, unidades de práctica y sesiones de alumnos.</p>
        </div>
      </header>

      {message && <div className={`banner banner-${message.type}`}>{message.text}</div>}

      {/* Formulario para publicar nuevo bloque */}
      <section className="panel">
        <div className="panel-header">
          <h2>Publicar nuevo bloque de disponibilidad</h2>
        </div>
        <form className="inline-form" onSubmit={handleCreateSlot}>
          <label>
            Fecha
            <input
              type="date"
              required
              min={new Date().toISOString().slice(0, 10)}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label>
            Hora Inicio
            <input
              type="time"
              required
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </label>
          <label>
            Hora Fin
            <input
              type="time"
              required
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </label>
          <label>
            Circuito
            <select
              value={form.circuit}
              onChange={(e) => setForm({ ...form, circuit: e.target.value })}
            >
              <option value="Circuito Principal">Circuito Principal</option>
              <option value="Circuito de Estacionamiento">Circuito de Estacionamiento</option>
              <option value="Circuito de Trocha y Curvas">Circuito de Trocha y Curvas</option>
            </select>
          </label>
          <label>
            Vehículo de práctica
            <select
              value={form.vehicle_id}
              onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
            >
              <option value="">Sin asignar / Asignar luego</option>
              {availableVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} · {v.model} ({v.transmission === "automatica" ? "Aut." : "Mec."})
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" type="submit">
            Publicar horario
          </button>
        </form>
      </section>

      {/* Sesiones reservadas por alumnos */}
      <section className="panel">
        <div className="panel-header">
          <h2>Sesiones reservadas por alumnos ({activeReservations.length})</h2>
        </div>
        {activeReservations.length === 0 ? (
          <p className="empty-state">No tienes sesiones reservadas pendientes por ahora.</p>
        ) : (
          <ul className="slot-list">
            {activeReservations.map((r) => (
              <li key={r.id} className="slot-row status-confirmada">
                <div className="slot-info">
                  <span className="slot-date">{formatDate(r.date)}</span>
                  <span className="slot-time">{r.start_time} – {r.end_time}</span>
                  <span className="slot-meta">
                    👤 Alumno: <strong>{r.student_name}</strong> {r.student_phone ? `(Tel: ${r.student_phone})` : ""}
                  </span>
                  <span className="slot-meta">📍 {r.circuit}</span>
                  {r.vehicle_plate && (
                    <span className="slot-vehicle-badge">
                      🚗 {r.vehicle_model} ({r.vehicle_plate})
                    </span>
                  )}
                  {r.notes && <span className="text-muted text-sm">Nota: {r.notes}</span>}
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenComplete(r)}>
                  Completar y calificar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Bloques disponibles sin reservar */}
      <section className="panel">
        <div className="panel-header">
          <h2>Mis bloques libres publicados ({upcomingSlots.length})</h2>
        </div>
        {loading ? (
          <p className="empty-state">Cargando…</p>
        ) : upcomingSlots.length === 0 ? (
          <p className="empty-state">No tienes bloques libres publicados. Crea uno arriba para que los alumnos puedan reservar.</p>
        ) : (
          <ul className="slot-list">
            {upcomingSlots.map((slot) => (
              <li key={slot.id} className="slot-row">
                <div className="slot-info">
                  <span className="slot-date">{formatDate(slot.date)}</span>
                  <span className="slot-time">{slot.start_time} – {slot.end_time}</span>
                  <span className="slot-meta">{slot.circuit}</span>
                  {slot.vehicle_plate && (
                    <span className="slot-vehicle-badge">
                      🚗 {slot.vehicle_model} ({slot.vehicle_plate})
                    </span>
                  )}
                </div>
                <button className="btn btn-ghost" onClick={() => handleDeleteSlot(slot.id)}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modal para completar sesión y calificar al alumno */}
      {completingReservation && (
        <div className="modal-backdrop" onClick={() => setCompletingReservation(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Calificar sesión de práctica</h2>
                <p>Alumno: <strong>{completingReservation.student_name}</strong> · Fecha: {formatDate(completingReservation.date)}</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setCompletingReservation(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveCompletion}>
              <div className="modal-body stack-md">
                <div className="inline-fields">
                  <label>
                    Horas prácticas de la sesión
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      value={progressForm.hours_completed}
                      onChange={(e) => setProgressForm({ ...progressForm, hours_completed: e.target.value })}
                    />
                  </label>
                  <label>
                    Nivel global estimado
                    <select
                      value={progressForm.skill_level}
                      onChange={(e) => setProgressForm({ ...progressForm, skill_level: e.target.value })}
                    >
                      <option value="principiante">Principiante</option>
                      <option value="intermedio">Intermedio</option>
                      <option value="avanzado">Avanzado</option>
                      <option value="listo_para_examen">Listo para examen oficial</option>
                    </select>
                  </label>
                </div>

                <h3>Rúbrica de maniobras y habilidades (1 a 5 puntos):</h3>
                <div className="skills-eval-grid">
                  <label>
                    Estacionamiento paralelo
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={progressForm.skills_eval.estacionamiento_paralelo}
                      onChange={(e) => setProgressForm({
                        ...progressForm,
                        skills_eval: { ...progressForm.skills_eval, estacionamiento_paralelo: Number(e.target.value) }
                      })}
                    />
                    <span>{progressForm.skills_eval.estacionamiento_paralelo} / 5</span>
                  </label>

                  <label>
                    Estacionamiento en diagonal (45° / 90°)
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={progressForm.skills_eval.estacionamiento_diagonal}
                      onChange={(e) => setProgressForm({
                        ...progressForm,
                        skills_eval: { ...progressForm.skills_eval, estacionamiento_diagonal: Number(e.target.value) }
                      })}
                    />
                    <span>{progressForm.skills_eval.estacionamiento_diagonal} / 5</span>
                  </label>

                  <label>
                    Control de pedales y cambios
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={progressForm.skills_eval.control_pedales}
                      onChange={(e) => setProgressForm({
                        ...progressForm,
                        skills_eval: { ...progressForm.skills_eval, control_pedales: Number(e.target.value) }
                      })}
                    />
                    <span>{progressForm.skills_eval.control_pedales} / 5</span>
                  </label>

                  <label>
                    Curvas cerradas y luces direccionales
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={progressForm.skills_eval.curvas_y_direccionales}
                      onChange={(e) => setProgressForm({
                        ...progressForm,
                        skills_eval: { ...progressForm.skills_eval, curvas_y_direccionales: Number(e.target.value) }
                      })}
                    />
                    <span>{progressForm.skills_eval.curvas_y_direccionales} / 5</span>
                  </label>

                  <label>
                    Arranque en pendiente
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={progressForm.skills_eval.arranque_pendiente}
                      onChange={(e) => setProgressForm({
                        ...progressForm,
                        skills_eval: { ...progressForm.skills_eval, arranque_pendiente: Number(e.target.value) }
                      })}
                    />
                    <span>{progressForm.skills_eval.arranque_pendiente} / 5</span>
                  </label>

                  <label>
                    Respeto a señales reglamentarias
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={progressForm.skills_eval.respeto_senales}
                      onChange={(e) => setProgressForm({
                        ...progressForm,
                        skills_eval: { ...progressForm.skills_eval, respeto_senales: Number(e.target.value) }
                      })}
                    />
                    <span>{progressForm.skills_eval.respeto_senales} / 5</span>
                  </label>
                </div>

                <label>
                  Observaciones y recomendaciones para el alumno
                  <textarea
                    rows={3}
                    value={progressForm.notes}
                    onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })}
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setCompletingReservation(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Finalizar sesión y registrar avance
                </button>
              </div>
            </form>
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
