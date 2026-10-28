import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

const emptyForm = {
  student_id: "",
  hours_completed: "2.0",
  lessons_completed: "1",
  skill_level: "principiante",
  notes: "",
  skills_eval: {
    estacionamiento_paralelo: 3,
    estacionamiento_diagonal: 3,
    control_pedales: 3,
    curvas_y_direccionales: 3,
    arranque_pendiente: 3,
    respeto_senales: 3,
  },
};

const SKILL_LABELS = {
  estacionamiento_paralelo: "Paralelo",
  estacionamiento_diagonal: "Diagonal",
  control_pedales: "Pedales/Cambios",
  curvas_y_direccionales: "Curvas/Luces",
  arranque_pendiente: "Pendiente",
  respeto_senales: "Señales",
};

export default function StudentsProgress() {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [allProgress, setAllProgress] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filterStudent, setFilterStudent] = useState("");
  const [message, setMessage] = useState(null);

  async function loadAll() {
    try {
      const [studentsData, progressData] = await Promise.all([
        api.listUsers(token),
        api.listAllProgress(token),
      ]);
      setStudents(studentsData.filter((u) => u.role === "student"));
      setAllProgress(progressData);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.addProgress(token, {
        ...form,
        hours_completed: Number(form.hours_completed) || 0,
        lessons_completed: Number(form.lessons_completed) || 0,
      });
      setMessage({ type: "success", text: "Progreso y rúbrica registrados correctamente." });
      setForm(emptyForm);
      loadAll();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  const visibleProgress = filterStudent
    ? allProgress.filter((p) => String(p.student_id) === filterStudent)
    : allProgress;

  return (
    <div className="stack-lg">
      <header className="page-header">
        <div>
          <h1>Seguimiento y evaluación de alumnos</h1>
          <p>Registra el dictamen técnico de maniobras después de cada práctica en circuito.</p>
        </div>
      </header>

      {message && <div className={`banner banner-${message.type}`}>{message.text}</div>}

      <section className="panel">
        <div className="panel-header">
          <h2>Registrar evaluación y maniobras</h2>
        </div>
        <form className="stack-md" onSubmit={handleSubmit}>
          <div className="inline-form">
            <label>
              Alumno
              <select
                required
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              >
                <option value="">Selecciona un alumno</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.dni ? `(DNI: ${s.dni})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Horas de práctica
              <input
                type="number"
                min="0.5"
                step="0.5"
                required
                value={form.hours_completed}
                onChange={(e) => setForm({ ...form, hours_completed: e.target.value })}
              />
            </label>
            <label>
              Nivel de destreza
              <select
                value={form.skill_level}
                onChange={(e) => setForm({ ...form, skill_level: e.target.value })}
              >
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
                <option value="listo_para_examen">Listo para examen oficial</option>
              </select>
            </label>
          </div>

          <div className="skills-eval-grid">
            {Object.entries(SKILL_LABELS).map(([k, label]) => (
              <label key={k}>
                {label} (1 a 5)
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={form.skills_eval[k] || 3}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      skills_eval: { ...form.skills_eval, [k]: Number(e.target.value) },
                    })
                  }
                />
                <span>{form.skills_eval[k] || 3} / 5</span>
              </label>
            ))}
          </div>

          <label className="full-width">
            Observaciones pedagógicas
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Puntos fuertes, errores cometidos en circuito, recomendaciones"
            />
          </label>
          <div>
            <button className="btn btn-primary" type="submit">
              Guardar evaluación
            </button>
          </div>
        </form>
      </section>

      {/* Historial de evaluaciones */}
      <section className="panel">
        <div className="panel-header">
          <h2>Historial de evaluaciones registradas ({visibleProgress.length})</h2>
          <select
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
          >
            <option value="">Todos los alumnos</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {visibleProgress.length === 0 ? (
          <p className="empty-state">No hay registros de progreso que coincidan con la búsqueda.</p>
        ) : (
          <ul className="timeline-list">
            {visibleProgress.map((p) => (
              <li key={p.id} className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <p className="timeline-date">{new Date(p.updated_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  <p>
                    <strong>{p.student_name}</strong> {p.student_dni ? `(DNI: ${p.student_dni})` : ""} · {p.hours_completed}h prácticas · <span className="status-pill status-pill-confirmada">{p.skill_level}</span>
                  </p>
                  {p.instructor_name && <p className="timeline-meta">Instructor: {p.instructor_name}</p>}

                  {p.skills_eval && (
                    <div className="skills-mini-badges">
                      {Object.entries(p.skills_eval).map(([k, score]) => (
                        <span key={k} className="skill-mini-badge">
                          {SKILL_LABELS[k] || k}: {score}/5
                        </span>
                      ))}
                    </div>
                  )}

                  {p.notes && <p className="timeline-notes">“{p.notes}”</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
