import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

const LEVEL_LABEL = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  listo_para_examen: "Listo para examen oficial",
};

const SKILL_NAMES = {
  estacionamiento_paralelo: "Estacionamiento en paralelo",
  estacionamiento_diagonal: "Estacionamiento en diagonal (45°/90°)",
  control_pedales: "Control de pedales y embrague/cambios",
  curvas_y_direccionales: "Curvas cerradas y uso de luces direccionales",
  arranque_pendiente: "Arranque y detención en pendiente",
  respeto_senales: "Respeto de señales reglamentarias y líneas",
};

const REQUIRED_HOURS = 20; // 20 horas de práctica reglamentarias MTC

export default function MyProgress() {
  const { token, user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getProgress(token, user.id)
      .then(setRecords)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, user.id]);

  const latest = records[0];
  const totalHours = records.reduce((sum, r) => sum + Number(r.hours_completed || 0), 0);
  const totalLessons = records.reduce((sum, r) => sum + Number(r.lessons_completed || 0), 0);
  const progressPercent = Math.min(100, Math.round((totalHours / REQUIRED_HOURS) * 100));

  // Últimas habilidades evaluadas
  const latestSkills = latest?.skills_eval || null;

  return (
    <div className="stack-lg">
      <header className="page-header">
        <div>
          <h1>Mi progreso de aprendizaje</h1>
          <p>Monitoreo continuo de horas de manejo, habilidades prácticas y dictámenes de instructores.</p>
        </div>
      </header>

      {error && <div className="banner banner-error">{error}</div>}

      <section className="stat-row">
        <div className="stat-card">
          <span className="stat-number">{totalHours.toFixed(1)} / {REQUIRED_HOURS}h</span>
          <span className="stat-label">Horas prácticas ({progressPercent}%)</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{totalLessons}</span>
          <span className="stat-label">Sesiones completadas</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{latest ? LEVEL_LABEL[latest.skill_level] : "Principiante"}</span>
          <span className="stat-label">Nivel actual</span>
        </div>
      </section>

      {/* Barra de progreso de horas reglamentarias */}
      <section className="panel">
        <div className="panel-header">
          <h2>Meta reglamentaria para examen de manejo</h2>
          <span className="badge-category">{totalHours >= REQUIRED_HOURS ? "Meta cumplida" : `${(REQUIRED_HOURS - totalHours).toFixed(1)}h restantes`}</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="text-muted text-sm mt-2">
          El MTC recomienda un mínimo de {REQUIRED_HOURS} horas de práctica para dominar el circuito cerrado y aprobar en el primer intento.
        </p>
      </section>

      {/* Rúbrica de habilidades prácticas */}
      {latestSkills && (
        <section className="panel">
          <div className="panel-header">
            <h2>Evaluación por habilidades clave (Última sesión)</h2>
          </div>
          <div className="skills-grid">
            {Object.entries(SKILL_NAMES).map(([key, name]) => {
              const score = latestSkills[key] || 0;
              return (
                <div key={key} className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">{name}</span>
                    <span className="skill-score">{score > 0 ? `${score}/5` : "Por evaluar"}</span>
                  </div>
                  <div className="skill-meter">
                    <div
                      className="skill-meter-fill"
                      style={{ width: `${(score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Historial de evaluaciones */}
      <section className="panel">
        <div className="panel-header">
          <h2>Historial de evaluaciones de instructores</h2>
        </div>
        {loading ? (
          <p className="empty-state">Cargando progreso…</p>
        ) : records.length === 0 ? (
          <p className="empty-state">Tu instructor aún no ha registrado avances. Al completar tus primeras sesiones se reflejarán aquí.</p>
        ) : (
          <ul className="timeline-list">
            {records.map((r) => (
              <li key={r.id} className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <p className="timeline-date">{formatDate(r.updated_at)}</p>
                  <p>
                    <strong>{LEVEL_LABEL[r.skill_level] || r.skill_level}</strong> · {r.hours_completed}h prácticas registradas
                  </p>
                  {r.instructor_name && <p className="timeline-meta">Evaluado por: {r.instructor_name}</p>}
                  {r.notes && <p className="timeline-notes">“{r.notes}”</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatDate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}
