import { API_BASE } from "./api";

type Credentials = { username: string; password: string };

const TOKEN_KEY = "token";

export function saveToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function isLoggedIn() {
  return Boolean(getToken());
}

export async function login({ username, password }: Credentials) {
  // IMPORTANT: x-www-form-urlencoded, no JSON
  const form = new URLSearchParams();
  form.set("username", username);
  form.set("password", password);

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Error ${res.status}`);
  }

  const data = await res.json();
  const token = data?.access_token;
  if (!token) throw new Error("Token no recibido");

  saveToken(token);   // persistencia entre recargas
  return token;       // ⬅️ devolvemos token para setToken() en el contexto
}

export function logout() {
  clearToken();
}