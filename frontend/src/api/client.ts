const BASE_URL = "http://localhost:5000/api";

export function getToken() {
  return localStorage.getItem("mes_token");
}

export function setToken(token: string) {
  localStorage.setItem("mes_token", token);
}

export function clearToken() {
  localStorage.removeItem("mes_token");
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }

  return data;
}