import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import { SEASONS, formatFee, formatRating } from "../../utils.js";
import Icon from "../Icon.jsx";
import Modal from "../Modal.jsx";
import PlaceBackground from "../PlaceBackground.jsx";
import { btnPrimary, btnSecondary, Empty, input, Label } from "./ui.jsx";

const EMPTY_PLACE = {
  name: "",
  region: "",
  category: "",
  activities: [],
  description: "",
  how_to_get_there: "",
  address: "",
  latitude: "",
  longitude: "",
  altitude: "",
  best_season: "summer",
  entrance_fee: "0",
  is_active: true,
};

// Photos of one place: upload, make main, delete.
function PhotosManager({ placeId }) {
  const toast = useToast();
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api(`/place-images/?place=${placeId}&page_size=50`)
      .then((d) => setImages(d.results))
      .catch(() => {});
  }, [placeId]);
  useEffect(load, [load]);

  async function upload(e) {
    const files = [...e.target.files];
    e.target.value = "";
    setBusy(true);
    for (const [i, file] of files.entries()) {
      const body = new FormData();
      body.append("place", placeId);
      body.append("image", file);
      body.append("is_main", images.length === 0 && i === 0 ? "true" : "false");
      try {
        await api("/place-images/", { method: "POST", body });
      } catch (err) {
        toast(`${file.name}: ${err.message}`, "error");
      }
    }
    setBusy(false);
    load();
  }

  async function action(fn, message) {
    try {
      await fn();
      toast(message);
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="font-label-sm text-label-sm text-on-surface-variant">ФОТО ({images.length})</span>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {images.map((img) => (
          <div key={img.id} className={`relative rounded-lg overflow-hidden border-2 ${img.is_main ? "border-secondary" : "border-transparent"}`}>
            <img alt="" className="w-full h-24 object-cover" src={img.image} />
            {img.is_main && <span className="absolute top-1 left-1 bg-secondary text-on-secondary-container text-[10px] font-bold px-1.5 rounded">ГЛАВНОЕ</span>}
            <div className="absolute bottom-1 right-1 flex gap-1">
              {!img.is_main && (
                <button
                  className="w-7 h-7 rounded-full bg-slate-950/80 text-secondary flex items-center justify-center"
                  onClick={() => action(() => api(`/place-images/${img.id}/set-main/`, { method: "POST" }), "Главное фото изменено")}
                  title="Сделать главным"
                  type="button"
                >
                  <Icon name="star" className="text-[16px]" />
                </button>
              )}
              <button
                className="w-7 h-7 rounded-full bg-slate-950/80 text-rose-300 flex items-center justify-center"
                onClick={() => confirm("Удалить фото?") && action(() => api(`/place-images/${img.id}/`, { method: "DELETE" }), "Фото удалено")}
                title="Удалить"
                type="button"
              >
                <Icon name="delete" className="text-[16px]" />
              </button>
            </div>
          </div>
        ))}
        <label className="h-24 rounded-lg border-2 border-dashed border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary flex flex-col items-center justify-center cursor-pointer text-label-sm font-label-sm gap-1">
          <Icon name={busy ? "progress_activity" : "add_a_photo"} className={`text-[22px] ${busy ? "animate-spin" : ""}`} />
          {busy ? "Загрузка..." : "Добавить"}
          <input accept=".jpg,.jpeg,.png,.webp" className="hidden" disabled={busy} multiple onChange={upload} type="file" />
        </label>
      </div>
    </div>
  );
}

function PlaceEditor({ placeId, regions, categories, activities, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(placeId ? null : EMPTY_PLACE);
  const [id, setId] = useState(placeId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!placeId) return;
    api(`/places/${placeId}/`)
      .then((p) =>
        setForm({
          ...EMPTY_PLACE,
          ...Object.fromEntries(Object.keys(EMPTY_PLACE).map((k) => [k, p[k] ?? EMPTY_PLACE[k]])),
          region: p.region.id,
          category: p.category?.id || "",
          activities: p.activities.map((a) => a.id),
        })
      )
      .catch((err) => toast(err.message, "error"));
  }, [placeId, toast]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const toggleActivity = (aid) =>
    setForm({ ...form, activities: form.activities.includes(aid) ? form.activities.filter((x) => x !== aid) : [...form.activities, aid] });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const body = {
      ...form,
      category: form.category || null,
      latitude: form.latitude === "" ? null : form.latitude,
      longitude: form.longitude === "" ? null : form.longitude,
      altitude: form.altitude === "" ? null : form.altitude,
    };
    try {
      const saved = await api(id ? `/places/${id}/` : "/places/", { method: id ? "PATCH" : "POST", body });
      toast(id ? "Место сохранено" : "Место создано — теперь можно добавить фото");
      setId(saved.id);
      onSaved();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="p-6 sm:p-8">
        <h2 className="text-headline-md font-headline-md text-white mb-6">{id ? "Редактирование места" : "Новое место"}</h2>
        {!form ? (
          <div className="h-64 rounded-xl bg-surface-container-lowest animate-pulse" />
        ) : (
          <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={save}>
            <Label className="sm:col-span-2" text="НАЗВАНИЕ *">
              <input className={input} onChange={set("name")} required value={form.name} />
            </Label>
            <Label text="РЕГИОН *">
              <select className={input} onChange={set("region")} required value={form.region}>
                <option value="">— выберите —</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Label>
            <Label text="КАТЕГОРИЯ">
              <select className={input} onChange={set("category")} value={form.category}>
                <option value="">— без категории —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Label>
            <Label className="sm:col-span-2" text="ОПИСАНИЕ">
              <textarea className={input} onChange={set("description")} rows={4} value={form.description} />
            </Label>
            <Label className="sm:col-span-2" text="КАК ДОБРАТЬСЯ">
              <textarea className={input} onChange={set("how_to_get_there")} rows={2} value={form.how_to_get_there} />
            </Label>
            <Label className="sm:col-span-2" text="АДРЕС">
              <input className={input} onChange={set("address")} value={form.address} />
            </Label>
            <Label text="ШИРОТА">
              <input className={input} onChange={set("latitude")} placeholder="38.5767" step="any" type="number" value={form.latitude} />
            </Label>
            <Label text="ДОЛГОТА">
              <input className={input} onChange={set("longitude")} placeholder="68.7806" step="any" type="number" value={form.longitude} />
            </Label>
            <Label text="ВЫСОТА, М">
              <input className={input} min="0" onChange={set("altitude")} type="number" value={form.altitude} />
            </Label>
            <Label text="ВХОД, СОМОНИ (0 = БЕСПЛАТНО)">
              <input className={input} min="0" onChange={set("entrance_fee")} step="0.01" type="number" value={form.entrance_fee} />
            </Label>
            <Label text="ЛУЧШИЙ СЕЗОН">
              <select className={input} onChange={set("best_season")} value={form.best_season}>
                {Object.entries(SEASONS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Label>
            <label className="flex items-center gap-2 text-body-sm text-on-surface self-end pb-2">
              <input checked={form.is_active} className="rounded bg-surface-container-lowest border-outline-variant text-primary" onChange={set("is_active")} type="checkbox" />
              Показывать на сайте
            </label>
            <div className="sm:col-span-2">
              <span className="block font-label-sm text-label-sm text-on-surface-variant mb-2">АКТИВНОСТИ</span>
              <div className="flex flex-wrap gap-2">
                {activities.map((a) => (
                  <button
                    key={a.id}
                    className={`px-3 py-1 rounded-full text-label-sm font-label-sm border ${
                      form.activities.includes(a.id) ? "bg-primary/15 text-primary border-primary/40" : "text-on-surface-variant border-outline-variant"
                    }`}
                    onClick={() => toggleActivity(a.id)}
                    type="button"
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button className={btnPrimary} disabled={busy} type="submit">
                <Icon name="save" className="text-[18px]" /> {id ? "Сохранить" : "Создать место"}
              </button>
              <button className={btnSecondary} onClick={onClose} type="button">
                Закрыть
              </button>
            </div>
          </form>
        )}
        {id && (
          <div className="mt-8 pt-6 border-t border-outline-variant/50">
            <PhotosManager placeId={id} />
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function PlacesTab() {
  const toast = useToast();
  const { openPlace } = useUi();
  const [places, setPlaces] = useState(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new place, number = place id
  const [regions, setRegions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    api("/regions/?page_size=100").then((d) => setRegions(d.results)).catch(() => {});
    api("/categories/?page_size=100").then((d) => setCategories(d.results)).catch(() => {});
    api("/activities/?page_size=100").then((d) => setActivities(d.results)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    const q = new URLSearchParams({ page_size: 100, ordering: "name" });
    if (search) q.set("search", search);
    api(`/places/?${q}`)
      .then((d) => setPlaces(d.results))
      .catch(() => setPlaces([]));
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function toggleActive(p) {
    try {
      await api(`/places/${p.id}/`, { method: "PATCH", body: { is_active: !p.is_active } });
      toast(p.is_active ? `«${p.name}» скрыто с сайта` : `«${p.name}» снова на сайте`);
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function remove(p) {
    if (!confirm(`Удалить место «${p.name}» навсегда? Вместе с ним удалятся фото и отзывы.`)) return;
    try {
      await api(`/places/${p.id}/`, { method: "DELETE" });
      toast("Место удалено");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <input className={`${input} sm:max-w-xs`} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию..." value={search} />
        <button className={btnPrimary} onClick={() => setEditing(null)} type="button">
          <Icon name="add_location_alt" className="text-[18px]" /> Новое место
        </button>
      </div>
      {places === null && <div className="h-64 rounded-xl bg-surface-container animate-pulse" />}
      {places?.length === 0 && <Empty>Ничего не найдено.</Empty>}
      <div className="flex flex-col gap-2">
        {places?.map((p) => (
          <div key={p.id} className={`bg-surface-container rounded-xl p-3 flex items-center gap-4 ${p.is_active ? "" : "opacity-60"}`}>
            <div className="group relative w-20 h-14 rounded-lg overflow-hidden shrink-0">
              <PlaceBackground place={p} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-title-md text-title-md text-on-surface truncate">{p.name}</span>
                {!p.is_active && <span className="text-[10px] font-bold text-rose-300 bg-rose-500/15 px-1.5 py-0.5 rounded">СКРЫТО</span>}
              </div>
              <span className="text-label-sm font-label-sm text-on-surface-variant">
                {p.region} · {p.category || "без категории"} · {formatFee(p.entrance_fee)} · ★ {formatRating(p.average_rating)} · 👁 {p.views_count}
              </span>
            </div>
            <div className="flex gap-1 shrink-0">
              <button className="p-2 text-on-surface-variant hover:text-primary" onClick={() => openPlace(p.id)} title="Открыть на сайте" type="button">
                <Icon name="open_in_new" className="text-[20px]" />
              </button>
              <button className="p-2 text-on-surface-variant hover:text-primary" onClick={() => setEditing(p.id)} title="Редактировать" type="button">
                <Icon name="edit" className="text-[20px]" />
              </button>
              <button
                className="p-2 text-on-surface-variant hover:text-secondary"
                onClick={() => toggleActive(p)}
                title={p.is_active ? "Скрыть с сайта" : "Показать на сайте"}
                type="button"
              >
                <Icon name={p.is_active ? "visibility_off" : "visibility"} className="text-[20px]" />
              </button>
              <button className="p-2 text-on-surface-variant hover:text-rose-400" onClick={() => remove(p)} title="Удалить" type="button">
                <Icon name="delete" className="text-[20px]" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {editing !== undefined && (
        <PlaceEditor
          activities={activities}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSaved={load}
          placeId={editing}
          regions={regions}
        />
      )}
    </div>
  );
}

