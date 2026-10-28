import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

const STATUS_LABELS = {
  inscrito: { label: "Inscrito", class: "status-pill-info" },
  en_tramite: { label: "En trámite", class: "status-pill-confirmada" },
  observado: { label: "Observado", class: "status-pill-cancelada" },
  aprobado_para_examen: { label: "Listo para examen", class: "status-pill-completada" },
  licencia_emitida: { label: "Licencia emitida", class: "status-pill-completada" },
};

const MEDICAL_LABELS = {
  pendiente: { label: "Pendiente", class: "status-pill-cancelada" },
  aprobado: { label: "Aprobado", class: "status-pill-completada" },
  observado: { label: "Observado", class: "status-pill-info" },
};

export default function StudentFilePage() {
  const { user, token } = useAuth();
  const isStudent = user?.role === "student";

  // Estado para vista de Alumno
  const [myFile, setMyFile] = useState(null);

  // Estado para vista de Admin / Instructor
  const [files, setFiles] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      if (isStudent) {
        const data = await api.getMyFile(token);
        setMyFile(data);
      } else {
        const data = await api.listStudentFiles(token, {
          status: filterStatus,
          category: filterCategory,
          search: searchTerm,
        });
        setFiles(data);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent, filterStatus, filterCategory]);

  function handleSearch(e) {
    e.preventDefault();
    loadData();
  }

  function handleOpenEdit(file) {
    setSelectedFile(file);
    setEditForm({
      license_category: file.license_category,
      medical_exam_status: file.medical_exam_status,
      medical_exam_date: file.medical_exam_date || "",
      file_status: file.file_status,
      emergency_contact: file.emergency_contact || "",
      emergency_phone: file.emergency_phone || "",
      notes: file.notes || "",
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!selectedFile) return;
    setMessage(null);
    try {
      await api.updateStudentFile(token, selectedFile.student_id, editForm);
      setMessage({ type: "success", text: "Expediente actualizado correctamente." });
      setSelectedFile(null);
      loadData();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  return (
    <div className="stack-lg">
      <header className="page-header">
        <div>
          <h1>{isStudent ? "Mi expediente de matrícula" : "Expedientes de matrícula"}</h1>
          <p>
            {isStudent
              ? "Revisa el estado de tus documentos, certificado psicosomático y autorización para el examen oficial."
              : "Control oficial de expedientes, certificados médicos psicosomáticos y postulaciones a licencia."}
          </p>
        </div>
      </header>

      {message && <div className={`banner banner-${message.type}`}>{message.text}</div>}

      {/* VISTA PARA ALUMNO */}
      {isStudent && (
        <>
          {loading ? (
            <p className="empty-state">Cargando expediente…</p>
          ) : !myFile ? (
            <p className="empty-state">No se encontró tu expediente. Contacta a administración.</p>
          ) : (
            <>
              <div className="stat-row">
                <div className="stat-card">
                  <span className="stat-number">{myFile.file_number}</span>
                  <span className="stat-label">N° de Expediente</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{myFile.license_category}</span>
                  <span className="stat-label">Categoría postulada</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">
                    {STATUS_LABELS[myFile.file_status]?.label || myFile.file_status}
                  </span>
                  <span className="stat-label">Estado de expediente</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">
                    {MEDICAL_LABELS[myFile.medical_exam_status]?.label || myFile.medical_exam_status}
                  </span>
                  <span className="stat-label">Examen médico psicosomático</span>
                </div>
              </div>

              <section className="panel">
                <div className="panel-header">
                  <h2>Ficha de registro del estudiante</h2>
                </div>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Alumno:</span>
                    <span className="detail-value">{myFile.student_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">DNI:</span>
                    <span className="detail-value">{myFile.student_dni || "No registrado"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Correo:</span>
                    <span className="detail-value">{myFile.student_email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Teléfono:</span>
                    <span className="detail-value">{myFile.student_phone || "No registrado"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Fecha de examen médico:</span>
                    <span className="detail-value">{myFile.medical_exam_date || "Pendiente de presentación"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Contacto de emergencia:</span>
                    <span className="detail-value">{myFile.emergency_contact || "No especificado"} {myFile.emergency_phone ? `(${myFile.emergency_phone})` : ""}</span>
                  </div>
                  {myFile.notes && (
                    <div className="detail-item full-width">
                      <span className="detail-label">Observaciones de la escuela:</span>
                      <span className="detail-value">{myFile.notes}</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <h2>Requisitos obligatorios para tramitar la licencia (MTC)</h2>
                </div>
                <ul className="checklist">
                  <li className={`check-item ${myFile.student_dni ? "is-done" : "is-pending"}`}>
                    <span className="check-icon">{myFile.student_dni ? "✓" : "○"}</span>
                    <span>Documento de Identidad (DNI) vigente registrado</span>
                  </li>
                  <li className={`check-item ${myFile.medical_exam_status === "aprobado" ? "is-done" : "is-pending"}`}>
                    <span className="check-icon">{myFile.medical_exam_status === "aprobado" ? "✓" : "○"}</span>
                    <span>Examen médico psicosomático aprobado en centro autorizado por el MTC</span>
                  </li>
                  <li className={`check-item ${myFile.file_status === "aprobado_para_examen" || myFile.file_status === "licencia_emitida" ? "is-done" : "is-pending"}`}>
                    <span className="check-icon">{myFile.file_status === "aprobado_para_examen" || myFile.file_status === "licencia_emitida" ? "✓" : "○"}</span>
                    <span>Aprobación de horas prácticas de circuito en Touring Driver</span>
                  </li>
                </ul>
              </section>
            </>
          )}
        </>
      )}

      {/* VISTA PARA ADMINISTRADOR / INSTRUCTOR */}
      {!isStudent && (
        <>
          <section className="panel">
            <div className="panel-header">
              <h2>Filtrar expedientes</h2>
            </div>
            <form className="inline-form" onSubmit={handleSearch}>
              <label>
                Buscar
                <input
                  type="text"
                  placeholder="Nombre, DNI o N° Expediente"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </label>
              <label>
                Estado de expediente
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Todos los estados</option>
                  <option value="inscrito">Inscrito</option>
                  <option value="en_tramite">En trámite</option>
                  <option value="observado">Observado</option>
                  <option value="aprobado_para_examen">Listo para examen</option>
                  <option value="licencia_emitida">Licencia emitida</option>
                </select>
              </label>
              <label>
                Categoría
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="">Todas</option>
                  <option value="A-I">A-I (Particular)</option>
                  <option value="A-IIa">A-IIa (Taxi / Colectivo)</option>
                  <option value="A-IIb">A-IIb (Custer / Camión)</option>
                </select>
              </label>
              <button className="btn btn-primary" type="submit">Buscar</button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Lista de alumnos matriculados ({files.length})</h2>
            </div>

            {loading ? (
              <p className="empty-state">Cargando expedientes…</p>
            ) : files.length === 0 ? (
              <p className="empty-state">No se encontraron expedientes con los criterios seleccionados.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Expediente</th>
                      <th>Alumno / DNI</th>
                      <th>Categoría</th>
                      <th>Examen Médico</th>
                      <th>Prácticas</th>
                      <th>Estado</th>
                      {user.role === "admin" && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id}>
                        <td><strong>{f.file_number}</strong></td>
                        <td>
                          <div>{f.student_name}</div>
                          <span className="text-muted">{f.student_dni || "Sin DNI"}</span>
                        </td>
                        <td><span className="badge-category">{f.license_category}</span></td>
                        <td>
                          <span className={`status-pill ${MEDICAL_LABELS[f.medical_exam_status]?.class}`}>
                            {MEDICAL_LABELS[f.medical_exam_status]?.label}
                          </span>
                        </td>
                        <td>
                          <span>{f.total_hours || 0}h / {f.completed_lessons || 0} ses.</span>
                        </td>
                        <td>
                          <span className={`status-pill ${STATUS_LABELS[f.file_status]?.class}`}>
                            {STATUS_LABELS[f.file_status]?.label || f.file_status}
                          </span>
                        </td>
                        {user.role === "admin" && (
                          <td>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleOpenEdit(f)}
                            >
                              Gestionar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Modal para editar expediente */}
          {selectedFile && editForm && (
            <div className="modal-backdrop" onClick={() => setSelectedFile(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2>Expediente: {selectedFile.file_number}</h2>
                    <p>Alumno: {selectedFile.student_name} (DNI: {selectedFile.student_dni || "N/A"})</p>
                  </div>
                  <button className="btn btn-ghost" onClick={() => setSelectedFile(null)}>✕</button>
                </div>
                <form onSubmit={handleSaveEdit}>
                  <div className="modal-body stack-md">
                    <label>
                      Categoría de licencia solicitada
                      <select
                        value={editForm.license_category}
                        onChange={(e) => setEditForm({ ...editForm, license_category: e.target.value })}
                      >
                        <option value="A-I">A-I (Particular)</option>
                        <option value="A-IIa">A-IIa (Profesional / Taxi)</option>
                        <option value="A-IIb">A-IIb (Custer / MiniBus)</option>
                        <option value="A-IIIa">A-IIIa (Ómnibus)</option>
                      </select>
                    </label>

                    <label>
                      Estado del examen médico psicosomático
                      <select
                        value={editForm.medical_exam_status}
                        onChange={(e) => setEditForm({ ...editForm, medical_exam_status: e.target.value })}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="aprobado">Aprobado</option>
                        <option value="observado">Observado</option>
                      </select>
                    </label>

                    <label>
                      Fecha de aprobación del examen médico
                      <input
                        type="date"
                        value={editForm.medical_exam_date}
                        onChange={(e) => setEditForm({ ...editForm, medical_exam_date: e.target.value })}
                      />
                    </label>

                    <label>
                      Estado global del expediente
                      <select
                        value={editForm.file_status}
                        onChange={(e) => setEditForm({ ...editForm, file_status: e.target.value })}
                      >
                        <option value="inscrito">Inscrito</option>
                        <option value="en_tramite">En trámite</option>
                        <option value="observado">Observado</option>
                        <option value="aprobado_para_examen">Listo para examen</option>
                        <option value="licencia_emitida">Licencia emitida</option>
                      </select>
                    </label>

                    <label>
                      Contacto de emergencia (Nombre)
                      <input
                        value={editForm.emergency_contact}
                        onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })}
                        placeholder="Ej. Familiar directo"
                      />
                    </label>

                    <label>
                      Teléfono de emergencia
                      <input
                        value={editForm.emergency_phone}
                        onChange={(e) => setEditForm({ ...editForm, emergency_phone: e.target.value })}
                        placeholder="999 999 999"
                      />
                    </label>

                    <label>
                      Notas / Observaciones de secretaría
                      <textarea
                        rows={3}
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder="Observaciones de documentos o trámite"
                      />
                    </label>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={() => setSelectedFile(null)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Guardar cambios
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
