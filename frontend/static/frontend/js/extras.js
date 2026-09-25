// Places near me, my favorites, copying public travel lists and suggesting a new place.

// ---------- Nearby ----------

const DUSHANBE = { lat: 38.5598, lng: 68.787 };
const NEARBY_RADIUS_KM = 100;

async function showNearby({ lat, lng }, fallback = false) {
  const grid = $("#places-grid");
  document.getElementById("places").scrollIntoView();
  grid.innerHTML = skeletonCards(3);
  try {
    const data = await api(`/places/nearby/?lat=${lat}&lng=${lng}&radius=${NEARBY_RADIUS_KM}&page_size=12`);
    grid.innerHTML = data.results.map(placeCard).join("");
    $("#places-empty").classList.toggle("hidden", data.count > 0);
  } catch (err) {
    grid.innerHTML = "";
    toast(err.message, "error");
  }
  $("#load-more").classList.add("hidden");
  $("#places-title").textContent = fallback
    ? `Места рядом с Душанбе (до ${NEARBY_RADIUS_KM} км)`
    : `Места рядом с вами (до ${NEARBY_RADIUS_KM} км)`;
  $("#filter-reset").classList.remove("hidden");
  $("#filter-reset").classList.add("flex");
}

$("#nearby-btn").addEventListener("click", () => {
  const useDushanbe = () => {
    toast("Не удалось определить местоположение — показываем места рядом с Душанбе", "error");
    showNearby(DUSHANBE, true);
  };
  if (!navigator.geolocation) return useDushanbe();
  navigator.geolocation.getCurrentPosition(
    (pos) => showNearby({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }),
    useDushanbe,
    { timeout: 8000 }
  );
});

// ---------- Favorites ----------

async function openFavorites() {
  if (!requireLogin()) return;
  openModal('<div class="p-8 text-slate-400">Загрузка...</div>');
  let data;
  try {
    data = await api("/favorites/?page_size=50");
  } catch (err) {
    closeModal();
    return toast(err.message, "error");
  }

  const rows = data.results.map(({ place_detail: p }) => `
    <div class="flex items-center gap-4 bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-3 cursor-pointer transition-all" data-place-id="${p.id}">
      <div class="group relative w-16 h-16 shrink-0 rounded-lg overflow-hidden">${placeBackground(p)}</div>
      <div class="flex-1 min-w-0">
        <p class="text-body-md text-white font-semibold truncate">${esc(p.name)}</p>
        <p class="text-label-sm font-label-sm text-emerald-400 truncate">${esc(p.region)} · ★ ${formatRating(p.average_rating)}</p>
      </div>
      <button class="w-9 h-9 rounded-full text-rose-400 hover:bg-rose-500/10 flex items-center justify-center" data-fav-id="${p.id}" data-fav="1" title="Убрать из избранного" type="button">
        <span class="material-symbols-outlined text-[20px]" style="font-variation-settings:'FILL' 1;">favorite</span>
      </button>
    </div>`).join("");

  $("#modal-content").innerHTML = `
    <div class="p-8" id="favorites-box">
      <h2 class="text-headline-md font-headline-md text-white mb-1">Избранное</h2>
      <p class="text-body-sm text-slate-400 mb-6">${plural(data.count, ["место", "места", "мест"])}</p>
      <div class="space-y-3">${rows || '<p class="text-body-sm text-slate-400">Пока пусто. Нажмите ♥ на карточке места, чтобы добавить его сюда.</p>'}</div>
    </div>`;
}

// Refresh the favorites window after removing a place from it.
document.addEventListener("favorites-changed", () => {
  if ($("#favorites-box")) openFavorites();
});

// ---------- Copy a public travel list ----------

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy-list]");
  if (!btn || !requireLogin("Войдите, чтобы копировать маршруты")) return;
  btn.disabled = true;
  try {
    const list = await api(`/travel-lists/${btn.dataset.copyList}/copy/`, { method: "POST" });
    toast(`Маршрут «${list.title}» добавлен в ваши списки`);
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
  }
});

// ---------- Suggest a place ----------

const SUGGESTION_STATUSES = {
  pending: ["На проверке", "text-amber-300 bg-amber-500/15 border-amber-500/30"],
  approved: ["Одобрено", "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"],
  rejected: ["Отклонено", "text-rose-300 bg-rose-500/15 border-rose-500/30"],
};

async function openSuggest() {
  if (!requireLogin("Войдите, чтобы предложить место")) return;
  const name = $("#footer-suggest-name").value.trim();
  const field = "w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700/80 text-body-md text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400";
  const label = (text) => `<span class="block text-label-md font-label-md text-slate-300 mb-1.5">${text}</span>`;

  const [regions, cats, mine] = await Promise.all([
    api("/regions/?page_size=100").then((d) => d.results).catch(() => []),
    api("/categories/?page_size=100").then((d) => d.results).catch(() => []),
    api("/suggestions/?page_size=5").then((d) => d.results).catch(() => []),
  ]);
  const options = (items) => items.map((i) => `<option value="${i.id}">${esc(i.name)}</option>`).join("");

  openModal(`
  <div class="p-8">
    <h2 class="text-headline-md font-headline-md text-white mb-1">Предложить место</h2>
    <p class="text-body-sm text-slate-400 mb-6">После проверки администратором место появится на сайте.</p>
    <form class="space-y-4" id="suggest-form">
      <label class="block">${label("Название *")}<input class="${field}" name="name" required value="${esc(name)}"/></label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block">${label("Регион")}<select class="${field}" name="region"><option value="">—</option>${options(regions)}</select></label>
        <label class="block">${label("Категория")}<select class="${field}" name="category"><option value="">—</option>${options(cats)}</select></label>
      </div>
      <label class="block">${label("Адрес")}<input class="${field}" name="address" placeholder="Район, село или ориентир"/></label>
      <label class="block">${label("Описание")}<textarea class="${field}" name="description" rows="3" placeholder="Чем интересно это место?"></textarea></label>
      <label class="block">${label("Фото (jpg, png, webp, до 5 МБ)")}
        <input accept=".jpg,.jpeg,.png,.webp" class="block w-full text-body-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-800 file:text-emerald-300 hover:file:bg-slate-700" name="image" type="file"/>
      </label>
      <button class="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-label-md font-label-md transition-all disabled:opacity-60" type="submit">Отправить</button>
    </form>
    ${mine.length ? `
    <div class="border-t border-slate-800 mt-8 pt-6">
      <h3 class="text-label-md font-label-md text-emerald-400 uppercase tracking-widest mb-3">Мои предложения</h3>
      <div class="space-y-2">${mine.map((s) => {
        const [text, cls] = SUGGESTION_STATUSES[s.status] || [s.status, ""];
        return `<div class="flex items-center justify-between gap-3 text-body-sm">
          <span class="text-slate-200 truncate" title="${esc(s.admin_comment)}">${esc(s.name)}</span>
          <span class="shrink-0 px-2.5 py-0.5 rounded-full border text-label-sm font-label-sm ${cls}">${text}</span>
        </div>`;
      }).join("")}</div>
    </div>` : ""}
  </div>`);

  $("#suggest-form").addEventListener("submit", submitSuggestion);
}

async function submitSuggestion(e) {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  if (!data.get("image")?.size) data.delete("image");
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    await api("/suggestions/", { method: "POST", body: data });
    $("#footer-suggest-name").value = "";
    closeModal();
    toast("Спасибо! Ваше предложение отправлено на проверку.");
  } catch (err) {
    toast(err.message, "error");
    button.disabled = false;
  }
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-open-suggest]")) openSuggest();
});
