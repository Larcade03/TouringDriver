import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dni: "",
    license_category: "A-I",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.register(form);
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
        <p>
          Matricúlate en la plataforma oficial de la escuela. Reserva tus prácticas de circuito,
          gestiona tu expediente y practica con simulacros de examen MTC.
        </p>
      </div>
      <div className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Matrícula de nuevo alumno</h2>
          {error && <p className="form-error">{error}</p>}
          <label>
            Nombre completo
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombres y Apellidos"
            />
          </label>
          <label>
            Documento de Identidad (DNI)
            <input
              required
              maxLength={8}
              value={form.dni}
              onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, "") })}
              placeholder="8 dígitos"
            />
          </label>
          <label>
            Categoría de brevete a la que postulas
            <select
              value={form.license_category}
              onChange={(e) => setForm({ ...form, license_category: e.target.value })}
            >
              <option value="A-I">Clase A Categoría I (Vehículos particulares)</option>
              <option value="A-IIa">Clase A Categoría II-a (Taxi, colectivo, movilidad escolar)</option>
              <option value="A-IIb">Clase A Categoría II-b (Custer, microbús, camiones)</option>
            </select>
          </label>
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
            Teléfono de contacto
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="999 999 999"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Creando expediente…" : "Matricularme e ingresar"}
          </button>
          <p className="auth-switch">
            ¿Ya tienes una cuenta de alumno? <Link to="/ingresar">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
