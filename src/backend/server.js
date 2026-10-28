require("dotenv").config();
const express = require("express");
const cors = require("cors");

require("./database"); // inicializa la base de datos SQLite y crea tablas + admin semilla

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const vehicleRoutes = require("./routes/vehicles");
const instructorRoutes = require("./routes/instructors");
const reservationRoutes = require("./routes/reservations");
const progressRoutes = require("./routes/progress");
const examRoutes = require("./routes/exams");
const notificationRoutes = require("./routes/notifications");
const studentRoutes = require("./routes/students");

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint de salud del backend (Health Check)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "touring-driver-backend",
    time: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/instructors", instructorRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/students", studentRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

// Manejador centralizado de errores
app.use((err, req, res, next) => {
  console.error("Error no controlado:", err);
  res.status(500).json({ error: "Ocurrió un error inesperado en el servidor." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Touring Driver backend escuchando en http://localhost:${PORT}`);
});
