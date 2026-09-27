import { lang, locale, t } from "./i18n.js";
export const SEASONS = {
  spring: t("Весна"),
  summer: t("Лето"),
  autumn: t("Осень"),
  winter: t("Зима"),
  all_year: t("Круглый год"),
};

const CATEGORY_STYLES = {
  "Озёра": {
    icon: "water",
    gradient: "from-cyan-700 via-teal-900 to-slate-950",
    text: t("Бирюзовые горные озёра Фанских гор и Памира — тишина, чистый воздух и отдых у воды."),
  },
  "Горы": {
    icon: "landscape",
    gradient: "from-slate-500 via-slate-800 to-slate-950",
    text: t("Вершины, перевалы и горнолыжные склоны для тех, кто любит высоту."),
  },
  "Ущелья": {
    icon: "terrain",
    gradient: "from-amber-700 via-stone-800 to-slate-950",
    text: t("Прохладные ущелья с реками и водопадами — лучшее место летом."),
  },
  "Курорты и санатории": {
    icon: "hot_tub",
    gradient: "from-emerald-600 via-teal-900 to-slate-950",
    text: t("Горячие источники и санатории с минеральной водой для здоровья и восстановления."),
  },
  "Исторические места": {
    icon: "fort",
    gradient: "from-orange-700 via-stone-800 to-slate-950",
    text: t("Древние крепости и памятники Великого шёлкового пути."),
  },
  "Парки": {
    icon: "park",
    gradient: "from-green-600 via-emerald-900 to-slate-950",
    text: t("Парки и заповедники для прогулок, семейного отдыха и фотографий."),
  },
  "Музеи": {
    icon: "museum",
    gradient: "from-violet-700 via-slate-800 to-slate-950",
    text: t("Музеи, дворцы и памятники — история и культура Таджикистана."),
  },
  "Долины": {
    icon: "forest",
    gradient: "from-lime-700 via-emerald-900 to-slate-950",
    text: t("Горные долины с кишлаками, садами и пастбищами — настоящая жизнь в горах."),
  },
  "Перевалы и дороги": {
    icon: "route",
    gradient: "from-sky-700 via-slate-800 to-slate-950",
    text: t("Высокогорные перевалы и легендарные дороги вроде Памирского тракта."),
  },
};

export function categoryStyle(name) {
  return (
    CATEGORY_STYLES[name] || {
      icon: "explore",
      gradient: "from-slate-700 via-slate-800 to-slate-950",
      text: t("Интересные места для отдыха по всему Таджикистану."),
    }
  );
}

export function formatFee(fee) {
  const amount = Number(fee);
  return amount > 0 ? t("{0} сомони", amount.toLocaleString(locale())) : t("Бесплатно");
}

export function formatRating(rating) {
  return rating ? Number(rating).toFixed(1) : "—";
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" });
}

// plural(5, ["отзыв", "отзыва", "отзывов"]) -> "5 отзывов". Words come translated through t().
// Russian has three forms, English two (1 review / 5 reviews), Tajik keeps the noun singular after numbers.
export function plural(n, [one, few, many]) {
  if (lang === "tg") return `${n} ${one}`;
  if (lang === "en") return `${n} ${n === 1 ? one : many}`;
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

// Travel time from minutes: "45 мин", "3 ч 29 мин", "1 д 5 ч".
export function formatDuration(minutes) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return t("{0} мин", m);
  const days = Math.floor(m / 1440);
  const hours = Math.floor((m % 1440) / 60);
  if (days) return hours ? t("{0} д {1} ч", days, hours) : t("{0} д", days);
  return m % 60 ? t("{0} ч {1} мин", hours, m % 60) : t("{0} ч", hours);
}

// Ways to travel a route: the router profile, the Google Maps travel mode and the line colour on the map.
export const TRAVEL_MODES = [
  { id: "car", icon: "directions_car", label: t("На машине"), google: "driving", color: "#f59e0b" },
  { id: "foot", icon: "directions_walk", label: t("Пешком"), google: "walking", color: "#10b981" },
  { id: "bike", icon: "directions_bike", label: t("На велосипеде"), google: "bicycling", color: "#0ea5e9" },
];

// A box around Tajikistan, the same as in the backend (places/geo.py). It gives a quick hint on the map;
// the server checks the exact border when a place is sent.
export const TAJIKISTAN_BOX = { lat: [36.6, 41.1], lng: [67.3, 75.2] };
export const inTajikistanBox = ({ lat, lng }) =>
  lat >= TAJIKISTAN_BOX.lat[0] && lat <= TAJIKISTAN_BOX.lat[1] && lng >= TAJIKISTAN_BOX.lng[0] && lng <= TAJIKISTAN_BOX.lng[1];

// Google Maps turn-by-turn directions through the points ({ lat, lng }) in order.
export function googleMapsUrl(points, mode) {
  const at = (p) => `${p.lat},${p.lng}`;
  const q = new URLSearchParams({ api: "1", origin: at(points[0]), destination: at(points[points.length - 1]), travelmode: mode.google });
  if (points.length > 2) q.set("waypoints", points.slice(1, -1).map(at).join("|"));
  return `https://www.google.com/maps/dir/?${q}`;
}
