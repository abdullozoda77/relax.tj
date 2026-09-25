import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import Icon from "../components/Icon.jsx";
import PlaceBackground from "../components/PlaceBackground.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useUi } from "../context/UiContext.jsx";
import { SEASONS, distanceKm, formatDate, formatFee, plural } from "../utils.js";

// The 3D library is big, so it is loaded only when this page opens.
const RouteMap3D = lazy(() => import("../components/RouteMap3D.jsx"));

const card = "bg-surface-container-low/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl";

function Stat({ icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"}`}>
        <Icon name={icon} className="text-[22px]" />
      </div>
      <div className="flex flex-col">
        <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">{label}</span>
        <span className="text-body-lg font-semibold text-on-surface">{value}</span>
      </div>
    </div>
  );
}

// Public page of a travel list: /lists/5. Anyone can open a public list, the owner can also mark visited places.
export default function TravelListPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { openPlace, requireLogin } = useUi();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api(`/travel-lists/${id}/`)
      .then(setList)
      .catch((err) => setError(err.status === 404 ? "Маршрут не найден или он закрыт автором." : err.message));
  }, [id]);
  useEffect(load, [load]);

  const items = useMemo(() => (list ? [...list.items].sort((a, b) => a.order - b.order || a.id - b.id) : []), [list]);
  // Distance from the previous stop, and the total length of the route (straight lines between stops).
  const legs = useMemo(
    () =>
      items.map((item, i) => {
        const prev = items[i - 1]?.place_detail;
        const cur = item.place_detail;
        return prev && prev.latitude && cur.latitude ? distanceKm(prev.latitude, prev.longitude, cur.latitude, cur.longitude) : null;
      }),
    [items]
  );
  const total = legs.reduce((sum, d) => sum + (d || 0), 0);
  const points = useMemo(
    () =>
      items
        .filter((i) => i.place_detail.latitude && i.place_detail.longitude)
        .map((i) => ({ id: i.place, name: i.place_detail.name, lat: Number(i.place_detail.latitude), lng: Number(i.place_detail.longitude), visited: i.is_visited })),
    [items]
  );

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-6 py-32 text-center">
        <Icon name="route" className="text-secondary text-[48px]" />
        <h1 className="font-headline-md text-headline-md text-on-surface mt-4 mb-6">{error}</h1>
        <Link className="text-primary hover:underline" to="/#lists">
          ← К маршрутам
        </Link>
      </div>
    );
  }
  if (!list) return <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12"><div className="h-96 rounded-2xl bg-surface-container-low animate-pulse" /></div>;

  const isOwner = user?.id === list.user.id;
  const visited = items.filter((i) => i.is_visited).length;
  const maxAltitude = Math.max(0, ...items.map((i) => i.place_detail.altitude || 0));

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Ссылка на маршрут скопирована");
    } catch {
      toast(window.location.href);
    }
  }

  async function copy() {
    if (!requireLogin("Войдите, чтобы скопировать маршрут")) return;
    try {
      const copyList = await api(`/travel-lists/${list.id}/copy/`, { method: "POST" });
      toast(`Маршрут «${copyList.title}» добавлен в ваши списки`);
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function toggleVisited(item) {
    try {
      await api(`/travel-list-places/${item.id}/toggle-visited/`, { method: "POST" });
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <div className="flex flex-col w-full bg-surface">
      <section className="relative w-full overflow-hidden bg-surface-container-lowest py-8 md:py-12">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-wrap items-center gap-3 text-label-sm font-label-sm text-outline mb-4">
            <Link className="text-on-surface-variant hover:text-primary flex items-center gap-1.5" to={isOwner ? "/profile" : "/#lists"}>
              <Icon name="arrow_back" className="text-[16px]" /> {isOwner ? "Мой профиль" : "Маршруты"}
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="text-primary">{list.title}</span>
            <span className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${list.is_public ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary/10 text-secondary border-secondary/20"}`}>
              <Icon name={list.is_public ? "public" : "lock"} className="text-[14px]" />
              {list.is_public ? "Открытый маршрут" : "Виден только вам"}
            </span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl md:text-headline-xl font-headline-xl text-on-surface tracking-tight">{list.title}</h1>
              {list.description && <p className="text-body-lg text-on-surface-variant max-w-3xl">{list.description}</p>}
              <p className="text-label-md font-label-md text-on-surface-variant flex items-center gap-2">
                <Icon name="person" className="text-[16px] text-primary" /> @{list.user.username} · обновлён {formatDate(list.updated_at)}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="bg-surface-container-high hover:bg-surface-bright text-on-surface text-body-sm px-4 py-2.5 rounded-lg flex items-center gap-1.5" onClick={share} type="button">
                <Icon name="share" className="text-[18px]" /> Поделиться
              </button>
              {!isOwner && (
                <button className="bg-primary hover:bg-tertiary-container text-on-primary font-semibold text-body-sm px-4 py-2.5 rounded-lg flex items-center gap-1.5" onClick={copy} type="button">
                  <Icon name="content_copy" className="text-[18px]" /> Скопировать себе
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full py-8 flex flex-col gap-8">
        <div className="bg-surface-container-low/80 rounded-2xl p-6 shadow-lg grid grid-cols-2 md:grid-cols-4 gap-6">
          <Stat icon="location_on" label="Мест" value={items.length} />
          <Stat accent icon="straighten" label="Длина по прямой" value={`${Math.round(total)} км`} />
          <Stat icon="altitude" label="Самая высокая точка" value={maxAltitude ? `${maxAltitude} м` : "—"} />
          <Stat accent icon="flag" label="Посещено" value={`${visited} из ${items.length}`} />
        </div>

        {points.length > 0 && (
          <section className={`${card} flex flex-col gap-4`}>
            <div>
              <span className="text-label-sm font-label-sm text-primary uppercase tracking-wider">3D-карта</span>
              <h2 className="text-headline-md font-headline-md text-on-surface">Маршрут на карте</h2>
            </div>
            <Suspense fallback={<div className="h-[420px] rounded-xl bg-surface-container-lowest animate-pulse" />}>
              <RouteMap3D onSelect={openPlace} points={points} />
            </Suspense>
          </section>
        )}

        <section className={`${card} flex flex-col gap-4`}>
          <h2 className="text-headline-md font-headline-md text-on-surface">Остановки</h2>
          {items.length === 0 && <p className="text-body-md text-on-surface-variant">В маршруте пока нет мест.</p>}
          <ol className="flex flex-col">
            {items.map((item, i) => {
              const p = item.place_detail;
              return (
                <li key={item.id} className="flex flex-col">
                  {legs[i] !== null && (
                    <div className="flex items-center gap-2 pl-5 py-1 text-label-sm font-label-sm text-outline">
                      <span className="w-px h-5 bg-outline-variant ml-[3px]" />
                      <Icon name="south" className="text-[14px]" /> {Math.round(legs[i])} км
                    </div>
                  )}
                  <div className="flex items-center gap-4 bg-surface-container-lowest/60 rounded-xl p-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${item.is_visited ? "bg-primary text-on-primary" : "bg-secondary text-on-secondary-container"}`}>
                      {i + 1}
                    </span>
                    <button className="group relative w-20 h-14 rounded-lg overflow-hidden shrink-0" onClick={() => openPlace(item.place)} type="button">
                      <PlaceBackground place={p} />
                    </button>
                    <button className="flex-1 min-w-0 text-left" onClick={() => openPlace(item.place)} type="button">
                      <span className="block font-title-md text-title-md text-on-surface truncate hover:text-primary">{p.name}</span>
                      <span className="block text-label-sm font-label-sm text-on-surface-variant truncate">
                        {p.region} · {SEASONS[p.best_season]} · {formatFee(p.entrance_fee)}
                        {p.altitude ? ` · ${p.altitude} м` : ""}
                      </span>
                      {item.note && <span className="block text-body-sm text-on-surface-variant italic truncate">«{item.note}»</span>}
                    </button>
                    {isOwner ? (
                      <button
                        className={`shrink-0 text-body-sm px-3 py-2 rounded-lg flex items-center gap-1.5 ${item.is_visited ? "bg-primary/15 text-primary" : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"}`}
                        onClick={() => toggleVisited(item)}
                        type="button"
                      >
                        <Icon name={item.is_visited ? "check_circle" : "radio_button_unchecked"} className="text-[18px]" />
                        <span className="hidden sm:inline">{item.is_visited ? "Посещено" : "Отметить"}</span>
                      </button>
                    ) : (
                      item.is_visited && <Icon name="check_circle" className="text-primary text-[22px] shrink-0" />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {items.length > 0 && (
            <p className="text-label-sm font-label-sm text-outline">
              {plural(items.length, ["остановка", "остановки", "остановок"])}, около {Math.round(total)} км по прямой. Реальная дорога обычно в 1,3–1,8 раза длиннее.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
