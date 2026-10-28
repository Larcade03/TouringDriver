const express = require("express");
const db = require("../database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Listar vehículos
router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT v.*,
           (SELECT COUNT(*) FROM availability_slots s WHERE s.vehicle_id = v.id AND s.date >= date('now')) AS scheduled_slots
    FROM vehicles v
    ORDER BY v.created_at DESC
  `).all();
  res.json(rows);
});

// Registrar nuevo vehículo (LambdaVehiculo)
router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { plate, model, transmission, year, mileage, status } = req.body;
  if (!plate || !model) return res.status(400).json({ error: "Placa y modelo son obligatorios." });

  const cleanPlate = plate.trim().toUpperCase();
  const exists = db.prepare("SELECT id FROM vehicles WHERE plate = ?").get(cleanPlate);
  if (exists) return res.status(409).json({ error: "Ya existe un vehículo con esa placa." });

  const validTrans = ["manual", "automatica"];
  const trans = validTrans.includes(transmission) ? transmission : "manual";

  const validStatus = ["disponible", "mantenimiento", "fuera_de_servicio"];
  const initialStatus = validStatus.includes(status) ? status : "disponible";

  const info = db
    .prepare(
      "INSERT INTO vehicles (plate, model, transmission, status, year, mileage) VALUES (?,?,?,?,?,?)"
    )
    .run(cleanPlate, model.trim(), trans, initialStatus, Number(year) || null, Number(mileage) || 0);

  res.status(201).json({
    id: info.lastInsertRowid,
    plate: cleanPlate,
    model: model.trim(),
    transmission: trans,
    status: initialStatus,
    year: Number(year) || null,
    mileage: Number(mileage) || 0
  });
});

// Actualizar estado del vehículo
router.put("/:id/status", requireAuth, requireRole("admin"), (req, res) => {
  const { status } = req.body;
  if (!["disponible", "mantenimiento", "fuera_de_servicio"].includes(status)) {
    return res.status(400).json({ error: "Estado inválido." });
  }

  const info = db.prepare("UPDATE vehicles SET status = ? WHERE id = ?").run(status, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Vehículo no encontrado." });
  res.json({ ok: true });
});

// Actualizar kilometraje y detalles del vehículo
router.put("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { model, transmission, mileage, year, status } = req.body;
  const info = db
    .prepare(`
      UPDATE vehicles
      SET model = COALESCE(?, model),
          transmission = COALESCE(?, transmission),
          mileage = COALESCE(?, mileage),
          year = COALESCE(?, year),
          status = COALESCE(?, status)
      WHERE id = ?
    `)
    .run(model || null, transmission || null, mileage !== undefined ? Number(mileage) : null, year ? Number(year) : null, status || null, req.params.id);

  if (info.changes === 0) return res.status(404).json({ error: "Vehículo no encontrado." });
  res.json({ ok: true, message: "Vehículo actualizado." });
});

// Eliminar vehículo
router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  // Verificar si tiene bloques activos
  const activeSlots = db
    .prepare("SELECT COUNT(*) AS count FROM availability_slots WHERE vehicle_id = ? AND date >= date('now')")
    .get(req.params.id)?.count || 0;

  if (activeSlots > 0) {
    return res.status(409).json({
      error: `No se puede eliminar el vehículo porque tiene ${activeSlots} bloque(s) de práctica programados.`
    });
  }

  const info = db.prepare("DELETE FROM vehicles WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Vehículo no encontrado." });
  res.json({ ok: true });
});

module.exports = router;
