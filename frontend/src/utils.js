export const SEASONS = {
  spring: "Весна",
  summer: "Лето",
  autumn: "Осень",
  winter: "Зима",
  all_year: "Круглый год",
};

const CATEGORY_STYLES = {
  "Озёра": {
    icon: "water",
    gradient: "from-cyan-700 via-teal-900 to-slate-950",
    text: "Бирюзовые горные озёра Фанских гор и Памира — тишина, чистый воздух и отдых у воды.",
  },
  "Горы": {
    icon: "landscape",
    gradient: "from-slate-500 via-slate-800 to-slate-950",
    text: "Вершины, перевалы и горнолыжные склоны для тех, кто любит высоту.",
  },
  "Ущелья": {
    icon: "terrain",
    gradient: "from-amber-700 via-stone-800 to-slate-950",
    text: "Прохладные ущелья с реками и водопадами — лучшее место летом.",
  },
  "Курорты и санатории": {
    icon: "hot_tub",
    gradient: "from-emerald-600 via-teal-900 to-slate-950",
    text: "Горячие источники и санатории с минеральной водой для здоровья и восстановления.",
  },
  "Исторические места": {
    icon: "fort",
    gradient: "from-orange-700 via-stone-800 to-slate-950",
    text: "Древние крепости и памятники Великого шёлкового пути.",
  },
  "Парки": {
    icon: "park",
    gradient: "from-green-600 via-emerald-900 to-slate-950",
    text: "Парки и заповедники для прогулок, семейного отдыха и фотографий.",
  },
};

export function categoryStyle(name) {
  return (
    CATEGORY_STYLES[name] || {
      icon: "explore",
      gradient: "from-slate-700 via-slate-800 to-slate-950",
      text: "Интересные места для отдыха по всему Таджикистану.",
    }
  );
}

export function formatFee(fee) {
  const amount = Number(fee);
  return amount > 0 ? `${amount.toLocaleString("ru-RU")} сомони` : "Бесплатно";
}

export function formatRating(rating) {
  return rating ? Number(rating).toFixed(1) : "—";
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

// plural(5, ["отзыв", "отзыва", "отзывов"]) -> "5 отзывов"
export function plural(n, [one, few, many]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word =
    mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
  return `${n} ${word}`;
}

// Distance between two points on Earth in km (haversine formula), same as distance_km() in the backend.
export function distanceKm(lat1, lng1, lat2, lng2) {
  const rad = (d) => (Number(d) * Math.PI) / 180;
  const a = Math.sin((rad(lat2) - rad(lat1)) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin((rad(lng2) - rad(lng1)) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
