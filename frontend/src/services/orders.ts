// src/services/orders.ts
import { API_BASE, authFetch } from "./api";

export type Order = {
  id: number;
  nombre: string | null;
  fecha: string | null;
  dir_salida: string | null;
  dir_destino: string | null;
  hor_ida: string | null;
  hor_regreso: string | null;
  duracion: string | null;
  capacidadu: string | null;
  subtotal: number | null;  // ✅ nuevo
  descuento: number | null;
  total: number | null;
  abonado: number | null;
  fecha_abono: string | null;
  liquidar: number | null;
  created_at: string;
};

export async function fetchOrders(signal?: AbortSignal): Promise<Order[]> {
  const res = await authFetch(`${API_BASE}/orders/`, { signal });
  return res.json();
}

export async function pdfFromData(order: Order, signal?: AbortSignal): Promise<Blob> {
  const res = await authFetch(`${API_BASE}/pdf/from-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
    signal,
  });
  return await res.blob();
}

export async function deleteOrder(id: number, signal?: AbortSignal): Promise<void> {
  await authFetch(`${API_BASE}/orders/${id}`, { method: "DELETE", signal });
}