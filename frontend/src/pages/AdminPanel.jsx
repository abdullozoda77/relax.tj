import { useSearchParams } from "react-router-dom";
import PlacesTab from "../components/admin/PlacesTab.jsx";
import ReviewsTab from "../components/admin/ReviewsTab.jsx";
import StatsTab from "../components/admin/StatsTab.jsx";
import SuggestionsTab from "../components/admin/SuggestionsTab.jsx";
import UsersTab from "../components/admin/UsersTab.jsx";
import Icon from "../components/Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useUi } from "../context/UiContext.jsx";

const TABS = [
  ["stats", "Обзор", "monitoring"],
  ["suggestions", "Предложения", "add_location_alt"],
  ["places", "Места", "location_on"],
  ["users", "Пользователи", "group"],
  ["reviews", "Отзывы", "rate_review"],
];

export function isAdmin(user) {
  return Boolean(user && (user.role === "admin" || user.is_staff));
}

// Admin panel in React. The API itself also checks that the user is an admin.
export default function AdminPanel() {
  const { user, ready } = useAuth();
  const { openAuth } = useUi();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "stats";
  const setTab = (value) => setParams({ tab: value }, { replace: true });

  if (!ready) return <div className="max-w-7xl mx-auto px-6 py-10"><div className="h-48 rounded-xl bg-surface-container animate-pulse" /></div>;

  if (!isAdmin(user)) {
    return (
      <div className="max-w-xl mx-auto px-6 py-32 text-center">
        <Icon name="admin_panel_settings" className="text-secondary text-[48px]" />
        <h1 className="font-headline-md text-headline-md text-on-surface mt-4 mb-2">Только для администраторов</h1>
        <p className="text-body-md text-on-surface-variant mb-6">
          {user ? "У вашего аккаунта нет прав администратора." : "Войдите под аккаунтом администратора."}
        </p>
        {!user && (
          <button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-xl text-label-md font-label-md" onClick={() => openAuth("login")} type="button">
            Войти
          </button>
        )}
      </div>
    );
  }

  const Tab = { stats: StatsTab, suggestions: SuggestionsTab, places: PlacesTab, users: UsersTab, reviews: ReviewsTab }[tab] || StatsTab;

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Relax.tj</span>
          <h1 className="font-headline-lg text-3xl md:text-headline-lg text-on-surface">Панель управления</h1>
        </div>
        <a className="text-label-md font-label-md text-on-surface-variant hover:text-primary flex items-center gap-1" href="http://127.0.0.1:8000/admin/" rel="noreferrer" target="_blank">
          Django admin <Icon name="open_in_new" className="text-[16px]" />
        </a>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([value, label, icon]) => (
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
