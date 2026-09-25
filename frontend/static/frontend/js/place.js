// Place details window: info, favorite button, reviews with rating summary and similar places.

function infoChip(icon, text) {
  return `<span class="flex items-center gap-1.5 bg-slate-950/70 border border-slate-700/60 px-3 py-1.5 rounded-lg text-body-sm text-slate-200">
    <span class="material-symbols-outlined text-[18px] text-emerald-400">${icon}</span>${esc(text)}</span>`;
}

function stars(rating, size = 16) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="material-symbols-outlined text-amber-400" style="font-size:${size}px;font-variation-settings:'FILL' ${i < Math.round(rating) ? 1 : 0};">star</span>`
  ).join("");
}

function favoriteButton(place) {
  return `
    <button class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md font-label-md border transition-all ${
      place.is_favorite
        ? "bg-rose-500/15 border-rose-400/40 text-rose-300"
        : "bg-slate-800 border-slate-700 text-slate-200 hover:border-rose-400/40"
    }" data-fav-id="${place.id}" data-fav="${place.is_favorite ? 1 : 0}" type="button">
      <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' ${place.is_favorite ? 1 : 0};">favorite</span>
      ${place.is_favorite ? "В избранном" : "В избранное"}
    </button>`;
}

async function openPlace(id) {
  openModal('<div class="h-96 flex items-center justify-center text-slate-400">Загрузка...</div>', { wide: true });
  let place;
  try {
    place = await api(`/places/${id}/`);
  } catch (err) {
    closeModal();
    return toast(err.message, "error");
  }
  place.main_image = place.images[0]?.image || null;

  const mapLink = place.latitude && place.longitude
    ? `<a class="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-body-sm" target="_blank" rel="noopener"
         href="https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=12/${place.latitude}/${place.longitude}">
         <span class="material-symbols-outlined text-[18px]">map</span>Открыть на карте</a>`
    : "";
  const section = (title, text) => text
    ? `<div><h3 class="text-label-md font-label-md text-emerald-400 uppercase tracking-widest mb-2">${title}</h3>
       <p class="text-body-md text-slate-300 leading-relaxed whitespace-pre-line">${esc(text)}</p></div>`
    : "";

  $("#modal-content").innerHTML = `
  <div class="group relative h-72 overflow-hidden rounded-t-2xl">
    ${placeBackground(place, "rounded-t-2xl")}
    <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
    <div class="absolute bottom-0 left-0 right-0 p-8">
      <span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md px-3 py-1 rounded-full text-label-sm font-label-sm">${esc(place.category?.name || "Без категории")}</span>
      <h2 class="text-3xl font-headline-lg font-bold text-white mt-3">${esc(place.name)}</h2>
      <p class="flex items-center gap-1.5 text-emerald-400 text-label-md font-label-md mt-2">
        <span class="material-symbols-outlined text-[18px]">location_on</span>${esc(place.region.name)}${place.address ? ", " + esc(place.address) : ""}
      </p>
    </div>
  </div>

  <div class="p-8 space-y-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="text-headline-lg font-headline-lg text-white" id="place-rating">${formatRating(place.average_rating)}</span>
        <div>
          <div class="flex" id="place-stars">${stars(place.average_rating || 0, 18)}</div>
          <p class="text-body-sm text-slate-400" id="place-reviews-count">${plural(place.reviews_count, ["отзыв", "отзыва", "отзывов"])}</p>
        </div>
      </div>
      <div id="place-fav">${favoriteButton(place)}</div>
    </div>

    <div class="flex flex-wrap gap-2">
      ${infoChip("wb_sunny", SEASONS[place.best_season])}
      ${infoChip("payments", formatFee(place.entrance_fee))}
      ${place.altitude ? infoChip("elevation", `${place.altitude} м над уровнем моря`) : ""}
      ${infoChip("visibility", plural(place.views_count, ["просмотр", "просмотра", "просмотров"]))}
    </div>

    ${section("Описание", place.description)}
    ${section("Как добраться", place.how_to_get_there)}
    ${mapLink}

    ${place.activities.length ? `
    <div>
      <h3 class="text-label-md font-label-md text-emerald-400 uppercase tracking-widest mb-3">Чем заняться</h3>
      <div class="flex flex-wrap gap-2">${place.activities.map((a) =>
        `<span class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-label-sm font-label-sm">${esc(a.name)}</span>`).join("")}
      </div>
    </div>` : ""}

    ${place.images.length > 1 ? `
    <div class="grid grid-cols-3 gap-3">${place.images.slice(1, 7).map((img) =>
      `<a href="${esc(img.image)}" target="_blank" rel="noopener"><img alt="" class="h-28 w-full object-cover rounded-xl border border-slate-800" src="${esc(img.image)}"/></a>`).join("")}
    </div>` : ""}

    <div class="border-t border-slate-800 pt-8" id="reviews-box"></div>
    <div class="border-t border-slate-800 pt-8" id="similar-box"></div>
  </div>`;

  loadReviews(place.id);
  loadSimilar(place.id);
}

// ---------- Reviews ----------

async function loadReviews(placeId) {
  const box = $("#reviews-box");
  if (!box) return;
  let data;
  try {
    data = await api(`/places/${placeId}/reviews/?page_size=20`);
  } catch (err) {
    box.innerHTML = `<p class="text-slate-400">${esc(err.message)}</p>`;
    return;
  }

  const summary = data.rating_summary;
  const myReview = auth.user && data.results.find((r) => r.author.id === auth.user.id);
  // JS orders number-like keys ascending, so sort to show 5 stars first.
  const bars = Object.entries(summary.stars).sort((a, b) => b[0] - a[0]).map(([star, count]) => `
    <div class="flex items-center gap-2 text-body-sm text-slate-400">
      <span class="w-3">${star}</span>
      <div class="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
        <div class="h-full bg-amber-400 rounded-full" style="width:${summary.total ? (count * 100) / summary.total : 0}%"></div>
      </div>
      <span class="w-6 text-right">${count}</span>
    </div>`).join("");

  const reviews = data.results.map((r) => `
    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div class="flex items-center justify-between gap-3 mb-2">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold uppercase">${esc(r.author.username[0])}</span>
          <div>
            <p class="text-body-sm text-white font-semibold">${esc(r.author.username)}</p>
            <p class="text-label-sm font-label-sm text-slate-500">${new Date(r.created_at).toLocaleDateString("ru-RU")}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex">${stars(r.rating, 14)}</div>
          ${myReview && r.id === myReview.id ? `
          <button class="text-slate-500 hover:text-rose-400" data-delete-review="${r.id}" data-place="${placeId}" title="Удалить отзыв" type="button">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>` : ""}
        </div>
      </div>
      ${r.comment ? `<p class="text-body-sm text-slate-300 leading-relaxed">${esc(r.comment)}</p>` : ""}
    </div>`).join("");

  box.innerHTML = `
    <h3 class="text-headline-sm font-headline-sm text-white mb-6">Отзывы</h3>
    <div class="grid md:grid-cols-[180px_1fr] gap-6 mb-6">
      <div class="space-y-1.5">${bars}</div>
      <div>${myReview ? "" : reviewForm(placeId)}</div>
    </div>
    <div class="space-y-3">${reviews || '<p class="text-body-sm text-slate-400">Пока нет отзывов. Будьте первым!</p>'}</div>`;

  if ($("#place-rating")) {
    $("#place-rating").textContent = formatRating(summary.average);
    $("#place-stars").innerHTML = stars(summary.average || 0, 18);
    $("#place-reviews-count").textContent = plural(summary.total, ["отзыв", "отзыва", "отзывов"]);
  }
}

function reviewForm(placeId) {
  if (!auth.isLoggedIn()) {
    return `<div class="h-full flex flex-col items-start justify-center gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-5">
      <p class="text-body-sm text-slate-300">Были здесь? Войдите, чтобы оставить отзыв.</p>
      <button class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-label-md font-label-md" data-auth-tab="login" type="button">Войти</button>
    </div>`;
  }
  return `
  <form class="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3" data-place="${placeId}" id="review-form">
    <div class="flex items-center gap-1" id="star-picker">
      ${[1, 2, 3, 4, 5].map((n) =>
        `<button class="material-symbols-outlined text-[28px] text-slate-600 hover:text-amber-400 transition-colors" data-star="${n}" type="button">star</button>`).join("")}
      <span class="text-body-sm text-slate-400 ml-2">Ваша оценка</span>
    </div>
    <input name="rating" type="hidden" value=""/>
    <textarea class="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-body-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
      name="comment" placeholder="Расскажите, как вам это место" rows="3"></textarea>
    <button class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-5 py-2 rounded-lg text-label-md font-label-md disabled:opacity-60" type="submit">Отправить отзыв</button>
  </form>`;
}

function paintStars(value) {
  document.querySelectorAll("#star-picker [data-star]").forEach((btn) => {
    const on = Number(btn.dataset.star) <= value;
    btn.classList.toggle("text-amber-400", on);
    btn.classList.toggle("text-slate-600", !on);
    btn.style.fontVariationSettings = `'FILL' ${on ? 1 : 0}`;
  });
}

document.addEventListener("click", async (e) => {
  const star = e.target.closest("#star-picker [data-star]");
  if (star) {
    $("#review-form").rating.value = star.dataset.star;
    paintStars(Number(star.dataset.star));
    return;
  }

  const del = e.target.closest("[data-delete-review]");
  if (del && confirm("Удалить ваш отзыв?")) {
    try {
      await api(`/reviews/${del.dataset.deleteReview}/`, { method: "DELETE" });
      toast("Отзыв удалён");
      loadReviews(Number(del.dataset.place));
    } catch (err) {
      toast(err.message, "error");
    }
  }
});

document.addEventListener("submit", async (e) => {
  if (e.target.id !== "review-form") return;
  e.preventDefault();
  const form = e.target;
  const placeId = Number(form.dataset.place);
  if (!form.rating.value) return toast("Поставьте оценку от 1 до 5 звёзд", "error");

  form.querySelector("button[type=submit]").disabled = true;
  try {
    await api("/reviews/", {
      method: "POST",
      body: { place: placeId, rating: Number(form.rating.value), comment: form.comment.value.trim() },
    });
    toast("Спасибо за отзыв!");
    loadReviews(placeId);
  } catch (err) {
    toast(err.message, "error");
    form.querySelector("button[type=submit]").disabled = false;
  }
});

// ---------- Similar places ----------

async function loadSimilar(placeId) {
  const box = $("#similar-box");
  let places = [];
  try {
    places = await api(`/places/${placeId}/similar/`);
  } catch {
    // Similar places are optional, hide the block on error.
  }
  if (!box) return;
  if (!places.length) {
    box.remove();
    return;
  }
  box.innerHTML = `
    <h3 class="text-headline-sm font-headline-sm text-white mb-4">Похожие места</h3>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      ${places.slice(0, 6).map((p) => `
      <button class="group relative h-32 rounded-xl overflow-hidden border border-slate-800 hover:border-emerald-500/40 text-left" data-place-id="${p.id}" type="button">
        ${placeBackground(p)}
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>
        <div class="absolute bottom-0 p-3">
          <p class="text-body-sm text-white font-semibold">${esc(p.name)}</p>
          <p class="text-label-sm font-label-sm text-emerald-400">${esc(p.region)} · ★ ${formatRating(p.average_rating)}</p>
        </div>
      </button>`).join("")}
    </div>`;
}

// ---------- Favorites ----------

async function toggleFavorite(placeId, isFavorite) {
  if (!requireLogin("Войдите, чтобы добавлять места в избранное")) return;
  try {
    await api(`/places/${placeId}/favorite/`, { method: isFavorite ? "DELETE" : "POST" });
  } catch (err) {
    return toast(err.message, "error");
  }
  const nowFavorite = !isFavorite;
  toast(nowFavorite ? "Добавлено в избранное" : "Удалено из избранного");

  // Update every heart for this place on the page (cards and the details window).
  document.querySelectorAll(`[data-fav-id="${placeId}"]`).forEach((btn) => {
    btn.dataset.fav = nowFavorite ? "1" : "0";
    const icon = btn.querySelector(".material-symbols-outlined");
    icon.style.fontVariationSettings = `'FILL' ${nowFavorite ? 1 : 0}`;
    if (btn.closest("#place-fav")) {
      btn.outerHTML = favoriteButton({ id: placeId, is_favorite: nowFavorite });
    } else {
      btn.classList.toggle("text-rose-400", nowFavorite);
      btn.classList.toggle("text-slate-300", !nowFavorite);
    }
  });
  document.dispatchEvent(new CustomEvent("favorites-changed"));
}
