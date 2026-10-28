import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "instructor",
  phone: "",
  dni: "",
  license_number: "",
};

export default function StaffManagement() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);

  async function loadUsers() {
    try {
      setUsers(await api.listUsers(token));
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.createUser(token, form);
      setMessage({ type: "success", text: "Cuenta de personal creada correctamente." });
      setForm(emptyForm);
      loadUsers();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
    setMessage(null);
    try {
      await api.deleteUser(token, id);
      setMessage({ type: "success", text: "Usuario eliminado." });
      loadUsers();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  const staffUsers = users.filter((u) => u.role === "admin" || u.role === "instructor");

  return (
    <div className="stack-lg">
      <header className="page-header">
        <div>
          <h1>Gestión de Personal e Instructores</h1>
          <p>Alta y administración de accesos para instructores de manejo y equipo administrativo.</p>
        </div>
      </header>

      {message && <div className={`banner banner-${message.type}`}>{message.text}</div>}

      <section className="panel">
        <div className="panel-header">
          <h2>Registrar nuevo miembro del personal</h2>
        </div>
        <form className="inline-form" onSubmit={handleSubmit}>
          <label>
            Nombre completo
            <input
              required
              placeholder="Ej. Carlos Mendoza"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            DNI
            <input
              maxLength={8}
              placeholder="8 dígitos"
              value={form.dni}
              onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, "") })}
            />
          </label>
          <label>
            Correo electrónico
            <input
              type="email"
              required
              placeholder="instructor@touringdriver.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Contraseña temporal
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <label>
            Rol asignado
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="instructor">Instructor de manejo</option>
              <option value="admin">Administrador del sistema</option>
            </select>
          </label>
          <label>
            Teléfono
            <input
              placeholder="987 654 321"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label>
            N° Licencia Profesional
            <input
              placeholder="Solo instructores (Ej. Q40291823)"
              value={form.license_number}
              onChange={(e) => setForm({ ...form, license_number: e.target.value })}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Crear cuenta de personal
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Personal registrado ({staffUsers.length})</h2>
        </div>
        <ul className="slot-list">
          {staffUsers.map((u) => (
            <li key={u.id} className="slot-row">
              <div className="slot-info">
                <span className="slot-date">{u.name}</span>
                <span className="slot-meta">
                  {u.email} · {roleLabel(u.role)}
                  {u.dni ? ` · DNI: ${u.dni}` : ""}
                  {u.license_number ? ` · Licencia: ${u.license_number}` : ""}
                </span>
              </div>
              {u.id !== user.id && (
                <button className="btn btn-ghost" onClick={() => handleDelete(u.id)}>
                  Eliminar
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function roleLabel(role) {
  if (role === "admin") return "Administrador";
  if (role === "instructor") return "Instructor";
  return "Alumno";
}
