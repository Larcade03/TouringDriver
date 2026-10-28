const express = require("express");
const db = require("../database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

function fullReservationQuery(whereClause, params) {
  const query = `
    SELECT r.id, r.status, r.notes, r.cancellation_reason, r.created_at,
           s.id AS slot_id, s.date, s.start_time, s.end_time, s.circuit,
           st.id AS student_id, st.name AS student_name, st.email AS student_email, st.phone AS student_phone,
           ins.id AS instructor_id, ins.name AS instructor_name, ins.phone AS instructor_phone,
           v.id AS vehicle_id, v.plate AS vehicle_plate, v.model AS vehicle_model, v.transmission AS vehicle_transmission
    FROM reservations r
    JOIN availability_slots s ON s.id = r.slot_id
    JOIN users st ON st.id = r.student_id
    JOIN users ins ON ins.id = s.instructor_id
    LEFT JOIN vehicles v ON v.id = s.vehicle_id
    ${whereClause}
    ORDER BY s.date DESC, s.start_time DESC
  `;
  return db.prepare(query).all(...params);
}

router.get("/", requireAuth, (req, res) => {
  let rows;
  if (req.user.role === "student") {
    rows = fullReservationQuery("WHERE r.student_id = ?", [req.user.id]);
  } else if (req.user.role === "instructor") {
    rows = fullReservationQuery("WHERE s.instructor_id = ?", [req.user.id]);
  } else {
    rows = fullReservationQuery("", []);
  }
  res.json(rows);
});

// Alumno reserva un bloque disponible (LambdaReservas)
router.post("/", requireAuth, requireRole("student"), (req, res) => {
  const { slot_id, notes } = req.body;
  if (!slot_id) return res.status(400).json({ error: "Debes indicar el bloque de horario a reservar." });

  const slot = db.prepare(`
    SELECT s.*, u.name AS instructor_name, v.plate AS vehicle_plate, v.model AS vehicle_model
    FROM availability_slots s
    JOIN users u ON u.id = s.instructor_id
    LEFT JOIN vehicles v ON v.id = s.vehicle_id
    WHERE s.id = ?
  `).get(slot_id);

  if (!slot) return res.status(404).json({ error: "El bloque de horario no existe." });
  if (slot.is_booked) return res.status(409).json({ error: "Este bloque ya fue reservado por otro alumno." });

  // Validar que el bloque no sea en una fecha pasada
  const today = new Date().toISOString().slice(0, 10);
  if (slot.date < today) {
    return res.status(400).json({ error: "No puedes reservar bloques de fechas pasadas." });
  }

  // Prevenir que el mismo alumno tenga dos reservas solapadas en la misma fecha y hora
  const studentOverlap = db.prepare(`
    SELECT r.id FROM reservations r
    JOIN availability_slots s ON s.id = r.slot_id
    WHERE r.student_id = ? AND r.status = 'confirmada' AND s.date = ?
    AND NOT (s.end_time <= ? OR s.start_time >= ?)
  `).get(req.user.id, slot.date, slot.start_time, slot.end_time);

  if (studentOverlap) {
    return res.status(409).json({ error: "Ya tienes una reserva confirmada en este mismo horario." });
  }

  try {
    db.exec("BEGIN");
    db.prepare("UPDATE availability_slots SET is_booked = 1 WHERE id = ?").run(slot_id);
    const info = db
      .prepare("INSERT INTO reservations (student_id, slot_id, notes) VALUES (?,?,?)")
      .run(req.user.id, slot_id, notes || null);

    const reservationId = info.lastInsertRowid;

    // Emisión de notificaciones (LambdaNotificaciones / SQS)
    const vehInfo = slot.vehicle_plate ? ` (${slot.vehicle_model} - ${slot.vehicle_plate})` : "";
    db.createNotification(
      req.user.id,
      "Reserva de práctica confirmada",
      `Tu práctica con el instructor ${slot.instructor_name} está confirmada para el ${slot.date} de ${slot.start_time} a ${slot.end_time} en ${slot.circuit}${vehInfo}.`,
      "reserva"
    );

    db.createNotification(
      slot.instructor_id,
      "Nuevo turno reservado",
      `El alumno ${req.user.name} ha reservado tu bloque del ${slot.date} de ${slot.start_time} a ${slot.end_time}.`,
      "reserva"
    );

    db.exec("COMMIT");
    res.status(201).json({ id: reservationId, message: "Reserva confirmada con éxito." });
  } catch (err) {
    db.exec("ROLLBACK");
    console.error("Error al reservar:", err);
    res.status(500).json({ error: "No se pudo completar la reserva. Intenta nuevamente." });
  }
});

// Cancelar reserva
router.put("/:id/cancel", requireAuth, (req, res) => {
  const reservation = db.prepare(`
    SELECT r.*, s.date, s.start_time, s.end_time, s.circuit, s.instructor_id,
           st.name AS student_name, ins.name AS instructor_name
    FROM reservations r
    JOIN availability_slots s ON s.id = r.slot_id
    JOIN users st ON st.id = r.student_id
    JOIN users ins ON ins.id = s.instructor_id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!reservation) return res.status(404).json({ error: "Reserva no encontrada." });

  const isOwner = req.user.role === "student" && reservation.student_id === req.user.id;
  const isInstructor = req.user.role === "instructor" && reservation.instructor_id === req.user.id;
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isInstructor && !isAdmin) {
    return res.status(403).json({ error: "No tienes permisos para cancelar esta reserva." });
  }

  if (reservation.status !== "confirmada") {
    return res.status(409).json({ error: "Esta reserva ya no está activa." });
  }

  const { reason } = req.body || {};
  const cancellationReason = reason || (isOwner ? "Cancelada por el alumno" : "Cancelada por la escuela/instructor");

  try {
    db.exec("BEGIN");
    db.prepare("UPDATE reservations SET status = 'cancelada', cancellation_reason = ? WHERE id = ?")
      .run(cancellationReason, req.params.id);
    db.prepare("UPDATE availability_slots SET is_booked = 0 WHERE id = ?")
      .run(reservation.slot_id);

    // Notificaciones cruzadas de cancelación
    db.createNotification(
      reservation.student_id,
      "Reserva cancelada",
      `La práctica del ${reservation.date} (${reservation.start_time} - ${reservation.end_time}) ha sido cancelada. Motivo: ${cancellationReason}.`,
      "cancelacion"
    );

    db.createNotification(
      reservation.instructor_id,
      "Turno cancelado",
      `La reserva del alumno ${reservation.student_name} para el ${reservation.date} (${reservation.start_time} - ${reservation.end_time}) fue cancelada. El bloque vuelve a estar disponible.`,
      "cancelacion"
    );

    db.exec("COMMIT");
    res.json({ ok: true, message: "Reserva cancelada correctamente." });
  } catch (err) {
    db.exec("ROLLBACK");
    console.error("Error al cancelar reserva:", err);
    res.status(500).json({ error: "No se pudo cancelar la reserva. Intenta nuevamente." });
  }
});

// Marcar sesión completada
router.put("/:id/complete", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const reservation = db.prepare(`
    SELECT r.*, s.date, s.start_time, s.end_time, s.circuit, st.name AS student_name, ins.name AS instructor_name
    FROM reservations r
    JOIN availability_slots s ON s.id = r.slot_id
    JOIN users st ON st.id = r.student_id
    JOIN users ins ON ins.id = s.instructor_id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!reservation || reservation.status !== "confirmada") {
    return res.status(404).json({ error: "Reserva no encontrada o ya no está activa." });
  }

  const info = db
    .prepare("UPDATE reservations SET status = 'completada' WHERE id = ? AND status = 'confirmada'")
    .run(req.params.id);

  if (info.changes === 0) {
    return res.status(404).json({ error: "No se pudo actualizar el estado de la reserva." });
  }

  // Notificar al alumno
  db.createNotification(
    reservation.student_id,
    "Práctica completada",
    `¡Excelente! Tu sesión de manejo del ${reservation.date} con ${reservation.instructor_name} fue marcada como completada. Revisa tu progreso.`,
    "progreso"
  );

  res.json({ ok: true });
});

module.exports = router;
