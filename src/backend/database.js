// Usamos el módulo nativo de Node "node:sqlite" (Node 22+)
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const bcrypt = require("bcryptjs");

const db = new DatabaseSync(path.join(__dirname, "touring_driver.db"));
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// Definición de esquema robusto alineado al informe de arquitectura de Touring Driver
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','instructor','student')),
  phone TEXT,
  license_number TEXT,
  dni TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  file_number TEXT NOT NULL UNIQUE,
  license_category TEXT NOT NULL DEFAULT 'A-I' CHECK (license_category IN ('A-I', 'A-IIa', 'A-IIb', 'A-IIIa')),
  medical_exam_status TEXT NOT NULL DEFAULT 'pendiente' CHECK (medical_exam_status IN ('pendiente', 'aprobado', 'observado')),
  medical_exam_date TEXT,
  file_status TEXT NOT NULL DEFAULT 'en_tramite' CHECK (file_status IN ('inscrito', 'en_tramite', 'observado', 'aprobado_para_examen', 'licencia_emitida')),
  emergency_contact TEXT,
  emergency_phone TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plate TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  transmission TEXT NOT NULL DEFAULT 'manual' CHECK (transmission IN ('manual', 'automatica')),
  status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible','mantenimiento','fuera_de_servicio')),
  mileage INTEGER DEFAULT 0,
  year INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  circuit TEXT DEFAULT 'Circuito Principal',
  is_booked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_id INTEGER NOT NULL REFERENCES availability_slots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada','cancelada','completada')),
  notes TEXT,
  cancellation_reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  hours_completed REAL NOT NULL DEFAULT 0,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  skill_level TEXT NOT NULL DEFAULT 'principiante' CHECK (skill_level IN ('principiante','intermedio','avanzado','listo_para_examen')),
  skills_eval TEXT,
  notes TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exam_simulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('teorico','practico')),
  score INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  taken_at TEXT DEFAULT (datetime('now')),
  details TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'reserva', 'recordatorio', 'cancelacion', 'progreso', 'examen')),
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Índices de alto rendimiento para cumplir RNF-09 (< 5s en 95% de consultas)
CREATE INDEX IF NOT EXISTS idx_slots_lookup ON availability_slots(date, is_booked, instructor_id);
CREATE INDEX IF NOT EXISTS idx_slots_vehicle ON availability_slots(vehicle_id, date);
CREATE INDEX IF NOT EXISTS idx_res_student ON reservations(student_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_student_files_student ON student_files(student_id);
`);

// Helper para emitir notificaciones internas (emula el flujo LambdaNotificaciones / SQS)
function createNotification(userId, title, message, type = "info") {
  try {
    return db
      .prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)")
      .run(userId, title, message, type);
  } catch (err) {
    console.error("Error al registrar notificación:", err.message);
  }
}

// Semilla mínima: un admin por defecto si no existe ninguno
const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!adminExists) {
  const hash = bcrypt.hashSync("admin1234", 10);
  db.prepare(
    "INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)"
  ).run("Administrador Touring", "admin@touringdriver.com", hash, "admin", "999999999");
  console.log("Usuario admin creado -> admin@touringdriver.com / admin1234");
}

db.createNotification = createNotification;
module.exports = db;
