// API calls to Django with JWT tokens. Tokens are stored in localStorage.

const API = "/api";

export const tokens = {
  get access() {
    return localStorage.getItem("access");
  },
  get refresh() {
    return localStorage.getItem("refresh");
  },
  save({ access, refresh }) {
    if (access) localStorage.setItem("access", access);
    if (refresh) localStorage.setItem("refresh", refresh);
  },
  clear() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  },
};

// Called when tokens are no longer valid, so the app can show the user as logged out.
let onLogout = () => {};
export function setLogoutHandler(handler) {
  onLogout = handler;
}

async function refreshAccessToken() {
  if (!tokens.refresh) return false;
  const res = await fetch(`${API}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });
  if (!res.ok) return false;
  tokens.save(await res.json());
  return true;
}

export function errorText(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  return Object.values(data)
    .flat()
    .map((m) => (typeof m === "string" ? m : errorText(m)))
    .join(" ");
}

// api("/places/") or api("/reviews/", { method: "POST", body: {...} }).
// body can be an object (sent as JSON) or FormData (for files).
export async function api(path, { method = "GET", body } = {}) {
  const isForm = body instanceof FormData;
  const payload = body && !isForm ? JSON.stringify(body) : body;

  const send = () => {
    const headers = {};
    if (body && !isForm) headers["Content-Type"] = "application/json";
    if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
    return fetch(API + path, { method, headers, body: payload });
  };

  let res = await send();
  if (res.status === 401 && tokens.access) {
    if (!(await refreshAccessToken())) {
      tokens.clear();
      onLogout();
    }
    res = await send();
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(errorText(data) || `Ошибка ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}
