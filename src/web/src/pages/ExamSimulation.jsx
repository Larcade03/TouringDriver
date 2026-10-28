import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

const EXAM_DURATION_SECONDS = 20 * 60; // 20 minutos oficiales

export default function ExamSimulation() {
  const { token, user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [viewDetailsId, setViewDetailsId] = useState(null);

  useEffect(() => {
    api.getExamQuestions(token).then((data) => {
      setQuestions(data);
      if (data.length > 0) setTimerRunning(true);
    }).catch((err) => setError(err.message));

    api.getExamHistory(token, user.id).then(setHistory).catch(() => {});
  }, [token, user.id]);

  // Temporizador de cuenta regresiva
  useEffect(() => {
    if (!timerRunning || result) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning, result, answers]);

  function selectAnswer(questionId, optionIndex) {
    setAnswers({ ...answers, [questionId]: optionIndex });
  }

  async function handleAutoSubmit() {
    if (submitting || result) return;
    handleSubmit();
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError("");
    setSubmitting(true);
    setTimerRunning(false);

    const timeSpent = EXAM_DURATION_SECONDS - timeLeft;

    try {
      const data = await api.submitExam(token, {
        exam_type: "teorico",
        answers,
        time_taken_seconds: timeSpent,
      });
      setResult(data);
      const historyData = await api.getExamHistory(token, user.id);
      setHistory(historyData);
    } catch (err) {
      setError(err.message);
      setTimerRunning(true);
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetry() {
    setResult(null);
    setAnswers({});
    setTimeLeft(EXAM_DURATION_SECONDS);
    setTimerRunning(true);
  }

  const answeredCount = Object.keys(answers).length;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="stack-lg">
      <header className="page-header">
        <div>
          <h1>Simulacro de examen de reglas de tránsito</h1>
          <p>
            Banco oficial de preguntas según el Reglamento Nacional de Tránsito (MTC).
            Para aprobar requieres un mínimo de 70% (14 sobre 20 puntos proporcionales).
          </p>
        </div>
      </header>

      {error && <div className="banner banner-error">{error}</div>}

      {/* RESULTADO Y REVISIÓN DETALLADA */}
      {result ? (
        <section className={`panel result-panel ${result.passed ? "result-pass" : "result-fail"}`}>
          <div className="result-header">
            <h2>{result.passed ? "🎉 ¡Felicitaciones! Has aprobado el simulacro" : "⚠️ Puntaje insuficiente para aprobar"}</h2>
            <p className="result-score">{result.score}/100</p>
            <p className="result-summary">
              Respondiste correctamente <strong>{result.correct}</strong> de <strong>{result.total}</strong> preguntas.
              {result.passed
                ? " Tu nivel de conocimiento de las normas de tránsito está listo para el examen oficial."
                : " Revisa detalladamente la retroalimentación abajo para reforzar los artículos de tránsito en los que fallaste."}
            </p>
            <button className="btn btn-primary" onClick={handleRetry}>
              Rendir otro simulacro
            </button>
          </div>

          {/* Desglose de categorías */}
          {result.categoryStats && (
            <div className="category-stats-grid">
              {Object.entries(result.categoryStats).map(([cat, stat]) => (
                <div key={cat} className="category-stat-card">
                  <span className="category-stat-name">{cat}</span>
                  <span className="category-stat-score">{stat.correct} / {stat.total}</span>
                  <div className="category-stat-bar">
                    <div
                      className="category-stat-fill"
                      style={{ width: `${(stat.correct / stat.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Revisión pregunta por pregunta con justificación legal */}
          <div className="exam-review-section">
            <h3>Revisión y justificación vial de respuestas</h3>
            <ul className="review-list">
              {result.review?.map((item, idx) => (
                <li key={item.id} className={`review-card ${item.isCorrect ? "is-correct" : "is-wrong"}`}>
                  <div className="review-card-header">
                    <span className="review-status-icon">{item.isCorrect ? "✓ Correcta" : "✗ Incorrecta"}</span>
                    <span className="review-category-badge">{item.category}</span>
                  </div>
                  <p className="review-question"><strong>{idx + 1}. {item.question}</strong></p>
                  
                  <div className="review-options">
                    {item.options.map((opt, optIdx) => {
                      const isSelected = item.selectedOption === optIdx;
                      const isTheRightOne = item.correctOption === optIdx;
                      let optClass = "review-opt";
                      if (isTheRightOne) optClass += " correct-opt";
                      if (isSelected && !isTheRightOne) optClass += " wrong-opt";

                      return (
                        <div key={optIdx} className={optClass}>
                          <span>{isSelected ? "👉 " : ""}{opt}</span>
                          {isTheRightOne && <span className="opt-tag">Respuesta correcta</span>}
                          {isSelected && !isTheRightOne && <span className="opt-tag tag-wrong">Tu respuesta</span>}
                        </div>
                      );
                    })}
                  </div>

                  {item.explanation && (
                    <div className="review-explanation">
                      <strong>Base reglamentaria:</strong> {item.explanation}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        /* FORMULARIO DE EXAMEN CON TEMPORIZADOR */
        <form className="panel" onSubmit={handleSubmit}>
          <div className="exam-top-bar">
            <div className={`exam-timer ${timeLeft < 180 ? "timer-warning" : ""}`}>
              ⏱️ Tiempo restante: <strong>{timeFormatted}</strong>
            </div>
            <div className="exam-progress-tracker">
              Respondidas: <strong>{answeredCount} / {questions.length}</strong>
            </div>
          </div>

          <ul className="question-list">
            {questions.map((q, idx) => (
              <li key={q.id} className="question-item">
                <div className="question-header">
                  <span className="question-num">Pregunta {idx + 1}</span>
                  <span className="question-category">{q.category}</span>
                </div>
                <p className="question-text">{q.question}</p>
                <div className="option-group">
                  {q.options.map((opt, optIdx) => (
                    <label
                      key={optIdx}
                      className={`option-choice ${answers[q.id] === optIdx ? "is-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === optIdx}
                        onChange={() => selectAnswer(q.id, optIdx)}
                        required
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          <div className="exam-submit-bar">
            <button
              className="btn btn-primary btn-lg"
              type="submit"
              disabled={submitting || questions.length === 0}
            >
              {submitting ? "Calificando simulacro…" : `Finalizar y calificar (${answeredCount}/${questions.length} respondidas)`}
            </button>
          </div>
        </form>
      )}

      {/* HISTORIAL DE SIMULACROS ANTERIORES */}
      <section className="panel">
        <div className="panel-header">
          <h2>Historial de intentos anteriores</h2>
        </div>
        {history.length === 0 ? (
          <p className="empty-state">Aún no rindes ningún simulacro.</p>
        ) : (
          <ul className="slot-list">
            {history.map((h) => (
              <li key={h.id} className="slot-row">
                <div className="slot-info">
                  <span className="slot-date">{new Date(h.taken_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="slot-meta">
                    {h.exam_type === "teorico" ? "Examen de reglas (Teórico)" : "Examen de circuito (Práctico)"}
                  </span>
                  {h.details?.time_taken_seconds && (
                    <span className="text-muted text-sm">
                      Tiempo: {Math.round(h.details.time_taken_seconds / 60)} min
                    </span>
                  )}
                </div>
                <span className={`status-pill ${h.passed ? "status-pill-completada" : "status-pill-cancelada"}`}>
                  {h.score}/100 · {h.passed ? "Aprobado" : "Desaprobado"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
