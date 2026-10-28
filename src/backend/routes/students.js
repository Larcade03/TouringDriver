const express = require("express");
const db = require("../database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Alumno consulta su propio expediente de matrícula
router.get("/my-file", requireAuth, requireRole("student"), (req, res) => {
  const row = db.prepare(`
    SELECT f.*, u.name AS student_name, u.email AS student_email, u.phone AS student_phone, u.dni AS student_dni
    FROM student_files f
    JOIN users u ON u.id = f.student_id
    WHERE f.student_id = ?
  `).get(req.user.id);

  if (!row) {
    // Si no existía, crearlo dinámicamente
    const fileNumber = `EXP-${new Date().getFullYear()}-${String(req.user.id).padStart(4, "0")}`;
    db.prepare(`
      INSERT INTO student_files (student_id, file_number, license_category)
      VALUES (?, ?, 'A-I')
    `).run(req.user.id, fileNumber);

    const newRow = db.prepare(`
      SELECT f.*, u.name AS student_name, u.email AS student_email, u.phone AS student_phone, u.dni AS student_dni
      FROM student_files f
      JOIN users u ON u.id = f.student_id
      WHERE f.student_id = ?
    `).get(req.user.id);
    return res.json(newRow);
  }

  res.json(row);
});

// Admin o instructor listan todos los expedientes de matrícula
router.get("/files", requireAuth, requireRole("admin", "instructor"), (req, res) => {
  const { status, category, search } = req.query;

  let query = `
    SELECT f.*, u.name AS student_name, u.email AS student_email, u.phone AS student_phone, u.dni AS student_dni,
           (SELECT COUNT(*) FROM reservations r WHERE r.student_id = u.id AND r.status = 'completada') AS completed_lessons,
           (SELECT COALESCE(SUM(hours_completed), 0) FROM progress p WHERE p.student_id = u.id) AS total_hours
    FROM student_files f
    JOIN users u ON u.id = f.student_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += " AND f.file_status = ?";
    params.push(status);
  }
  if (category) {
    query += " AND f.license_category = ?";
    params.push(category);
  }
  if (search) {
    query += " AND (u.name LIKE ? OR u.dni LIKE ? OR f.file_number LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += " ORDER BY f.created_at DESC";

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// Consultar expediente individual
router.get("/:id/file", requireAuth, (req, res) => {
  const targetId = Number(req.params.id);
  if (req.user.role === "student" && req.user.id !== targetId) {
    return res.status(403).json({ error: "No tienes permisos para ver el expediente de otro alumno." });
  }

  const row = db.prepare(`
    SELECT f.*, u.name AS student_name, u.email AS student_email, u.phone AS student_phone, u.dni AS student_dni
    FROM student_files f
    JOIN users u ON u.id = f.student_id
    WHERE f.student_id = ?
  `).get(targetId);

  if (!row) return res.status(404).json({ error: "Expediente no encontrado." });
  res.json(row);
});

// Admin actualiza el estado de un expediente (examen médico, estado general, notas)
router.put("/:id/file", requireAuth, requireRole("admin"), (req, res) => {
  const targetId = Number(req.params.id);
  const {
    license_category,
    medical_exam_status,
    medical_exam_date,
    file_status,
    emergency_contact,
    emergency_phone,
    notes,
  } = req.body;

  const validStatuses = ["inscrito", "en_tramite", "observado", "aprobado_para_examen", "licencia_emitida"];
  if (file_status && !validStatuses.includes(file_status)) {
    return res.status(400).json({ error: "Estado de expediente inválido." });
  }

  const validMed = ["pendiente", "aprobado", "observado"];
  if (medical_exam_status && !validMed.includes(medical_exam_status)) {
    return res.status(400).json({ error: "Estado de examen médico inválido." });
  }

  const exists = db.prepare("SELECT id FROM student_files WHERE student_id = ?").get(targetId);
  if (!exists) {
    return res.status(404).json({ error: "Expediente no encontrado para este alumno." });
  }

  db.prepare(`
    UPDATE student_files
    SET license_category = COALESCE(?, license_category),
        medical_exam_status = COALESCE(?, medical_exam_status),
        medical_exam_date = COALESCE(?, medical_exam_date),
        file_status = COALESCE(?, file_status),
        emergency_contact = COALESCE(?, emergency_contact),
        emergency_phone = COALESCE(?, emergency_phone),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
    WHERE student_id = ?
  `).run(
    license_category || null,
    medical_exam_status || null,
    medical_exam_date || null,
    file_status || null,
    emergency_contact || null,
    emergency_phone || null,
    notes || null,
    targetId
  );

  // Notificar al alumno de la actualización de su expediente
  db.createNotification(
    targetId,
    "Expediente de matrícula actualizado",
    `El estado de tu expediente es ahora: ${file_status || "actualizado"}. Estado médico: ${medical_exam_status || "registrado"}.`,
    "info"
  );

  res.json({ ok: true, message: "Expediente actualizado correctamente." });
});

module.exports = router;
