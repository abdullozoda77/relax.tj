import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { SEASONS } from "../../utils.js";
import Icon from "../Icon.jsx";
import PlaceCard, { SkeletonCards } from "../PlaceCard.jsx";

const ORDERING = [
  ["-created_at", "Сначала новые"],
  ["-avg_rating", "По рейтингу"],
  ["-favorites_total", "Популярные"],
  ["-views_count", "Самые просматриваемые"],
  ["entrance_fee", "Сначала дешёвые"],
];

const select =
  "bg-slate-900 border border-slate-700/80 rounded-lg text-body-sm text-white py-2 pl-3 pr-8 focus:ring-emerald-400 focus:border-emerald-400";

function buildQuery(filters, page) {
  const params = new URLSearchParams({ page, page_size: 9, ordering: filters.ordering });
  if (filters.search) params.set("search", filters.search);
  if (filters.region) params.set("region", filters.region);
  if (filters.category) params.set("category", filters.category);
  if (filters.best_season) params.set("best_season", filters.best_season);
  if (filters.is_free) params.set("is_free", "true");
  return params.toString();
}

export default function PlacesSection({ filters, setFilters, onReset, regions, categories, onOpenPlace }) {
  const [places, setPlaces] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the first page again whenever filters change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api(`/places/?${buildQuery(filters, 1)}`)
      .then((data) => {
        if (cancelled) return;
        setPlaces(data.results);
        setHasMore(Boolean(data.next));
        setPage(1);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters]);

  async function loadMore() {
    const data = await api(`/places/?${buildQuery(filters, page + 1)}`);
    setPlaces((prev) => [...prev, ...data.results]);
    setHasMore(Boolean(data.next));
    setPage(page + 1);
  }

  const update = (changes) => setFilters((prev) => ({ ...prev, ...changes }));
  const active = filters.search || filters.region || filters.category || filters.best_season || filters.is_free;

  const chip = (id, name) => {
    const on = String(filters.category) === String(id);
    return (
      <button
        key={id || "all"}
        className={`px-4 py-1.5 rounded-full text-label-md font-label-md border transition-all ${
          on
            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            : "bg-slate-900 text-slate-300 border-slate-700/80 hover:border-emerald-500/40"
        }`}
        onClick={() => update({ category: id })}
        type="button"
      >
        {name}
      </button>
    );
  };

  return (
    <section className="py-24 px-6 lg:px-12 bg-[#0b1117] relative scroll-mt-20" id="places">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <span className="text-label-md font-label-md text-emerald-400 uppercase tracking-widest mb-2 block">Куда поехать</span>
            <h2 className="text-3xl md:text-headline-lg font-headline-lg text-white">
              {filters.search ? `Результаты поиска: «${filters.search}»` : "Лучшие места для отдыха"}
            </h2>
          </div>
          <p className="text-body-md text-slate-400 max-w-md">
            Выбирайте по региону, категории и сезону. Нажмите на карточку, чтобы увидеть подробности и отзывы.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center mb-6">
          <select className={select} onChange={(e) => update({ region: e.target.value })} value={filters.region}>
            <option value="">Все регионы</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select className={select} onChange={(e) => update({ best_season: e.target.value })} value={filters.best_season}>
            <option value="">Любой сезон</option>
            {Object.entries(SEASONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className={select} onChange={(e) => update({ ordering: e.target.value })} value={filters.ordering}>
            {ORDERING.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-body-sm text-slate-300 cursor-pointer select-none">
            <input
              checked={filters.is_free}
              className="rounded bg-slate-900 border-slate-600 text-emerald-500 focus:ring-emerald-400"
              onChange={(e) => update({ is_free: e.target.checked })}
              type="checkbox"
            />
            Только бесплатные
          </label>
          {active && (
            <button className="flex text-body-sm text-amber-400 hover:text-amber-300 items-center gap-1" onClick={onReset} type="button">
              <Icon name="close" className="text-[18px]" /> Сбросить
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mb-10">
          {chip("", "Все")}
          {categories.map((c) => chip(c.id, c.name))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? <SkeletonCards /> : places.map((p) => <PlaceCard key={p.id} onOpen={onOpenPlace} place={p} />)}
        </div>
        {error && <p className="text-center text-rose-300 py-16">{error}</p>}
        {!loading && !error && places.length === 0 && (
          <p className="text-center text-slate-400 py-16">Ничего не найдено. Попробуйте изменить фильтры.</p>
        )}
        {hasMore && !loading && (
          <div className="flex justify-center mt-12">
            <button
              className="bg-slate-900 border border-slate-700 hover:border-emerald-500/40 text-emerald-300 px-8 py-3 rounded-xl text-label-md font-label-md transition-all"
              onClick={loadMore}
              type="button"
            >
              Показать ещё
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
