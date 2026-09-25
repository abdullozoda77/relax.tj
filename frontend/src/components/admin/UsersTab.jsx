import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import Icon from "../Icon.jsx";
import { Empty, input } from "./ui.jsx";
import { locale, t } from "../../i18n.js";

export default function UsersTab() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    const q = new URLSearchParams({ page_size: 100 });
    if (search) q.set("search", search);
    api(`/auth/users/?${q}`)
      .then((d) => setUsers(d.results))
      .catch(() => setUsers([]));
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function update(u, body, message) {
    try {
      await api(`/auth/users/${u.id}/`, { method: "PATCH", body });
      toast(message);
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input className={`${input} sm:max-w-xs`} onChange={(e) => setSearch(e.target.value)} placeholder={t("Поиск: имя, email, телефон...")} value={search} />
      {users === null && <div className="h-64 rounded-xl bg-surface-container animate-pulse" />}
      {users?.length === 0 && <Empty>{t("Никого не найдено.")}</Empty>}
      <div className="flex flex-col gap-2">
        {users?.map((u) => (
          <div key={u.id} className={`bg-surface-container rounded-xl p-4 flex flex-wrap items-center gap-4 ${u.is_active ? "" : "opacity-60"}`}>
            {u.avatar ? (
              <img alt="" className="w-10 h-10 rounded-full object-cover" src={u.avatar} />
            ) : (
              <span className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center uppercase">{u.username[0]}</span>
            )}
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-center gap-2">
                <span className="font-title-md text-title-md text-on-surface">{u.username}</span>
                {u.id === me.id && <span className="text-[10px] text-primary">{t("(это вы)")}</span>}
                {!u.is_active && <span className="text-[10px] font-bold text-rose-300 bg-rose-500/15 px-1.5 py-0.5 rounded">{t("ЗАБЛОКИРОВАН")}</span>}
              </div>
              <span className="text-label-sm font-label-sm text-on-surface-variant">
                {[u.email, u.phone_number, t("с {0}", new Date(u.date_joined).toLocaleDateString(locale()))].filter(Boolean).join(" · ")}
              </span>
            </div>
            <select
              className={`${input} w-auto`}
              disabled={u.id === me.id}
              onChange={(e) => update(u, { role: e.target.value }, t("Роль {0} изменена", u.username))}
              value={u.role}
            >
              <option value="user">{t("Пользователь")}</option>
              <option value="admin">{t("Администратор")}</option>
            </select>
            <button
              className={`text-body-sm px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40 ${
                u.is_active ? "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25" : "bg-primary/15 text-primary hover:bg-primary/25"
              }`}
              disabled={u.id === me.id}
              onClick={() => update(u, { is_active: !u.is_active }, u.is_active ? t("{0} заблокирован", u.username) : t("{0} разблокирован", u.username))}
              type="button"
            >
              <Icon name={u.is_active ? "block" : "lock_open"} className="text-[18px]" />
              {u.is_active ? t("Заблокировать") : t("Разблокировать")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
