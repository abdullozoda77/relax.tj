import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import { SEASONS, formatFee } from "../../utils.js";
import FavoriteButton from "../FavoriteButton.jsx";
import Icon from "../Icon.jsx";

// Right column: price, favorite, "add to my route", map and share.
export default function PlaceSidebar({ place }) {
  const { user } = useAuth();
  const { requireLogin } = useUi();
  const toast = useToast();
  const [lists, setLists] = useState([]);
  const [listId, setListId] = useState("");

  useEffect(() => {
    if (!user) {
      setLists([]);
      return;
    }
    api("/travel-lists/?page_size=50")
      .then((d) => {
        setLists(d.results);
        setListId(d.results[0]?.id || "");
      })
      .catch(() => {});
  }, [user]);

  const inList = (list) => list.items.some((i) => i.place === place.id);

  async function addToList() {
    if (!requireLogin("Войдите, чтобы добавлять места в маршрут")) return;
    try {
      let target = lists.find((l) => l.id === Number(listId));
      if (!target) {
        // No routes yet: create the first one automatically.
        target = await api("/travel-lists/", { method: "POST", body: { title: "Мой маршрут", is_public: false } });
      }
      await api(`/travel-lists/${target.id}/add-place/`, { method: "POST", body: { place: place.id } });
      toast(`Добавлено в маршрут «${target.title}»`);
      const d = await api("/travel-lists/?page_size=50");
      setLists(d.results);
      setListId(target.id);
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Ссылка скопирована");
    } catch {
      toast(window.location.href);
    }
  }

  const fee = Number(place.entrance_fee);
  const selected = lists.find((l) => l.id === Number(listId));

  return (
    <aside className="bg-surface-container-low/95 backdrop-blur-xl rounded-2xl p-6 sm:p-7 shadow-2xl flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">Вход</span>
          <span className="text-4xl font-headline-lg font-semibold text-primary">{fee > 0 ? `${fee.toLocaleString("ru-RU")}` : "Бесплатно"}</span>
          {fee > 0 && <span className="text-label-md font-label-md text-outline">сомони с человека</span>}
        </div>
        <div className="flex flex-col items-end">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-secondary/15 text-secondary">
            {SEASONS[place.best_season]}
          </span>
          <span className="text-label-sm font-label-sm text-outline mt-1">лучший сезон</span>
        </div>
      </div>

      <FavoriteButton large place={place} />

      <div className="flex flex-col gap-3 bg-surface-container-lowest/50 p-4 rounded-xl">
        <label className="text-label-md font-label-md text-on-surface font-medium flex items-center justify-between">
          <span>Добавить в мой маршрут</span>
          {selected && inList(selected) && <span className="text-label-sm font-label-sm text-primary">уже в маршруте</span>}
        </label>
        {user && lists.length > 0 && (
          <select
            className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-xl px-4 py-3 border-0 focus:ring-1 focus:ring-primary"
            onChange={(e) => setListId(e.target.value)}
            value={listId}
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} ({l.items.length})
              </option>
            ))}
          </select>
        )}
        {user && lists.length === 0 && <p className="text-label-sm font-label-sm text-outline">У вас нет маршрутов — создадим «Мой маршрут».</p>}
        <button
          className="w-full py-3 rounded-xl bg-primary hover:bg-tertiary-container text-on-primary font-title-md text-title-md transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          disabled={Boolean(selected && inList(selected))}
          onClick={addToList}
          type="button"
        >
          <Icon name="add_location_alt" className="text-[20px]" />
          <span>В маршрут</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {place.latitude && place.longitude ? (
          <a
            className="bg-surface-container-high hover:bg-surface-bright text-on-surface text-body-sm px-3 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
            href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=12/${place.latitude}/${place.longitude}`}
            rel="noreferrer"
            target="_blank"
          >
            <Icon name="map" className="text-[18px]" /> Карта
          </a>
        ) : (
          <span />
        )}
        <button
          className="bg-surface-container-high hover:bg-surface-bright text-on-surface text-body-sm px-3 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
          onClick={share}
          type="button"
        >
          <Icon name="share" className="text-[18px]" /> Поделиться
        </button>
      </div>

      <div className="flex flex-col gap-3 pt-3 border-t border-outline-variant/30 text-label-sm font-label-sm text-on-surface-variant">
        <div className="flex items-center gap-2.5">
          <Icon name="verified_user" className="text-primary text-[19px]" />
          <span>Место проверено администратором Relax.tj</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Icon name="payments" className="text-secondary text-[19px]" />
          <span>{fee > 0 ? `Оплата на месте: ${formatFee(fee)}` : "Платить за вход не нужно"}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Icon name="group" className="text-primary text-[19px]" />
          <span>Отзывы только от зарегистрированных пользователей</span>
        </div>
      </div>

      <div className="bg-surface-container-lowest/70 p-3.5 rounded-xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="chat" className="text-outline text-[18px]" />
          <span className="text-label-sm font-label-sm text-on-surface">Как лучше добраться?</span>
        </div>
        <Link className="text-label-sm font-label-sm text-primary font-medium hover:underline shrink-0" to="/#info">
          Советы
        </Link>
      </div>
    </aside>
  );
}
