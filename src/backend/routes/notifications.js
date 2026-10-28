const express = require("express");
const db = require("../database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Listar notificaciones del usuario autenticado
router.get("/", requireAuth, (req, res) => {
  const notifications = db
    .prepare(
      "SELECT id, title, message, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    )
    .all(req.user.id);

  const unreadCount = db
    .prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0")
    .get(req.user.id)?.count || 0;

  res.json({ notifications, unreadCount });
});

// Marcar notificación individual como leída
router.put("/:id/read", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// Marcar todas las notificaciones como leídas
router.put("/read-all", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?")
    .run(req.user.id);
  res.json({ ok: true });
});

// Eliminar una notificación
router.delete("/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
