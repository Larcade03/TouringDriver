import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

const emptyForm = {
  plate: "",
  model: "",
  transmission: "manual",
  year: new Date().getFullYear(),
  mileage: "",
  status: "disponible",
};

export default function VehicleManagement() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);

  async function loadVehicles() {
    try {
      setVehicles(await api.listVehicles(token));
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.createVehicle(token, form);
      setMessage({ type: "success", text: "Vehículo incorporado a la flota exitosamente." });
      setForm(emptyForm);
      loadVehicles();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleStatusChange(id, status) {
    setMessage(null);
    try {
      await api.setVehicleStatus(token, id, status);
      setMessage({ type: "success", text: "Estado del vehículo actualizado." });
      loadVehicles();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Seguro que deseas eliminar esta unidad vehicular de la flota?")) return;
    setMessage(null);
    try {
      await api.deleteVehicle(token, id);
      setMessage({ type: "success", text: "Vehículo eliminado." });
      loadVehicles();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  return (
    <div className="stack-lg">
      <header className="page-header">
        <div>
          <h1>Control de Flota Vehicular</h1>
          <p>Supervisa el estado mecánico, transmisión y asignación de unidades para las clases prácticas.</p>
        </div>
      </header>

      {message && <div className={`banner banner-${message.type}`}>{message.text}</div>}

      <section className="panel">
        <div className="panel-header">
          <h2>Registrar nueva unidad vehicular</h2>
        </div>
        <form className="inline-form" onSubmit={handleSubmit}>
          <label>
            Placa
            <input
              required
              placeholder="Ej. T1A-304"
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
            />
          </label>
          <label>
            Modelo / Marca
            <input
              required
              placeholder="Ej. Toyota Yaris"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </label>
          <label>
            Año
            <input
              type="number"
              min="2010"
              max={new Date().getFullYear() + 1}
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
          </label>
          <label>
            Kilometraje
            <input
              type="number"
              placeholder="Ej. 15000"
              value={form.mileage}
              onChange={(e) => setForm({ ...form, mileage: e.target.value })}
            />
          </label>
          <label>
            Transmisión
            <select
              value={form.transmission}
              onChange={(e) => setForm({ ...form, transmission: e.target.value })}
            >
              <option value="manual">Manual (Mecánica)</option>
              <option value="automatica">Automática</option>
            </select>
          </label>
          <button className="btn btn-primary" type="submit">
            Registrar unidad
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Unidades en servicio ({vehicles.length})</h2>
        </div>
        <ul className="slot-list">
          {vehicles.map((v) => (
            <li key={v.id} className="slot-row">
              <div className="slot-info">
                <span className="slot-date">🚗 {v.plate}</span>
                <span className="slot-meta">
                  {v.model} · {v.transmission === "automatica" ? "Automático" : "Mecánico"}
                  {v.year ? ` · Año ${v.year}` : ""}
                  {v.mileage ? ` · ${v.mileage.toLocaleString()} km` : ""}
                </span>
                {v.scheduled_slots > 0 && (
                  <span className="text-muted text-sm">
                    {v.scheduled_slots} turno(s) de práctica programado(s)
                  </span>
                )}
              </div>
              <div className="row-actions">
                <select
                  value={v.status}
                  onChange={(e) => handleStatusChange(v.id, e.target.value)}
                  className={`status-select status-select-${v.status}`}
                >
                  <option value="disponible">🟢 Disponible</option>
                  <option value="mantenimiento">🟡 En Mantenimiento</option>
                  <option value="fuera_de_servicio">🔴 Fuera de servicio</option>
                </select>
                <button className="btn btn-ghost" onClick={() => handleDelete(v.id)}>
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
