import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [studentFiles, setStudentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.listReservations(token),
      api.listUsers(token),
      api.listVehicles(token),
      api.listStudentFiles(token),
    ])
      .then(([r, u, v, f]) => {
        setReservations(r);
        setUsers(u);
        setVehicles(v);
        setStudentFiles(f);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const students = users.filter((u) => u.role === "student").length;
  const instructors = users.filter((u) => u.role === "instructor").length;
  const activeReservations = reservations.filter((r) => r.status === "confirmada").length;
  const availableVehicles = vehicles.filter((v) => v.status === "disponible").length;
  const readyForExamFiles = studentFiles.filter((f) => f.file_status === "aprobado_para_examen").length;

  return (
    <div className="stack-lg">
      <header className="page-header">
        <div>
          <h1>Panel de Administración General</h1>
          <p>Métricas operativas en tiempo real de la Escuela de Conductores Touring Driver.</p>
        </div>
      </header>

      {error && <div className="banner banner-error">{error}</div>}

      <section className="stat-row">
        <div className="stat-card">
          <span className="stat-number">{students}</span>
          <span className="stat-label">Alumnos matriculados</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{instructors}</span>
          <span className="stat-label">Instructores activos</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{activeReservations}</span>
          <span className="stat-label">Reservas activas</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{availableVehicles} / {vehicles.length}</span>
          <span className="stat-label">Vehículos disponibles</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{readyForExamFiles}</span>
          <span className="stat-label">Listos para examen MTC</span>
        </div>
      </section>

      {/* Accesos rápidos de gestión */}
      <section className="quick-access-grid">
        <Link to="/expedientes" className="quick-card">
          <span className="quick-icon">📋</span>
          <div>
            <h3>Expedientes de matrícula</h3>
            <p>Control de certificados psicosomáticos, categorías (A-I, A-IIa) y autorizaciones.</p>
          </div>
        </Link>
        <Link to="/vehiculos" className="quick-card">
          <span className="quick-icon">🚗</span>
          <div>
            <h3>Flota de vehículos</h3>
            <p>Estado de mantenimiento, transmisiones (manual/automática) y kilometraje.</p>
          </div>
        </Link>
        <Link to="/personal" className="quick-card">
          <span className="quick-icon">👥</span>
          <div>
            <h3>Personal e instructores</h3>
            <p>Cuentas de acceso, licencias profesionales y asignación de permisos.</p>
          </div>
        </Link>
      </section>

      {/* Tabla de reservas recientes */}
      <section className="panel">
        <div className="panel-header">
          <h2>Monitoreo de turnos y reservas en circuito</h2>
          <span className="text-muted">{reservations.length} total</span>
        </div>
        {loading ? (
          <p className="empty-state">Cargando operaciones…</p>
        ) : reservations.length === 0 ? (
          <p className="empty-state">Todavía no hay reservas registradas.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Alumno</th>
                  <th>Instructor</th>
                  <th>Vehículo</th>
                  <th>Circuito</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {reservations.slice(0, 15).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{formatDate(r.date)}</strong>
                      <div className="text-muted text-sm">{r.start_time} - {r.end_time}</div>
                    </td>
                    <td>{r.student_name}</td>
                    <td>{r.instructor_name}</td>
                    <td>{r.vehicle_plate ? `${r.vehicle_model} (${r.vehicle_plate})` : "Sin asignar"}</td>
                    <td>{r.circuit}</td>
                    <td>
                      <span className={`status-pill status-pill-${r.status}`}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

function statusLabel(status) {
  if (status === "confirmada") return "Confirmada";
  if (status === "completada") return "Completada";
  return "Cancelada";
}
