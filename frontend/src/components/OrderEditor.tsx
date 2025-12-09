import { useState } from "react";
import { authFetch, API_BASE } from "../services/api";

export default function OrderEditor({ open, order, onClose, onSaved }) {
  const [form, setForm] = useState(order);

  if (!open) return null;

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function saveChanges() {
    await authFetch(`${API_BASE}/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    onSaved();
    onClose();
  }

  async function toggleDiscount() {
    await authFetch(`${API_BASE}/orders/${order.id}/toggle-discount`, {
      method: "POST",
    });
    onSaved();
  }

  async function addPayment() {
    const amt = parseFloat(prompt("¿Monto a abonar?"));
    if (!amt || amt <= 0) return;

    await authFetch(
      `${API_BASE}/orders/${order.id}/add-payment?amount=${amt}`,
      { method: "POST" }
    );

    onSaved();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-body">

        <h2>Editar orden #{order.id}</h2>

        <label>Cliente</label>
        <input
          name="nombre"
          value={form.nombre ?? ""}
          onChange={handleChange}
        />

        <label>Fecha</label>
        <input
          name="fecha"
          value={form.fecha ?? ""}
          onChange={handleChange}
        />

        <label>Dirección salida</label>
        <input
          name="dir_salida"
          value={form.dir_salida ?? ""}
          onChange={handleChange}
        />

        <label>Destino</label>
        <input
          name="dir_destino"
          value={form.dir_destino ?? ""}
          onChange={handleChange}
        />

        <label>Hora ida</label>
        <input
          name="hor_ida"
          value={form.hor_ida ?? ""}
          onChange={handleChange}
        />

        <label>Hora regreso</label>
        <input
          name="hor_regreso"
          value={form.hor_regreso ?? ""}
          onChange={handleChange}
        />

        <div className="actions">
          <button onClick={toggleDiscount}>
            {order.descuento > 0 ? "Quitar descuento" : "Aplicar descuento"}
          </button>

          <button onClick={addPayment}>
            Agregar abono
          </button>

          <button className="btn-primary" onClick={saveChanges}>
            Guardar cambios
          </button>

          <button className="btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}