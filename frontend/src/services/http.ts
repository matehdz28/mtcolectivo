// src/services/http.ts
export const API_BASE = import.meta.env.VITE_API_URL ?? "https://mtcolectivo-production.up.railway.app";

function getToken(): string | null {
  return localStorage.getItem("mt_token");
}

export async function http<T = any>(
  path: string,
  options: RequestInit = {},
  opts?: { auth?: boolean }
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(options.headers ?? {});
  headers.set("Accept", "application/json");

  // inyecta auth si se pide
  if (opts?.auth !== false) {
    const t = getToken();
    if (t) headers.set("Authorization", `Bearer ${t}`);
  }

  const res = await fetch(url, { ...options, headers });

  // Si vence el token
  if (res.status === 401) {
    // Limpia y manda a login
    localStorage.removeItem("mt_token");
    // No navegamos aquí para no acoplar; el caller puede manejarlo
    throw new Error("No autorizado");
  }

  // Detecta JSON vs Blob vs text
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const body = ct.includes("application/json") ? JSON.stringify(await res.json()).slice(0, 500) : await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }

  if (ct.includes("application/pdf") || ct.includes("octet-stream")) {
    return (await res.blob()) as T;
  }
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as T;
}
