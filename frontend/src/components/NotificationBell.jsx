import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Icon from "./Icon.jsx";

const ICONS = { suggestion: "add_location_alt", review: "rate_review", system: "info" };
const POLL_MS = 60000;

function timeAgo(value) {
  const minutes = Math.round((Date.now() - new Date(value)) / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return new Date(value).toLocaleDateString("ru-RU");
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  const loadCount = useCallback(() => {
    api("/notifications/unread-count/")
      .then((d) => setCount(d.count))
      .catch(() => {});
  }, []);

  // Check for new notifications every minute and when the tab becomes active again.
  useEffect(() => {
    if (!user) return undefined;
    loadCount();
    const timer = setInterval(loadCount, POLL_MS);
    window.addEventListener("focus", loadCount);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", loadCount);
    };
  }, [user, loadCount]);

  useEffect(() => {
    const onClick = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!user) return null;

  async function toggle() {
    if (!open) {
      setItems(null);
      api("/notifications/?page_size=10")
        .then((d) => setItems(d.results))
        .catch(() => setItems([]));
    }
    setOpen(!open);
  }

  async function openItem(n) {
    setOpen(false);
    if (!n.is_read) {
      await api(`/notifications/${n.id}/read/`, { method: "POST" }).catch(() => {});
      loadCount();
    }
    if (n.link) navigate(n.link);
  }

  async function readAll() {
    await api("/notifications/read-all/", { method: "POST" }).catch(() => {});
    setItems((prev) => prev?.map((n) => ({ ...n, is_read: true })));
    setCount(0);
  }

  return (
    <div className="relative" ref={box}>
      <button className="relative w-9 h-9 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors" onClick={toggle} title="Уведомления" type="button">
        <Icon filled={count > 0} name="notifications" className="text-[22px]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-80 max-w-[90vw] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-body-sm text-white font-semibold">Уведомления</span>
            {count > 0 && (
              <button className="text-label-sm font-label-sm text-emerald-400 hover:text-emerald-300" onClick={readAll} type="button">
                Прочитать все
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items === null && <p className="px-4 py-6 text-body-sm text-slate-400">Загрузка...</p>}
            {items?.length === 0 && <p className="px-4 py-6 text-body-sm text-slate-400 text-center">Пока нет уведомлений</p>}
            {items?.map((n) => (
              <button
                key={n.id}
                className={`w-full text-left px-4 py-3 flex gap-3 border-b border-slate-800/60 hover:bg-slate-800 transition-colors ${n.is_read ? "" : "bg-emerald-500/5"}`}
                onClick={() => openItem(n)}
                type="button"
              >
                <Icon name={ICONS[n.kind] || "info"} className={`text-[20px] mt-0.5 ${n.is_read ? "text-slate-500" : "text-emerald-400"}`} />
                <span className="flex-1 min-w-0">
                  <span className={`block text-body-sm ${n.is_read ? "text-slate-400" : "text-slate-100"}`}>{n.text}</span>
                  <span className="block text-label-sm font-label-sm text-slate-500 mt-0.5">{timeAgo(n.created_at)}</span>
                </span>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
