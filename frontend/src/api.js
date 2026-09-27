import { lang, t } from "./i18n.js";
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

// Server messages that are shown to visitors, in the site language.
const SERVER_MESSAGES = {
  "This point is outside Tajikistan. Only places in Tajikistan can be added.": t(
    "Это место за пределами Таджикистана. Добавлять можно только места в Таджикистане."
  ),
  "Confirm your email first: enter the code from the letter we sent you.": t("Сначала подтвердите email: введите код из письма."),
  "This email is already registered.": t("Этот email уже зарегистрирован."),
  "The code is wrong.": t("Неверный код."),
  "The code has 6 digits.": t("Код состоит из 6 цифр."),
  "The code has expired. Ask for a new one.": t("Срок действия кода истёк. Запросите новый."),
  "Too many wrong tries. Ask for a new code.": t("Слишком много неверных попыток. Запросите новый код."),
  "Please wait a minute before asking for a new code.": t("Подождите минуту, прежде чем запрашивать новый код."),
  "Could not send the email. Please try again later.": t("Не удалось отправить письмо. Попробуйте позже."),
};

export function errorText(data) {
  if (!data) return "";
  if (typeof data === "string") return SERVER_MESSAGES[data] || data;
  if (data.detail) return data.detail;
  return Object.values(data)
    .flat()
    .map((m) => (typeof m === "string" ? SERVER_MESSAGES[m] || m : errorText(m)))
    .join(" ");
}

// api("/places/") or api("/reviews/", { method: "POST", body: {...} }).
// body can be an object (sent as JSON) or FormData (for files).
export async function api(path, { method = "GET", body } = {}) {
  const isForm = body instanceof FormData;
  const payload = body && !isForm ? JSON.stringify(body) : body;

  const send = () => {
    // The API returns place names in the site language (Russian when there is no translation).
    const headers = { "Accept-Language": lang };
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
    const error = new Error(errorText(data) || t("Ошибка {0}", res.status));
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}
