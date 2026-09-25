// Shared helpers: API calls with JWT, formatting, place cards, modal and toast.

const API = "/api";

const $ = (selector, root = document) => root.querySelector(selector);

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

const SEASONS = {
  spring: "Весна",
  summer: "Лето",
  autumn: "Осень",
  winter: "Зима",
  all_year: "Круглый год",
};

const CATEGORY_STYLES = {
  "Озёра": {
    icon: "water", gradient: "from-cyan-700 via-teal-900 to-slate-950",
    text: "Бирюзовые горные озёра Фанских гор и Памира — тишина, чистый воздух и отдых у воды.",
  },
  "Горы": {
    icon: "landscape", gradient: "from-slate-500 via-slate-800 to-slate-950",
    text: "Вершины, перевалы и горнолыжные склоны для тех, кто любит высоту.",
  },
  "Ущелья": {
    icon: "terrain", gradient: "from-amber-700 via-stone-800 to-slate-950",
    text: "Прохладные ущелья с реками и водопадами — лучшее место летом.",
  },
  "Курорты и санатории": {
    icon: "hot_tub", gradient: "from-emerald-600 via-teal-900 to-slate-950",
    text: "Горячие источники и санатории с минеральной водой для здоровья и восстановления.",
  },
  "Исторические места": {
    icon: "fort", gradient: "from-orange-700 via-stone-800 to-slate-950",
    text: "Древние крепости и памятники Великого шёлкового пути.",
  },
  "Парки": {
    icon: "park", gradient: "from-green-600 via-emerald-900 to-slate-950",
    text: "Парки и заповедники для прогулок, семейного отдыха и фотографий.",
  },
};

function categoryStyle(name) {
  return CATEGORY_STYLES[name] || {
    icon: "explore", gradient: "from-slate-700 via-slate-800 to-slate-950",
    text: "Интересные места для отдыха по всему Таджикистану.",
  };
}

function formatFee(fee) {
  const amount = Number(fee);
  return amount > 0 ? `${amount.toLocaleString("ru-RU")} сомони` : "Бесплатно";
}

function formatRating(rating) {
  return rating ? Number(rating).toFixed(1) : "—";
}

// ---------- Auth tokens ----------

const auth = {
  get access() { return localStorage.getItem("access"); },
  get refresh() { return localStorage.getItem("refresh"); },
  get user() {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  },
  isLoggedIn() { return Boolean(this.access); },
  save({ access, refresh }, user) {
    if (access) localStorage.setItem("access", access);
    if (refresh) localStorage.setItem("refresh", refresh);
    if (user) localStorage.setItem("user", JSON.stringify(user));
  },
  clear() {
    ["access", "refresh", "user"].forEach((key) => localStorage.removeItem(key));
  },
};

async function refreshAccessToken() {
  const res = await fetch(`${API}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: auth.refresh }),
  });
  if (!res.ok) return false;
  auth.save(await res.json());
  return true;
}

function errorText(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  return Object.values(data).flat().map((m) => (typeof m === "string" ? m : errorText(m))).join(" ");
}

// Calls the API. Adds the JWT token, refreshes it once on 401, throws Error with a readable message.
async function api(path, { method = "GET", body } = {}) {
  const isForm = body instanceof FormData;
  const payload = body && !isForm ? JSON.stringify(body) : body;

  const send = () => {
    const headers = {};
    if (body && !isForm) headers["Content-Type"] = "application/json";
    if (auth.access) headers.Authorization = `Bearer ${auth.access}`;
    return fetch(API + path, { method, headers, body: payload });
  };

  let res = await send();
  if (res.status === 401 && auth.access) {
    const refreshed = auth.refresh && (await refreshAccessToken());
    if (!refreshed) {
      auth.clear();
      document.dispatchEvent(new Event("auth-changed"));
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

// ---------- Toast and modal ----------

let toastTimer;
function toast(message, type = "ok") {
  const el = $("#toast");
  el.textContent = message;
  el.className = "fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl border shadow-2xl text-body-sm max-w-[90vw] " + (
    type === "error"
      ? "bg-red-950/95 border-red-800 text-red-200"
      : "bg-slate-900/95 border-emerald-500/40 text-emerald-200"
  );
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 3500);
}

function openModal(html, { wide = false } = {}) {
  $("#modal-box").classList.toggle("max-w-3xl", wide);
  $("#modal-box").classList.toggle("max-w-lg", !wide);
  $("#modal-content").innerHTML = html;
  $("#modal").classList.remove("hidden");
  $("#modal").classList.add("flex");
  document.body.classList.add("overflow-hidden");
}

function closeModal() {
  $("#modal").classList.add("hidden");
  $("#modal").classList.remove("flex");
  $("#modal-content").innerHTML = "";
  document.body.classList.remove("overflow-hidden");
}

$("#modal-close").addEventListener("click", closeModal);
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// Returns true if logged in, otherwise asks the user to log in.
function requireLogin(message = "Войдите, чтобы продолжить") {
  if (auth.isLoggedIn()) return true;
  toast(message, "error");
  if (typeof openAuth === "function") openAuth("login");
  return false;
}

// ---------- Place card ----------

function placeBackground(place, rounded = "") {
  if (place.main_image) {
    return `<div class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500 ${rounded}"
      style="background-image:url('${esc(encodeURI(place.main_image))}')"></div>`;
  }
  const style = categoryStyle(place.category?.name ?? place.category);
  return `<div class="absolute inset-0 bg-gradient-to-br ${style.gradient} group-hover:scale-105 transition-transform duration-500 ${rounded}">
      <span class="material-symbols-outlined absolute right-6 top-8 text-[150px] leading-none text-white/10">${style.icon}</span>
    </div>`;
}

function placeCard(place) {
  const category = place.category || "Без категории";
  const distance = place.distance_km != null
    ? `<span class="absolute top-4 left-4 z-20 bg-slate-950/70 backdrop-blur-md text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-label-sm font-label-sm flex items-center gap-1">
         <span class="material-symbols-outlined text-[14px]">near_me</span>${place.distance_km} км</span>`
    : "";
  return `
  <article class="group relative rounded-2xl overflow-hidden bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 shadow-xl transition-all duration-300 flex flex-col justify-end h-[420px] cursor-pointer" data-place-id="${place.id}">
    ${placeBackground(place)}
    <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
    ${distance}
    <button class="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-slate-950/60 backdrop-blur-md border border-slate-700/60 hover:border-rose-400/60 flex items-center justify-center transition-all ${place.is_favorite ? "text-rose-400" : "text-slate-300"}"
      data-fav-id="${place.id}" data-fav="${place.is_favorite ? 1 : 0}" title="Избранное" type="button">
      <span class="material-symbols-outlined text-[20px]" style="font-variation-settings:'FILL' ${place.is_favorite ? 1 : 0};">favorite</span>
    </button>
    <div class="relative z-10 p-8 flex flex-col justify-end h-full">
      <span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md self-start px-3 py-1 rounded-full text-label-sm font-label-sm mb-3">${esc(category)}</span>
      <h3 class="text-headline-md font-headline-md text-white mb-2">${esc(place.name)}</h3>
      <p class="text-body-sm text-slate-300 mb-4">${esc(SEASONS[place.best_season] || "")} · ${esc(formatFee(place.entrance_fee))}</p>
      <div class="flex items-center justify-between gap-2 text-label-sm font-label-sm">
        <span class="flex items-center gap-2 text-emerald-400 min-w-0">
          <span class="material-symbols-outlined text-[16px]">location_on</span>
          <span class="truncate">${esc(place.region)}</span>
        </span>
        <span class="flex items-center gap-3 text-slate-300 shrink-0">
          <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px] text-amber-400" style="font-variation-settings:'FILL' 1;">star</span>${formatRating(place.average_rating)}</span>
          <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">visibility</span>${place.views_count ?? 0}</span>
        </span>
      </div>
    </div>
  </article>`;
}

// One click handler for everything rendered from JS. Features from other files are used if loaded.
document.addEventListener("click", (e) => {
  const fav = e.target.closest("[data-fav-id]");
  if (fav) {
    e.stopPropagation();
    if (typeof toggleFavorite === "function") toggleFavorite(Number(fav.dataset.favId), fav.dataset.fav === "1");
    return;
  }
  const card = e.target.closest("[data-place-id]");
  if (card && typeof openPlace === "function") openPlace(Number(card.dataset.placeId));
});
