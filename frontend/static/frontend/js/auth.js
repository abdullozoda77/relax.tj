// Login, registration, logout and the user menu in the header.

const inputClass = "w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700/80 text-body-md text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400";

function authField(name, label, type = "text", extra = "") {
  return `
  <label class="block">
    <span class="block text-label-md font-label-md text-slate-300 mb-1.5">${label}</span>
    <input class="${inputClass}" name="${name}" type="${type}" ${extra}/>
  </label>`;
}

function openAuth(tab = "login") {
  const isLogin = tab === "login";
  const tabClass = (active) => active
    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
    : "text-slate-400 hover:text-white border border-transparent";

  openModal(`
  <div class="p-8">
    <h2 class="text-headline-md font-headline-md text-white mb-1">${isLogin ? "С возвращением!" : "Создать аккаунт"}</h2>
    <p class="text-body-sm text-slate-400 mb-6">${isLogin ? "Войдите, чтобы добавлять места в избранное и писать отзывы." : "Регистрация займёт меньше минуты."}</p>
    <div class="flex gap-2 mb-6 bg-slate-950 p-1 rounded-xl">
      <button class="flex-1 py-2 rounded-lg text-label-md font-label-md transition-all ${tabClass(isLogin)}" data-auth-tab="login" type="button">Вход</button>
      <button class="flex-1 py-2 rounded-lg text-label-md font-label-md transition-all ${tabClass(!isLogin)}" data-auth-tab="register" type="button">Регистрация</button>
    </div>
    <form class="space-y-4" id="auth-form">
      ${authField("username", "Имя пользователя", "text", 'required autocomplete="username"')}
      ${isLogin ? "" : authField("email", "Email", "email", 'autocomplete="email"')}
      ${authField("password", "Пароль", "password", `required autocomplete="${isLogin ? "current-password" : "new-password"}"`)}
      ${isLogin ? "" : authField("password2", "Повторите пароль", "password", 'required autocomplete="new-password"')}
      <p class="hidden text-body-sm text-red-300 bg-red-950/60 border border-red-900 rounded-lg px-4 py-2.5" id="auth-error"></p>
      <button class="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-label-md font-label-md transition-all disabled:opacity-60" type="submit">
        ${isLogin ? "Войти" : "Зарегистрироваться"}
      </button>
    </form>
  </div>`);

  $("#auth-form").addEventListener("submit", (e) => submitAuth(e, isLogin));
  $("#auth-form input").focus();
}

async function submitAuth(e, isLogin) {
  e.preventDefault();
  const form = e.target;
  const button = form.querySelector("button[type=submit]");
  const body = Object.fromEntries(new FormData(form));
  button.disabled = true;

  try {
    if (isLogin) {
      auth.save(await api("/auth/login/", { method: "POST", body }));
      auth.save({}, await api("/auth/profile/"));
    } else {
      const data = await api("/auth/register/", { method: "POST", body });
      auth.save(data.tokens, data.user);
    }
    closeModal();
    toast(isLogin ? `Добро пожаловать, ${auth.user.username}!` : "Аккаунт создан. Добро пожаловать!");
    document.dispatchEvent(new Event("auth-changed"));
  } catch (err) {
    const box = $("#auth-error");
    box.textContent = err.status === 401 ? "Неверное имя пользователя или пароль." : err.message;
    box.classList.remove("hidden");
  } finally {
    button.disabled = false;
  }
}

async function logout() {
  try {
    if (auth.refresh) await api("/auth/logout/", { method: "POST", body: { refresh: auth.refresh } });
  } catch {
    // The token may already be expired; we log out locally anyway.
  }
  auth.clear();
  toast("Вы вышли из аккаунта");
  document.dispatchEvent(new Event("auth-changed"));
}

// ---------- Header user button ----------

function renderUserArea() {
  const user = auth.user;
  const area = $("#user-area");
  if (!user) {
    area.innerHTML = `
      <button class="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-1.5 rounded-full text-label-md font-label-md transition-all shadow-md shadow-emerald-950" id="user-btn" type="button">
        <span class="material-symbols-outlined text-[18px]">person</span> Войти
      </button>`;
    return;
  }
  area.innerHTML = `
    <button class="flex items-center gap-2 text-slate-200 hover:text-white" id="user-btn" type="button">
      <span class="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center uppercase shadow-md shadow-emerald-950">${esc(user.username[0])}</span>
      <span class="hidden lg:inline text-body-sm">${esc(user.username)}</span>
      <span class="material-symbols-outlined text-[18px]">expand_more</span>
    </button>
    <div class="hidden absolute right-0 top-12 w-56 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-2" id="user-menu">
      <div class="px-4 py-2 border-b border-slate-800 mb-1">
        <p class="text-body-sm text-white font-semibold truncate">${esc(user.username)}</p>
        <p class="text-label-sm font-label-sm text-slate-400 truncate">${esc(user.email || (user.role === "admin" ? "Администратор" : "Путешественник"))}</p>
      </div>
      <button class="w-full text-left px-4 py-2 text-body-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-300 flex items-center gap-2" data-menu="favorites" type="button">
        <span class="material-symbols-outlined text-[18px]">favorite</span> Избранное
      </button>
      <button class="w-full text-left px-4 py-2 text-body-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-300 flex items-center gap-2" data-open-suggest type="button">
        <span class="material-symbols-outlined text-[18px]">add_location_alt</span> Предложить место
      </button>
      ${user.role === "admin" || user.is_staff ? `
      <a class="w-full text-left px-4 py-2 text-body-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-300 flex items-center gap-2" href="/admin/">
        <span class="material-symbols-outlined text-[18px]">admin_panel_settings</span> Админка
      </a>` : ""}
      <button class="w-full text-left px-4 py-2 text-body-sm text-rose-300 hover:bg-slate-800 flex items-center gap-2 border-t border-slate-800 mt-1" data-menu="logout" type="button">
        <span class="material-symbols-outlined text-[18px]">logout</span> Выйти
      </button>
    </div>`;
}

document.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-auth-tab]");
  if (tab) return openAuth(tab.dataset.authTab);

  const menu = $("#user-menu");
  if (e.target.closest("#user-btn")) {
    if (!auth.isLoggedIn()) return openAuth("login");
    menu.classList.toggle("hidden");
    return;
  }
  if (menu && !e.target.closest("#user-menu")) menu.classList.add("hidden");

  const item = e.target.closest("[data-menu]");
  if (!item) return;
  menu?.classList.add("hidden");
  if (item.dataset.menu === "logout") logout();
  if (item.dataset.menu === "favorites" && typeof openFavorites === "function") openFavorites();
});

document.addEventListener("auth-changed", renderUserArea);
renderUserArea();
