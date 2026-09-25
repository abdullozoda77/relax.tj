import FavoritesCard from "../components/profile/FavoritesCard.jsx";
import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import ReviewsCard from "../components/profile/ReviewsCard.jsx";
import RouteCard from "../components/profile/RouteCard.jsx";
import SettingsCard, { SuggestionsCard } from "../components/profile/SettingsCard.jsx";
import Icon from "../components/Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useUi } from "../context/UiContext.jsx";

export default function Profile() {
  const { user, ready, reloadUser } = useAuth();
  const { openAuth } = useUi();

  if (!ready) {
    return <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10"><div className="h-48 rounded-xl bg-surface-container animate-pulse" /></div>;
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-6 py-32 text-center">
        <Icon name="lock" className="text-primary text-[48px]" />
        <h1 className="font-headline-md text-headline-md text-on-surface mt-4 mb-2">Профиль доступен после входа</h1>
        <p className="text-body-md text-on-surface-variant mb-6">Войдите, чтобы увидеть свои маршруты, избранное и отзывы.</p>
        <button
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-xl text-label-md font-label-md"
          onClick={() => openAuth("login")}
          type="button"
        >
          Войти
        </button>
      </div>
    );
  }

  // Counters in the header come from /auth/profile/, so reload it after changes.
  const refreshStats = () => reloadUser().catch(() => {});

  return (
    <div className="relative w-full overflow-hidden bg-surface py-10 px-6 lg:px-12">
      <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute top-48 right-0 w-[30rem] h-[30rem] rounded-full bg-secondary-container/10 blur-[120px] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto flex flex-col gap-10">
        <ProfileHeader user={user} />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-8 flex flex-col gap-8">
            <RouteCard onChanged={refreshStats} />
            <FavoritesCard />
          </div>
          <div className="xl:col-span-4 flex flex-col gap-8">
            <ReviewsCard onChanged={refreshStats} />
            <SuggestionsCard />
            <SettingsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
