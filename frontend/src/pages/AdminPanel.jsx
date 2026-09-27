import { useSearchParams } from "react-router-dom";
import PlacesTab from "../components/admin/PlacesTab.jsx";
import ReviewsTab from "../components/admin/ReviewsTab.jsx";
import StatsTab from "../components/admin/StatsTab.jsx";
import SuggestionsTab from "../components/admin/SuggestionsTab.jsx";
import UsersTab from "../components/admin/UsersTab.jsx";
import Icon from "../components/Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useUi } from "../context/UiContext.jsx";
import { t } from "../i18n.js";
import { isAdmin, isModerator } from "../roles.js";

// [id, label, icon, who can open it]. Moderators check suggestions and reviews; admins see everything.
const TABS = [
  ["stats", t("Обзор"), "monitoring", isAdmin],
  ["suggestions", t("Предложения"), "add_location_alt", isModerator],
  ["places", t("Места"), "location_on", isAdmin],
  ["users", t("Пользователи"), "group", isAdmin],
  ["reviews", t("Отзывы"), "rate_review", isModerator],
];

// Control panel for admins and moderators. The API itself also checks every role.
export default function AdminPanel() {
  const { user, ready } = useAuth();
  const { openAuth } = useUi();
  const [params, setParams] = useSearchParams();
  const tabs = TABS.filter(([, , , allowed]) => allowed(user));
  const tab = tabs.some(([value]) => value === params.get("tab")) ? params.get("tab") : tabs[0]?.[0];
  const setTab = (value) => setParams({ tab: value }, { replace: true });

  if (!ready) return <div className="max-w-7xl mx-auto px-6 py-10"><div className="h-48 rounded-xl bg-surface-container animate-pulse" /></div>;

  if (!isModerator(user)) {
    return (
      <div className="max-w-xl mx-auto px-6 py-32 text-center">
        <Icon name="admin_panel_settings" className="text-secondary text-[48px]" />
        <h1 className="font-headline-md text-headline-md text-on-surface mt-4 mb-2">{t("Только для модераторов и администраторов")}</h1>
        <p className="text-body-md text-on-surface-variant mb-6">
          {user ? t("У вашего аккаунта нет прав модератора или администратора.") : t("Войдите под аккаунтом модератора или администратора.")}
        </p>
        {!user && (
          <button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-xl text-label-md font-label-md" onClick={() => openAuth("login")} type="button">
            {t("Войти")}
          </button>
        )}
      </div>
    );
  }

  const Tab = { stats: StatsTab, suggestions: SuggestionsTab, places: PlacesTab, users: UsersTab, reviews: ReviewsTab }[tab];

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Relax.tj</span>
          <h1 className="font-headline-lg text-3xl md:text-headline-lg text-on-surface">{isAdmin(user) ? t("Панель управления") : t("Панель модератора")}</h1>
        </div>
        {isAdmin(user) && (
          <a className="text-label-md font-label-md text-on-surface-variant hover:text-primary flex items-center gap-1" href="http://127.0.0.1:8000/admin/" rel="noreferrer" target="_blank">
            Django admin <Icon name="open_in_new" className="text-[16px]" />
          </a>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([value, label, icon]) => (
          <button
            key={value}
            className={`shrink-0 px-4 py-2 rounded-lg text-body-sm flex items-center gap-2 border transition-all ${
              tab === value ? "bg-primary/15 text-primary border-primary/40" : "text-on-surface-variant border-outline-variant hover:text-on-surface"
            }`}
            onClick={() => setTab(value)}
            type="button"
          >
            <Icon name={icon} className="text-[18px]" /> {label}
          </button>
        ))}
      </div>
      <Tab onOpenSuggestions={() => setTab("suggestions")} />
    </div>
  );
}
