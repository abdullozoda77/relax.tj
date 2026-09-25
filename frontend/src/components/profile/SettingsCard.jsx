import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import Icon from "../Icon.jsx";
import { StatusBadge } from "../SuggestModal.jsx";

const input =
  "w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-body-sm text-on-surface placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary";

function Label({ text, children }) {
  return (
    <label className="block">
      <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{text}</span>
      {children}
    </label>
  );
}

export function SuggestionsCard() {
  const { openSuggest } = useUi();
  const [items, setItems] = useState(null);

  useEffect(() => {
    api("/suggestions/?page_size=20")
      .then((d) => setItems(d.results))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="bg-surface-container rounded-xl p-6 lg:p-7 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="add_location_alt" className="text-secondary text-[24px]" />
          <h3 className="font-title-md text-title-md text-on-surface">Мои предложения</h3>
        </div>
        <button className="font-label-sm text-label-sm text-primary hover:text-tertiary" onClick={() => openSuggest()} type="button">
          + НОВОЕ
        </button>
      </div>
      {items?.length === 0 && <p className="text-body-sm text-on-surface-variant">Вы ещё не предлагали новых мест.</p>}
      {items?.map((s) => (
        <div key={s.id} className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-title-md text-title-md text-on-surface truncate">{s.name}</span>
            <StatusBadge status={s.status} />
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {new Date(s.created_at).toLocaleDateString("ru-RU")}
            {s.admin_comment && ` · Комментарий: ${s.admin_comment}`}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function SettingsCard() {
  const { user, reloadUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [passwords, setPasswords] = useState({ old_password: "", new_password: "" });

  async function saveProfile(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    if (!data.get("avatar")?.size) data.delete("avatar");
    // phone_number is unique, so an empty string would clash with other users without a phone.
    if (!data.get("phone_number").trim()) data.delete("phone_number");
    setBusy(true);
    try {
      await api("/auth/profile/", { method: "PATCH", body: data });
      await reloadUser();
      toast("Профиль сохранён");
      e.target.avatar.value = "";
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    try {
      await api("/auth/change-password/", { method: "POST", body: passwords });
      toast("Пароль изменён");
      setPasswords({ old_password: "", new_password: "" });
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <div className="bg-surface-container rounded-xl p-6 lg:p-7 shadow-xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="manage_accounts" className="text-secondary text-[24px]" />
          <h3 className="font-title-md text-title-md text-on-surface">Настройки профиля</h3>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant">@{user.username}</span>
      </div>

      <form className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-3" key={user.id} onSubmit={saveProfile}>
        <div className="grid grid-cols-2 gap-3">
          <Label text="ИМЯ">
            <input className={input} defaultValue={user.first_name} name="first_name" />
          </Label>
          <Label text="ФАМИЛИЯ">
            <input className={input} defaultValue={user.last_name} name="last_name" />
          </Label>
        </div>
        <Label text="EMAIL">
          <input className={input} defaultValue={user.email} name="email" type="email" />
        </Label>
        <Label text="ТЕЛЕФОН">
          <input className={input} defaultValue={user.phone_number || ""} name="phone_number" placeholder="+992 ..." />
        </Label>
        <Label text="О СЕБЕ">
          <textarea className={input} defaultValue={user.bio} name="bio" rows={2} />
        </Label>
        <Label text="АВАТАР (jpg, png, webp, до 5 МБ)">
          <input
            accept=".jpg,.jpeg,.png,.webp"
            className="block w-full text-body-sm text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-surface-container-high file:text-primary hover:file:bg-surface-bright"
            name="avatar"
            type="file"
          />
        </Label>
        <button
          className="bg-primary hover:bg-tertiary-container text-on-primary font-title-md text-body-md px-5 py-2 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          <Icon name="save" className="text-[20px]" /> Сохранить
        </button>
      </form>

      <form className="bg-surface-container-lowest p-4 rounded-xl flex flex-col gap-3" onSubmit={changePassword}>
        <span className="font-label-sm text-label-sm text-on-surface-variant">СМЕНА ПАРОЛЯ</span>
        <input
          autoComplete="current-password"
          className={input}
          onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
          placeholder="Текущий пароль"
          required
          type="password"
          value={passwords.old_password}
        />
        <input
          autoComplete="new-password"
          className={input}
          onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
          placeholder="Новый пароль"
          required
          type="password"
          value={passwords.new_password}
        />
        <button className="bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-body-md px-5 py-2 rounded-lg transition-all" type="submit">
          Изменить пароль
        </button>
      </form>
    </div>
  );
}
