import { useEffect, useState } from "react";
import { api } from "../../api.js";
import Icon from "../Icon.jsx";
import { card } from "./ui.jsx";

const COUNTERS = [
  ["users", "Пользователи", "group"],
  ["places", "Все места", "location_on"],
  ["active_places", "Активные места", "visibility"],
  ["reviews", "Отзывы", "rate_review"],
  ["favorites", "В избранном", "favorite"],
  ["travel_lists", "Маршруты", "route"],
];

export default function StatsTab({ onOpenSuggestions }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api("/stats/").then(setStats).catch(() => setStats(false));
  }, []);

  if (stats === null) return <div className="h-64 rounded-xl bg-surface-container animate-pulse" />;
  if (stats === false) return <p className="text-on-surface-variant">Не удалось загрузить статистику.</p>;

  const maxPlaces = Math.max(1, ...stats.places_by_region.map((r) => r.places_total));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {COUNTERS.map(([key, label, icon]) => (
          <div key={key} className={`${card} flex flex-col gap-2`}>
            <Icon name={icon} className="text-primary text-[22px]" />
            <span className="text-3xl font-headline-md font-semibold text-on-surface">{stats[key]}</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={card}>
          <h3 className="font-title-md text-title-md text-on-surface mb-4">Предложения мест</h3>
          {[
            ["pending", "На проверке", "text-amber-300"],
            ["approved", "Одобрено", "text-emerald-300"],
            ["rejected", "Отклонено", "text-rose-300"],
          ].map(([key, label, color]) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-outline-variant/40 last:border-0">
              <span className="text-body-sm text-on-surface-variant">{label}</span>
              <span className={`font-title-md text-title-md ${color}`}>{stats.suggestions[key]}</span>
            </div>
          ))}
          {stats.suggestions.pending > 0 && (
            <button className="mt-4 text-label-md font-label-md text-primary hover:underline" onClick={onOpenSuggestions} type="button">
              Проверить предложения →
            </button>
          )}
        </div>

        <div className={card}>
          <h3 className="font-title-md text-title-md text-on-surface mb-4">Места по регионам</h3>
          <div className="flex flex-col gap-3">
            {stats.places_by_region.map((r) => (
              <div key={r.id}>
                <div className="flex justify-between text-body-sm text-on-surface-variant mb-1">
                  <span>{r.name}</span>
                  <span className="text-on-surface">{r.places_total}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(r.places_total * 100) / maxPlaces}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={card}>
          <h3 className="font-title-md text-title-md text-on-surface mb-4">Лучшие по рейтингу</h3>
          {stats.top_places.length === 0 && <p className="text-body-sm text-on-surface-variant">Пока нет отзывов.</p>}
          {stats.top_places.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 py-2 border-b border-outline-variant/40 last:border-0">
              <span className="w-6 text-secondary font-semibold">{i + 1}</span>
              <span className="flex-1 text-body-sm text-on-surface truncate">{p.name}</span>
              <span className="text-body-sm text-secondary">★ {p.average_rating}</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">({p.reviews})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
