const express = require("express");
const db = require("../database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

function parseProgressRows(rows) {
  return rows.map((r) => {
    let skills_eval = null;
    try {
      skills_eval = r.skills_eval ? JSON.parse(r.skills_eval) : null;
    } catch {
      skills_eval = null;
    }
    return { ...r, skills_eval };
  });
}

router.get("/:studentId", requireAuth, (req, res) => {
  const { studentId } = req.params;
  if (req.user.role === "student" && Number(studentId) !== req.user.id) {
    return res.status(403).json({ error: "No puedes ver el progreso de otro alumno." });
  }
  const rows = db
    .prepare(
      `SELECT p.*, ins.name AS instructor_name
       FROM progress p LEFT JOIN users ins ON ins.id = p.instructor_id
       WHERE p.student_id = ? ORDER BY p.updated_at DESC`
    )
    .all(studentId);

  res.json(parseProgressRows(rows));
});

router.get("/", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, s.name AS student_name, s.dni AS student_dni, ins.name AS instructor_name
       FROM progress p
       JOIN users s ON s.id = p.student_id
       LEFT JOIN users ins ON ins.id = p.instructor_id
       ORDER BY p.updated_at DESC`
    )
    .all();

  res.json(parseProgressRows(rows));
});

// Registrar avance de un alumno (LambdaProgreso)
router.post("/", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const { student_id, hours_completed, lessons_completed, skill_level, skills_eval, notes } = req.body;
  if (!student_id) return res.status(400).json({ error: "Debes indicar el alumno." });

  const student = db.prepare("SELECT id, name FROM users WHERE id = ? AND role = 'student'").get(student_id);
  if (!student) return res.status(404).json({ error: "El alumno seleccionado no existe." });

  const validLevels = ["principiante", "intermedio", "avanzado", "listo_para_examen"];
  if (skill_level && !validLevels.includes(skill_level)) {
    return res.status(400).json({ error: "Nivel de habilidad inválido." });
  }

  const skillsJson = skills_eval && typeof skills_eval === "object" ? JSON.stringify(skills_eval) : null;

  const info = db
    .prepare(
      `INSERT INTO progress (student_id, instructor_id, hours_completed, lessons_completed, skill_level, skills_eval, notes)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(
      student_id,
      req.user.id,
      hours_completed || 0,
      lessons_completed || 0,
      skill_level || "principiante",
      skillsJson,
      notes || null
    );

  // Notificar al alumno sobre su nueva evaluación (LambdaNotificaciones)
  db.createNotification(
    student_id,
    "Nueva evaluación de progreso",
    `El instructor ${req.user.name} ha registrado tu avance: ${hours_completed || 0}h prácticas (Nivel: ${skill_level || "principiante"}).`,
    "progreso"
  );

  res.status(201).json({ id: info.lastInsertRowid, message: "Progreso registrado correctamente." });
});

module.exports = router;
