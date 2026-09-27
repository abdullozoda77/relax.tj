import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { formatDate, plural } from "../../utils.js";
import Icon from "../Icon.jsx";
import PlaceBackground from "../PlaceBackground.jsx";
import { t } from "../../i18n.js";

const input =
  "px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-body-sm text-on-surface placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary";
const secondaryBtn =
  "bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-body-md px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all";

// A new route is made only from places on the site (all in Tajikistan): from one place to another.
// Its name is made from them, "Искандеркуль → Семь озёр"; more stops can be added in between later.
function NewRouteForm({ places, onCreated }) {
  const toast = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const sorted = [...places].sort((a, b) => a.name.localeCompare(b.name));

  async function submit(e) {
    e.preventDefault();
    const start = places.find((p) => p.id === Number(from));
    const end = places.find((p) => p.id === Number(to));
    if (!start || !end) return;
    if (start.id === end.id) return toast(t("Выберите два разных места."), "error");
    setBusy(true);
    try {
      const list = await api("/travel-lists/", { method: "POST", body: { title: `${start.name} → ${end.name}`, is_public: false } });
      await api(`/travel-lists/${list.id}/add-place/`, { method: "POST", body: { place: start.id, order: 0 } });
      await api(`/travel-lists/${list.id}/add-place/`, { method: "POST", body: { place: end.id, order: 1 } });
      toast(t("Маршрут «{0}» создан", list.title));
      setFrom("");
      setTo("");
      onCreated(list.id);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  const choose = (value, onChange, placeholder) => (
    <select className={`${input} flex-1 min-w-0`} onChange={(e) => onChange(e.target.value)} required value={value}>
      <option value="">{placeholder}</option>
      {sorted.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );

  return (
    <form className="flex flex-col sm:flex-row sm:items-center gap-2" onSubmit={submit}>
      {choose(from, setFrom, t("Откуда"))}
      <Icon name="arrow_forward" className="hidden sm:block text-outline text-[20px] shrink-0" />
      {choose(to, setTo, t("Куда"))}
      <button
        className="bg-primary hover:bg-tertiary-container text-on-primary font-title-md text-body-md px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        <Icon name="add_road" className="text-[18px]" /> {t("Создать")}
      </button>
    </form>
  );
}

// The user's travel lists in the profile: the selected list with its places, visited marks and actions.
export default function RouteCard({ onChanged }) {
  const toast = useToast();
  const [lists, setLists] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [allPlaces, setAllPlaces] = useState([]);
  const [placeToAdd, setPlaceToAdd] = useState("");

  const load = useCallback(
    (selectId) =>
      api("/travel-lists/?page_size=50").then((data) => {
        setLists(data.results);
        setSelectedId((prev) => selectId ?? (data.results.some((l) => l.id === prev) ? prev : data.results[0]?.id));
      }),
    []
  );

  useEffect(() => {
    load().catch((err) => toast(err.message, "error"));
    api("/places/?page_size=100&ordering=name").then((d) => setAllPlaces(d.results)).catch(() => {});
  }, [load, toast]);

  // Runs an API action, then reloads the lists and the user's stats.
  async function run(action, message) {
    try {
      await action();
      if (message) toast(message);
      await load();
      onChanged?.();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  if (!lists) return <div className="bg-surface-container rounded-xl p-8 shadow-xl h-96 animate-pulse" />;

  const list = lists.find((l) => l.id === selectedId);
  const items = list?.items || [];
  const cover = items[0]?.place_detail;
  const available = allPlaces.filter((p) => !items.some((i) => i.place === p.id));

  // A new stop goes before the destination, so the route stays "start → stops → destination".
  async function addStop(placeId) {
    const destination = items.length >= 2 ? items[items.length - 1] : null;
    if (!destination) return api(`/travel-lists/${list.id}/add-place/`, { method: "POST", body: { place: placeId } });
    await api(`/travel-list-places/${destination.id}/`, { method: "PATCH", body: { order: destination.order + 1 } });
    return api(`/travel-lists/${list.id}/add-place/`, { method: "POST", body: { place: placeId, order: destination.order } });
  }

  return (
    <div className="bg-surface-container rounded-xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
      {lists.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {lists.map((l) => (
            <button
              key={l.id}
              className={`px-3 py-1 rounded-full text-label-sm font-label-sm border transition-all ${
                l.id === selectedId ? "bg-primary/15 text-primary border-primary/40" : "text-on-surface-variant border-outline-variant hover:text-on-surface"
              }`}
              onClick={() => setSelectedId(l.id)}
              type="button"
            >
              {t(l.title)}
            </button>
          ))}
        </div>
      )}

      {!list ? (
        <div className="flex flex-col gap-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">{t("У вас пока нет маршрутов")}</h2>
          <p className="text-body-md text-on-surface-variant">{t("Создайте список мест, которые хотите посетить, и отмечайте, где уже были.")}</p>
          <NewRouteForm onCreated={(id) => run(() => load(id))} places={allPlaces} />
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
            <div>
              <h2 className="font-headline-lg text-3xl md:text-headline-lg text-on-surface">{t(list.title)}</h2>
              {list.description && <p className="text-body-sm text-on-surface-variant mt-1">{t(list.description)}</p>}
            </div>
          </div>

          <div className="group relative w-full h-56 rounded-xl overflow-hidden shadow-inner my-2">
            {cover ? <PlaceBackground place={cover} /> : <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-950" />}
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/30 to-transparent flex flex-col justify-end p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon name="calendar_today" className="text-primary text-[20px]" />
                  <span className="font-label-md text-label-md text-on-surface font-semibold">{t("Создан")} {formatDate(list.created_at)}</span>
                  <span className="text-outline">·</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{plural(items.length, [t("место"), t("места"), t("мест")])}</span>
                </div>
                <div className="flex items-center gap-2 bg-surface-container-high/90 backdrop-blur-md px-3 py-1 rounded-full">
                  <Icon name={list.is_public ? "public" : "lock"} className="text-secondary text-[16px]" />
                  <span className="font-label-sm text-label-sm text-on-surface">{list.is_public ? t("Открыт для всех") : t("Виден только вам")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="bg-surface-container-low p-4 rounded-xl flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-surface-container-highest shrink-0 flex items-center justify-center text-secondary">
                <Icon name="add_location" className="text-[28px]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 gap-1.5">
                <span className="font-label-sm text-label-sm text-secondary">{t("ДОБАВИТЬ МЕСТО")}</span>
                <div className="flex gap-2">
                  <select className={`${input} flex-1 min-w-0 py-1.5`} onChange={(e) => setPlaceToAdd(e.target.value)} value={placeToAdd}>
                    <option value="">{t("Выберите место")}</option>
                    {available.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="bg-secondary text-on-secondary-container px-3 rounded-lg disabled:opacity-40"
                    disabled={!placeToAdd}
                    onClick={() => run(() => addStop(Number(placeToAdd)), t("Место добавлено")).then(() => setPlaceToAdd(""))}
                    type="button"
                  >
                    <Icon name="add" className="text-[20px]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-surface-container-lowest/60 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Icon name="checklist" className="text-primary text-[20px]" />
              <span className="font-title-md text-title-md text-on-surface">{t("Места маршрута")}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-body-sm font-body-sm">
              {items.length === 0 && <span className="text-on-surface-variant">{t("Добавьте места в маршрут.")}</span>}
              {items.map((item) => (
                <span
                  key={item.id}
                  className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded ${
                    item.is_visited ? "bg-surface-container text-on-surface" : "bg-secondary-container/20 text-secondary font-semibold"
                  }`}
                >
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => run(() => api(`/travel-list-places/${item.id}/toggle-visited/`, { method: "POST" }))}
                    title={item.is_visited ? t("Отметить как не посещённое") : t("Отметить как посещённое")}
                    type="button"
                  >
                    <Icon name={item.is_visited ? "check_circle" : "pending"} className={`text-[14px] ${item.is_visited ? "text-primary" : ""}`} />
                    {item.place_detail.name}
                  </button>
                  <button
                    className="text-outline hover:text-rose-400 ml-1"
                    onClick={() => run(() => api(`/travel-lists/${list.id}/remove-place/${item.place}/`, { method: "DELETE" }), t("Место убрано из маршрута"))}
                    title={t("Убрать из маршрута")}
                    type="button"
                  >
                    <Icon name="close" className="text-[14px]" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              className="bg-primary hover:bg-tertiary-container text-on-primary font-title-md text-body-md px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-md"
              onClick={() =>
                run(
                  () => api(`/travel-lists/${list.id}/`, { method: "PATCH", body: { is_public: !list.is_public } }),
                  list.is_public ? t("Маршрут теперь виден только вам") : t("Маршрут открыт для всех")
                )
              }
              type="button"
            >
              <Icon name={list.is_public ? "lock" : "public"} className="text-[20px]" />
              <span>{list.is_public ? t("Сделать личным") : t("Сделать публичным")}</span>
            </button>
            <Link className={secondaryBtn} to={`/lists/${list.id}`}>
              <Icon name="map" className="text-[20px]" />
              <span>{t("Страница маршрута")}</span>
            </Link>
            <button
              className={secondaryBtn}
              onClick={() => confirm(t("Удалить маршрут «{0}»?", list.title)) && run(() => api(`/travel-lists/${list.id}/`, { method: "DELETE" }), t("Маршрут удалён"))}
              type="button"
            >
              <Icon name="delete" className="text-[20px]" />
              <span>{t("Удалить маршрут")}</span>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-outline-variant/50">
            <span className="block font-label-sm text-label-sm text-on-surface-variant mb-2">{t("НОВЫЙ МАРШРУТ")}</span>
            <NewRouteForm onCreated={(id) => run(() => load(id))} places={allPlaces} />
          </div>
        </>
      )}
    </div>
  );
}
