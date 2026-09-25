// Home page: stats, regions, categories, places with filters and public travel lists.

const filters = {
  search: "",
  region: "",
  category: "",
  best_season: "",
  ordering: "-created_at",
  is_free: false,
};
let placesPage = 1;
let categories = [];

function hasActiveFilters() {
  return Boolean(filters.search || filters.region || filters.category || filters.best_season || filters.is_free);
}

function placesQuery(page) {
  const params = new URLSearchParams({ page, page_size: 9, ordering: filters.ordering });
  if (filters.search) params.set("search", filters.search);
  if (filters.region) params.set("region", filters.region);
  if (filters.category) params.set("category", filters.category);
  if (filters.best_season) params.set("best_season", filters.best_season);
  if (filters.is_free) params.set("is_free", "true");
  return params.toString();
}

async function loadPlaces(reset = true) {
  if (reset) placesPage = 1;
  const grid = $("#places-grid");
  const moreBtn = $("#load-more");
  if (reset) grid.innerHTML = skeletonCards(3);

  try {
    const data = await api(`/places/?${placesQuery(placesPage)}`);
    const html = data.results.map(placeCard).join("");
    grid.innerHTML = reset ? html : grid.innerHTML + html;
    $("#places-empty").classList.toggle("hidden", data.count > 0);
    moreBtn.classList.toggle("hidden", !data.next);
  } catch (err) {
    grid.innerHTML = "";
    toast(err.message, "error");
  }

  $("#places-title").textContent = filters.search
    ? `Результаты поиска: «${filters.search}»`
    : "Лучшие места для отдыха";
  $("#filter-reset").classList.toggle("hidden", !hasActiveFilters());
  $("#filter-reset").classList.toggle("flex", hasActiveFilters());
  renderCategoryChips();
}

function skeletonCards(count) {
  return Array.from({ length: count }, () =>
    '<div class="rounded-2xl h-[420px] bg-slate-900/80 border border-slate-800 animate-pulse"></div>'
  ).join("");
}

async function loadStats() {
  const count = (path) => api(`${path}?page_size=1`).then((d) => d.count).catch(() => "—");
  const [places, regions, activities] = await Promise.all([count("/places/"), count("/regions/"), count("/activities/")]);
  $("#stat-places").textContent = places;
  $("#stat-regions").textContent = regions;
  $("#stat-activities").textContent = activities;
}

async function loadRegions() {
  try {
    const data = await api("/regions/?page_size=100");
    $("#filter-region").insertAdjacentHTML(
      "beforeend",
      data.results.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("")
    );
  } catch (err) {
    toast(err.message, "error");
  }
}

async function loadCategories() {
  try {
    categories = (await api("/categories/?page_size=100")).results;
  } catch (err) {
    toast(err.message, "error");
    return;
  }
  renderCategoryChips();
  $("#categories-grid").innerHTML = categories.map((c) => {
    const style = categoryStyle(c.name);
    return `
    <button class="text-left bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-emerald-500/40 p-8 rounded-2xl shadow-xl flex flex-col justify-between transition-all group" data-category="${c.id}" type="button">
      <div>
        <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
          <span class="material-symbols-outlined">${style.icon}</span>
        </div>
        <h3 class="text-headline-sm font-headline-sm text-white mb-3">${esc(c.name)}</h3>
        <p class="text-body-sm text-slate-300 mb-6 leading-relaxed">${esc(style.text)}</p>
      </div>
      <span class="flex items-center gap-2 text-amber-400 text-label-md font-label-md">
        Смотреть места <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
      </span>
    </button>`;
  }).join("");
}

function renderCategoryChips() {
  const chip = (id, name) => {
    const active = String(filters.category) === String(id);
    return `<button class="px-4 py-1.5 rounded-full text-label-md font-label-md border transition-all ${
      active
        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
        : "bg-slate-900 text-slate-300 border-slate-700/80 hover:border-emerald-500/40"
    }" data-category="${id}" type="button">${esc(name)}</button>`;
  };
  $("#category-chips").innerHTML = chip("", "Все") + categories.map((c) => chip(c.id, c.name)).join("");
}

async function loadPublicLists() {
  const grid = $("#lists-grid");
  try {
    const data = await api("/travel-lists/public/?page_size=3");
    $("#lists-empty").classList.toggle("hidden", data.count > 0);
    grid.innerHTML = data.results.map((list, i) => travelListCard(list, data.results.length === 3 && i === 1)).join("");
  } catch (err) {
    toast(err.message, "error");
  }
}

function travelListCard(list, highlighted) {
  const items = list.items.slice(0, 3).map((item) => `
    <li class="flex items-center gap-2.5">
      <span class="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
      <span>${esc(item.place_detail.name)}</span>
    </li>`).join("");
  const more = list.items.length > 3 ? `<li class="text-slate-400 pl-7">и ещё ${list.items.length - 3}</li>` : "";
  const box = highlighted
    ? "bg-slate-900/95 border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)] lg:-translate-y-2"
    : "bg-slate-900/90 border border-slate-800 hover:border-slate-700";
  return `
  <div class="${box} rounded-2xl p-8 shadow-xl flex flex-col justify-between relative transition-all">
    ${highlighted ? '<div class="absolute -top-3.5 right-8 bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded-full text-label-sm font-label-sm shadow-md">Популярный</div>' : ""}
    <div>
      <div class="flex justify-between items-start mb-6 gap-3">
        <span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-label-sm font-label-sm">${plural(list.places_count, ["место", "места", "мест"])}</span>
        <span class="text-body-sm text-slate-400 flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">person</span>${esc(list.user.username)}</span>
      </div>
      <h3 class="text-headline-md font-headline-md text-white mb-3">${esc(list.title)}</h3>
      <p class="text-body-sm text-slate-300 mb-6 leading-relaxed">${esc(list.description || "Маршрут без описания")}</p>
      <ul class="space-y-3 mb-8 text-body-sm text-slate-200">${items}${more}</ul>
    </div>
    <button class="w-full ${highlighted
      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
      : "bg-slate-800 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30"} transition-all py-3 rounded-xl text-label-md font-label-md"
      data-copy-list="${list.id}" type="button">Скопировать себе</button>
  </div>`;
}

// ---------- Events ----------

function setCategory(id) {
  filters.category = id;
  loadPlaces();
  document.getElementById("places").scrollIntoView();
}

document.addEventListener("click", (e) => {
  const category = e.target.closest("[data-category]");
  if (category) setCategory(category.dataset.category);

  const searchLink = e.target.closest("[data-search]");
  if (searchLink) {
    filters.search = searchLink.dataset.search;
    $("#search-input").value = filters.search;
    loadPlaces();
  }
});

let searchTimer;
$("#search-input").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    filters.search = e.target.value.trim();
    loadPlaces();
  }, 400);
});
$("#search-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("places").scrollIntoView();
});

$("#filter-region").addEventListener("change", (e) => { filters.region = e.target.value; loadPlaces(); });
$("#filter-season").addEventListener("change", (e) => { filters.best_season = e.target.value; loadPlaces(); });
$("#filter-ordering").addEventListener("change", (e) => { filters.ordering = e.target.value; loadPlaces(); });
$("#filter-free").addEventListener("change", (e) => { filters.is_free = e.target.checked; loadPlaces(); });

$("#filter-reset").addEventListener("click", () => {
  Object.assign(filters, { search: "", region: "", category: "", best_season: "", is_free: false });
  $("#search-input").value = "";
  $("#filter-region").value = "";
  $("#filter-season").value = "";
  $("#filter-free").checked = false;
  loadPlaces();
});

$("#load-more").addEventListener("click", () => {
  placesPage += 1;
  loadPlaces(false);
});

// Reload places when the user logs in or out, so hearts show the right state.
document.addEventListener("auth-changed", () => loadPlaces());

loadStats();
loadRegions();
loadCategories();
loadPlaces();
loadPublicLists();
