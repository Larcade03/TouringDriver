import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.login(form);
      login(token, user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-visual">
        <span className="auth-lane" aria-hidden="true" />
        <h1>Touring Driver</h1>
        <p>Reserva tus prácticas de manejo, sigue tu progreso y prepárate para el examen, todo en un solo lugar.</p>
      </div>
      <div className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Ingresa a tu cuenta</h2>
          {error && <p className="form-error">{error}</p>}
          <label>
            Correo electrónico
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="tucorreo@ejemplo.com"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
          <p className="auth-switch">
            ¿No tienes cuenta? <Link to="/registro">Regístrate como alumno</Link>
          </p>
          <p className="auth-hint">Cuenta demo admin: admin@touringdriver.com / admin1234</p>
        </form>
      </div>
    </div>
  );
}
