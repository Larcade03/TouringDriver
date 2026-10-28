const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Listar usuarios (admin ve todos con estadísticas y expedientes; instructor ve alumnos)
router.get("/", requireAuth, (req, res) => {
  let rows;
  if (req.user.role === "admin") {
    rows = db
      .prepare(`
        SELECT u.id, u.name, u.email, u.role, u.phone, u.license_number, u.dni, u.created_at,
               f.file_number, f.file_status, f.license_category, f.medical_exam_status
        FROM users u
        LEFT JOIN student_files f ON f.student_id = u.id
        ORDER BY u.created_at DESC
      `)
      .all();
  } else if (req.user.role === "instructor") {
    rows = db
      .prepare(`
        SELECT u.id, u.name, u.email, u.phone, u.dni,
               f.file_number, f.file_status, f.license_category
        FROM users u
        LEFT JOIN student_files f ON f.student_id = u.id
        WHERE u.role = 'student'
        ORDER BY u.name
      `)
      .all();
  } else {
    return res.status(403).json({ error: "No tienes permisos para ver esta lista." });
  }
  res.json(rows);
});

// Crear instructor o admin (solo admin)
router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { name, email, password, role, phone, license_number, dni, license_category } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Nombre, correo, contraseña y rol son obligatorios." });
  }
  if (!["admin", "instructor", "student"].includes(role)) {
    return res.status(400).json({ error: "Rol inválido." });
  }
  const cleanEmail = email.trim().toLowerCase();
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
  if (exists) return res.status(409).json({ error: "Ya existe una cuenta con ese correo electrónico." });

  if (dni) {
    const dniExists = db.prepare("SELECT id FROM users WHERE dni = ?").get(dni);
    if (dniExists) return res.status(409).json({ error: "Ya existe un usuario con ese DNI." });
  }

  const hash = bcrypt.hashSync(password, 10);

  try {
    db.exec("BEGIN");
    const info = db
      .prepare(
        "INSERT INTO users (name, email, password_hash, role, phone, license_number, dni) VALUES (?,?,?,?,?,?,?)"
      )
      .run(name.trim(), cleanEmail, hash, role, phone || null, license_number || null, dni || null);

    const userId = info.lastInsertRowid;

    // Si se crea un alumno desde el panel administrativo, crearle su expediente
    if (role === "student") {
      const fileNumber = `EXP-${new Date().getFullYear()}-${String(userId).padStart(4, "0")}`;
      db.prepare(`
        INSERT INTO student_files (student_id, file_number, license_category, medical_exam_status, file_status)
        VALUES (?, ?, ?, 'pendiente', 'inscrito')
      `).run(userId, fileNumber, license_category || "A-I");
    }

    db.exec("COMMIT");
    res.status(201).json({ id: userId, name: name.trim(), email: cleanEmail, role });
  } catch (err) {
    db.exec("ROLLBACK");
    console.error("Error al crear usuario:", err);
    res.status(500).json({ error: "No se pudo registrar el usuario." });
  }
});

// Listar instructores activos
router.get("/instructors", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT id, name, email, phone, license_number FROM users WHERE role = 'instructor' ORDER BY name")
    .all();
  res.json(rows);
});

// Eliminar usuario
router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: "No puedes eliminar tu propia cuenta de administrador." });
  }

  const info = db.prepare("DELETE FROM users WHERE id = ?").run(targetId);
  if (info.changes === 0) return res.status(404).json({ error: "Usuario no encontrado." });
  res.json({ ok: true });
});

module.exports = router;
