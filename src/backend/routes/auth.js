const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../database");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// Registro público: solo alumnos se auto-registran
router.post("/register", (req, res) => {
  const { name, email, password, phone, dni, license_category } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nombre, correo y contraseña son obligatorios." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
  }

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese correo electrónico." });
  }

  if (dni) {
    const dniExists = db.prepare("SELECT id FROM users WHERE dni = ?").get(dni);
    if (dniExists) {
      return res.status(409).json({ error: "Ya existe un alumno registrado con ese DNI." });
    }
  }

  const hash = bcrypt.hashSync(password, 10);

  try {
    db.exec("BEGIN");
    const info = db
      .prepare("INSERT INTO users (name, email, password_hash, role, phone, dni) VALUES (?,?,?,?,?,?)")
      .run(name.trim(), email.trim().toLowerCase(), hash, "student", phone || null, dni || null);

    const studentId = info.lastInsertRowid;

    // Crear expediente inicial de matrícula (LambdaEstudiante)
    const fileNumber = `EXP-${new Date().getFullYear()}-${String(studentId).padStart(4, "0")}`;
    const category = license_category && ["A-I", "A-IIa", "A-IIb", "A-IIIa"].includes(license_category)
      ? license_category
      : "A-I";

    db.prepare(`
      INSERT INTO student_files (student_id, file_number, license_category, medical_exam_status, file_status)
      VALUES (?, ?, ?, 'pendiente', 'inscrito')
    `).run(studentId, fileNumber, category);

    // Notificación de bienvenida (LambdaNotificaciones)
    db.createNotification(
      studentId,
      "¡Bienvenido a Touring Driver!",
      `Tu cuenta y expediente (${fileNumber}) han sido creados con éxito. Revisa tus datos y agenda tu primera práctica.`,
      "info"
    );

    db.exec("COMMIT");

    const user = { id: studentId, name, email, role: "student", dni: dni || null };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "4h" });
    res.status(201).json({ token, user });
  } catch (err) {
    db.exec("ROLLBACK");
    console.error("Error en registro:", err);
    res.status(500).json({ error: "No se pudo completar el registro del alumno." });
  }
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
  }

  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: "Correo o contraseña incorrectos." });
  }

  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "4h" });
  res.json({ token, user });
});

router.get("/me", requireAuth, (req, res) => {
  const row = db
    .prepare("SELECT id, name, email, role, phone, license_number, dni, created_at FROM users WHERE id = ?")
    .get(req.user.id);
  if (!row) return res.status(404).json({ error: "Usuario no encontrado." });

  // Si es estudiante, anexar su expediente de matrícula
  if (row.role === "student") {
    const studentFile = db.prepare("SELECT * FROM student_files WHERE student_id = ?").get(row.id);
    return res.json({ ...row, file: studentFile || null });
  }

  res.json(row);
});

module.exports = router;
