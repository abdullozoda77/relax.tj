import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useUi } from "../context/UiContext.jsx";
import { isAdmin } from "../pages/AdminPanel.jsx";
import Icon from "./Icon.jsx";
import { t } from "../i18n.js";

const itemClass = "w-full text-left px-4 py-2 text-body-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-300 flex items-center gap-2";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const { openAuth, openSuggest } = useUi();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  // Close the menu when clicking anywhere outside it.
  useEffect(() => {
    const onClick = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!user) {
    return (
      <button
        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-1.5 rounded-full text-label-md font-label-md transition-all shadow-md shadow-emerald-950"
        onClick={() => openAuth("login")}
        type="button"
      >
        <Icon name="person" className="text-[18px]" /> {t("Войти")}
      </button>
    );
  }

  async function handleLogout() {
    setOpen(false);
    await logout();
    toast(t("Вы вышли из аккаунта"));
  }

  return (
    <div className="relative" ref={box}>
      <button className="flex items-center gap-2 text-slate-200 hover:text-white" onClick={() => setOpen(!open)} type="button">
        {user.avatar ? (
          <img alt="" className="w-8 h-8 rounded-full object-cover shadow-md shadow-emerald-950" src={user.avatar} />
        ) : (
          <span className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center uppercase shadow-md shadow-emerald-950">
            {user.username[0]}
          </span>
        )}
        <span className="hidden lg:inline text-body-sm">{user.username}</span>
        <Icon name="expand_more" className="text-[18px]" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-56 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-2">
          <div className="px-4 py-2 border-b border-slate-800 mb-1">
            <p className="text-body-sm text-white font-semibold truncate">{user.username}</p>
            <p className="text-label-sm font-label-sm text-slate-400 truncate">
              {user.email || (user.role === "admin" ? t("Администратор") : t("Путешественник"))}
            </p>
          </div>
          <Link className={itemClass} onClick={() => setOpen(false)} to="/profile">
            <Icon name="account_circle" className="text-[18px]" /> {t("Мой профиль")}
          </Link>
          <button
            className={itemClass}
            onClick={() => {
              setOpen(false);
              openSuggest();
            }}
            type="button"
          >
            <Icon name="add_location_alt" className="text-[18px]" /> {t("Предложить место")}
          </button>
          {isAdmin(user) && (
            <Link className={itemClass} onClick={() => setOpen(false)} to="/admin-panel">
              <Icon name="admin_panel_settings" className="text-[18px]" /> {t("Панель управления")}
            </Link>
          )}
          <button className={`${itemClass} !text-rose-300 border-t border-slate-800 mt-1`} onClick={handleLogout} type="button">
            <Icon name="logout" className="text-[18px]" /> {t("Выйти")}
          </button>
        </div>
      )}
    </div>
  );
}
