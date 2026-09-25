import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import { formatDate, plural } from "../../utils.js";
import Icon from "../Icon.jsx";
import PlaceBackground from "../PlaceBackground.jsx";

const input =
  "px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-body-sm text-on-surface placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary";
const secondaryBtn =
  "bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-body-md px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all";

function NewListForm({ onCreated }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      const list = await api("/travel-lists/", { method: "POST", body: { title, description, is_public: false } });
      toast(`Маршрут «${list.title}» создан`);
      setTitle("");
      setDescription("");
      onCreated(list.id);
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <form className="flex flex-col sm:flex-row gap-2" onSubmit={submit}>
      <input className={`${input} flex-1`} onChange={(e) => setTitle(e.target.value)} placeholder="Название маршрута" required value={title} />
      <input className={`${input} flex-1`} onChange={(e) => setDescription(e.target.value)} placeholder="Описание (необязательно)" value={description} />
      <button className="bg-primary hover:bg-tertiary-container text-on-primary font-title-md text-body-md px-4 py-2 rounded-lg flex items-center gap-1.5" type="submit">
        <Icon name="add" className="text-[18px]" /> Создать
      </button>
    </form>
  );
}

// "My travel route": the selected travel list with progress, visited marks and actions.
export default function RouteCard({ onChanged }) {
  const toast = useToast();
  const { openPlace } = useUi();
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
  const visited = items.filter((i) => i.is_visited).length;
  const percent = items.length ? Math.round((visited * 100) / items.length) : 0;
  const next = items.find((i) => !i.is_visited);
  const cover = items[0]?.place_detail;
  const available = allPlaces.filter((p) => !items.some((i) => i.place === p.id));

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
              {l.title}
            </button>
          ))}
        </div>
      )}

      {!list ? (
        <div className="flex flex-col gap-4">
          <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">МОЙ МАРШРУТ</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">У вас пока нет маршрутов</h2>
          <p className="text-body-md text-on-surface-variant">Создайте список мест, которые хотите посетить, и отмечайте, где уже были.</p>
          <NewListForm onCreated={(id) => run(() => load(id))} />
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-secondary-container/20 text-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full">МОЙ МАРШРУТ</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant tracking-wider">REF: #LIST-{list.id}</span>
              </div>
              <h2 className="font-headline-lg text-3xl md:text-headline-lg text-on-surface mt-1.5">{list.title}</h2>
              {list.description && <p className="text-body-sm text-on-surface-variant mt-1">{list.description}</p>}
            </div>
            <div className="bg-surface-container-lowest px-4 py-3 rounded-lg flex items-center gap-3 shrink-0">
              <Icon name="flag" className="text-secondary text-[26px]" />
              <div>
                <div className="font-label-sm text-label-sm text-on-surface-variant">ПОСЕЩЕНО</div>
                <div className="font-label-md text-label-md text-on-surface font-semibold">
                  {visited} / {plural(items.length, ["места", "мест", "мест"])}
                </div>
              </div>
            </div>
          </div>

          <div className="group relative w-full h-56 rounded-xl overflow-hidden shadow-inner my-2">
            {cover ? <PlaceBackground place={cover} /> : <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-950" />}
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/30 to-transparent flex flex-col justify-end p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon name="calendar_today" className="text-primary text-[20px]" />
                  <span className="font-label-md text-label-md text-on-surface font-semibold">Создан {formatDate(list.created_at)}</span>
                  <span className="text-outline">·</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{plural(items.length, ["место", "места", "мест"])}</span>
                </div>
                <div className="flex items-center gap-2 bg-surface-container-high/90 backdrop-blur-md px-3 py-1 rounded-full">
                  <Icon name={list.is_public ? "public" : "lock"} className="text-secondary text-[16px]" />
                  <span className="font-label-sm text-label-sm text-on-surface">{list.is_public ? "Открыт для всех" : "Виден только вам"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <button
              className="bg-surface-container-low p-4 rounded-xl flex items-center gap-4 text-left disabled:cursor-default"
              disabled={!next}
              onClick={() => next && openPlace(next.place)}
              type="button"
            >
              <div className="group relative w-14 h-14 rounded-full overflow-hidden bg-surface-container-highest shrink-0">
                {next ? <PlaceBackground place={next.place_detail} /> : <Icon name="celebration" className="absolute inset-0 m-auto h-fit w-fit text-primary text-[28px]" />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-primary">СЛЕДУЮЩЕЕ МЕСТО</span>
                <div className="font-title-md text-title-md text-on-surface truncate">{next ? next.place_detail.name : "Все места посещены!"}</div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 truncate">
                  {next ? `${next.place_detail.region} · ${next.place_detail.category || "Без категории"}` : "Отличная поездка"}
                </p>
              </div>
            </button>
            <div className="bg-surface-container-low p-4 rounded-xl flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-surface-container-highest shrink-0 flex items-center justify-center text-secondary">
                <Icon name="add_location" className="text-[28px]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 gap-1.5">
                <span className="font-label-sm text-label-sm text-secondary">ДОБАВИТЬ МЕСТО</span>
                <div className="flex gap-2">
                  <select className={`${input} flex-1 min-w-0 py-1.5`} onChange={(e) => setPlaceToAdd(e.target.value)} value={placeToAdd}>
                    <option value="">Выберите место</option>
                    {available.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="bg-secondary text-on-secondary-container px-3 rounded-lg disabled:opacity-40"
                    disabled={!placeToAdd}
                    onClick={() =>
                      run(() => api(`/travel-lists/${list.id}/add-place/`, { method: "POST", body: { place: Number(placeToAdd) } }), "Место добавлено").then(() =>
                        setPlaceToAdd("")
                      )
                    }
                    type="button"
                  >
                    <Icon name="add" className="text-[20px]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-surface-container-lowest/60 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="checklist" className="text-primary text-[20px]" />
                <span className="font-title-md text-title-md text-on-surface">Прогресс маршрута</span>
              </div>
              <span className="font-label-md text-label-md text-primary font-semibold">{percent}% пройдено</span>
            </div>
            <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>
            <div className="flex flex-wrap gap-2 text-body-sm font-body-sm">
              {items.length === 0 && <span className="text-on-surface-variant">Добавьте места в маршрут.</span>}
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
                    title={item.is_visited ? "Отметить как не посещённое" : "Отметить как посещённое"}
                    type="button"
                  >
                    <Icon name={item.is_visited ? "check_circle" : "pending"} className={`text-[14px] ${item.is_visited ? "text-primary" : ""}`} />
                    {item.place_detail.name}
                  </button>
                  <button
                    className="text-outline hover:text-rose-400 ml-1"
                    onClick={() => run(() => api(`/travel-lists/${list.id}/remove-place/${item.place}/`, { method: "DELETE" }), "Место убрано из маршрута")}
                    title="Убрать из маршрута"
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
                  list.is_public ? "Маршрут теперь виден только вам" : "Маршрут открыт для всех"
                )
              }
              type="button"
            >
              <Icon name={list.is_public ? "lock" : "public"} className="text-[20px]" />
              <span>{list.is_public ? "Сделать личным" : "Сделать публичным"}</span>
            </button>
            <Link className={secondaryBtn} to={`/lists/${list.id}`}>
              <Icon name="map" className="text-[20px]" />
              <span>Страница маршрута</span>
            </Link>
            <button
              className={secondaryBtn}
              onClick={() => confirm(`Удалить маршрут «${list.title}»?`) && run(() => api(`/travel-lists/${list.id}/`, { method: "DELETE" }), "Маршрут удалён")}
              type="button"
            >
              <Icon name="delete" className="text-[20px]" />
              <span>Удалить маршрут</span>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-outline-variant/50">
            <span className="block font-label-sm text-label-sm text-on-surface-variant mb-2">НОВЫЙ МАРШРУТ</span>
            <NewListForm onCreated={(id) => run(() => load(id))} />
          </div>
        </>
      )}
    </div>
  );
}
