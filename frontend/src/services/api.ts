// src/services/api.ts
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status?: number;
  body?: string;
  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

import { getToken } from "./auth";

export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) throw new ApiError("No autorizado", 401, body);
    throw new ApiError(body || `HTTP ${res.status}`, res.status, body);
  }
  return res;
}

// subir excel (con auth)
export async function uploadExcel(file: File, sheet: string, signal?: AbortSignal): Promise<Blob> {
  const form = new FormData();
  form.append("file", file);
  form.append("sheet", sheet);

  const res = await authFetch(`${API_BASE}/pdf/from-excel`, {
    method: "POST",
    body: form,
    signal,
  });
  return await res.blob();
}