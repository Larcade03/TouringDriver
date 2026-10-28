const express = require("express");
const db = require("../database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Listar bloques de disponibilidad
router.get("/availability", requireAuth, (req, res) => {
  const { instructor_id, only_available, date } = req.query;

  let query = `
    SELECT s.*, u.name AS instructor_name, 
           v.plate AS vehicle_plate, v.model AS vehicle_model, v.transmission AS vehicle_transmission,
           r.id AS reservation_id, r.status AS reservation_status,
           st.name AS student_name, st.phone AS student_phone
    FROM availability_slots s
    JOIN users u ON u.id = s.instructor_id
    LEFT JOIN vehicles v ON v.id = s.vehicle_id
    LEFT JOIN reservations r ON r.slot_id = s.id AND r.status = 'confirmada'
    LEFT JOIN users st ON st.id = r.student_id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === "instructor" && !instructor_id) {
    query += " AND s.instructor_id = ?";
    params.push(req.user.id);
  }
  if (instructor_id) {
    query += " AND s.instructor_id = ?";
    params.push(instructor_id);
  }
  if (date) {
    query += " AND s.date = ?";
    params.push(date);
  }
  if (only_available === "true" || req.user.role === "student") {
    query += " AND s.is_booked = 0 AND s.date >= date('now')";
  }
  query += " ORDER BY s.date ASC, s.start_time ASC";

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// Publicar un bloque de horario disponible
router.post("/availability", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const { date, start_time, end_time, circuit, vehicle_id, instructor_id } = req.body;
  if (!date || !start_time || !end_time) {
    return res.status(400).json({ error: "Fecha, hora de inicio y hora de fin son obligatorias." });
  }

  const targetInstructor = req.user.role === "admin" && instructor_id ? instructor_id : req.user.id;

  if (end_time <= start_time) {
    return res.status(400).json({ error: "La hora de fin debe ser posterior a la hora de inicio." });
  }

  // Validar solapamiento con otro bloque del mismo instructor
  const instructorOverlap = db
    .prepare(
      `SELECT id FROM availability_slots
       WHERE instructor_id = ? AND date = ?
       AND NOT (end_time <= ? OR start_time >= ?)`
    )
    .get(targetInstructor, date, start_time, end_time);
  if (instructorOverlap) {
    return res.status(409).json({ error: "Ya existe un bloque de horario que se solapa con este para el instructor." });
  }

  // Prevenir turnos cruzados con el vehículo:
  // Si se asigna un vehículo, verificar disponibilidad y que no esté asignado a nadie más a la misma hora
  if (vehicle_id) {
    const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ error: "El vehículo seleccionado no existe." });
    }
    if (vehicle.status !== "disponible") {
      return res.status(400).json({
        error: `El vehículo con placa ${vehicle.plate} se encuentra en estado '${vehicle.status}'. No puede asignarse a prácticas.`
      });
    }

    const vehicleOverlap = db
      .prepare(
        `SELECT s.id, u.name AS instructor_name FROM availability_slots s
         JOIN users u ON u.id = s.instructor_id
         WHERE s.vehicle_id = ? AND s.date = ?
         AND NOT (s.end_time <= ? OR s.start_time >= ?)`
      )
      .get(vehicle_id, date, start_time, end_time);

    if (vehicleOverlap) {
      return res.status(409).json({
        error: `Conflicto de vehículo: la unidad (${vehicle.plate}) ya está asignada al instructor ${vehicleOverlap.instructor_name} en ese mismo horario.`
      });
    }
  }

  const info = db
    .prepare(
      `INSERT INTO availability_slots (instructor_id, vehicle_id, date, start_time, end_time, circuit)
       VALUES (?,?,?,?,?,?)`
    )
    .run(targetInstructor, vehicle_id || null, date, start_time, end_time, circuit || "Circuito Principal");

  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete("/availability/:id", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const slot = db.prepare("SELECT * FROM availability_slots WHERE id = ?").get(req.params.id);
  if (!slot) return res.status(404).json({ error: "Bloque no encontrado." });
  if (req.user.role === "instructor" && slot.instructor_id !== req.user.id) {
    return res.status(403).json({ error: "No puedes eliminar bloques de otro instructor." });
  }
  if (slot.is_booked) {
    return res.status(409).json({ error: "No se puede eliminar un bloque ya reservado. Cancela la reserva primero." });
  }
  db.prepare("DELETE FROM availability_slots WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
