const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_no_usar_en_produccion";

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "No se proporcionó un token de acceso." });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, role, name, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "No tienes permisos para esta acción." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
