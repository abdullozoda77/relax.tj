import { formatDate, plural } from "../../utils.js";
import Icon from "../Icon.jsx";
import { t } from "../../i18n.js";

function InfoTile({ label, icon, value, note, live, accent = "primary" }) {
  const color = accent === "primary" ? "text-primary" : "text-secondary";
  return (
    <div className="bg-surface-container-low rounded-lg p-3.5 flex flex-col justify-between shadow-sm min-w-0">
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
        {live && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
      </div>
      <div className="mt-2 flex items-center gap-2 min-w-0">
        <Icon name={icon} filled className={`${color} text-[20px]`} />
        <span className="font-title-md text-title-md text-on-surface leading-tight truncate">{value}</span>
      </div>
      <span className={`font-label-sm text-label-sm mt-1 truncate ${accent === "primary" ? "text-primary/80" : "text-on-surface-variant"}`}>{note}</span>
    </div>
  );
}

export function Avatar({ user, size = "w-24 h-24", text = "text-4xl" }) {
  return (
    <div className={`${size} rounded-full overflow-hidden shadow-2xl bg-surface-container-high shrink-0`}>
      {user.avatar ? (
        <img alt="" className="w-full h-full object-cover" src={user.avatar} />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br from-emerald-500 to-teal-800 flex items-center justify-center font-bold uppercase text-white ${text}`}>
          {user.username[0]}
        </div>
      )}
    </div>
  );
}

export default function ProfileHeader({ user }) {
  const stats = user.stats || {};
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const isAdmin = user.role === "admin";

  return (
    <div className="bg-surface-container rounded-xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-primary/5 via-primary/0 to-transparent pointer-events-none" />
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative">
            <Avatar user={user} />
            <div className="absolute -bottom-1 -right-1 bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
              <Icon name="workspace_premium" filled className="text-[13px]" />
              <span>{isAdmin ? t("АДМИН") : t("УРОВЕНЬ {0}", Math.min(1 + Math.floor((stats.reviews || 0) / 3), 5))}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-headline-lg text-3xl md:text-headline-lg text-on-surface">{fullName || user.username}</h1>
              <span className="bg-primary/15 text-primary font-label-sm text-label-sm px-3 py-1 rounded-full uppercase tracking-wider">
                {isAdmin ? t("Администратор") : t("Путешественник")}
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant flex flex-wrap items-center gap-2">
              <Icon name="verified_user" className="text-[16px] text-primary" />
              {t("На сайте с")} {formatDate(user.date_joined)} <span className="text-outline">/</span> @{user.username}
            </p>
            <div className="flex items-center gap-4 mt-1 font-label-md text-label-md">
              <div className="flex items-center gap-1.5 text-on-surface">
                <span className="font-headline-sm text-headline-sm text-primary">{stats.travel_lists ?? 0}</span>
                <span className="text-on-surface-variant text-body-sm">{t("Маршрутов")}</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
              <div className="flex items-center gap-1.5 text-on-surface">
                <span className="font-headline-sm text-headline-sm text-secondary">{stats.reviews ?? 0}</span>
                <span className="text-on-surface-variant text-body-sm">{t("Отзывов")}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 self-stretch lg:self-auto lg:w-[520px]">
          <InfoTile
            icon="favorite"
            label={t("ИЗБРАННОЕ")}
            live
            note={t("Сохранённые места")}
            value={plural(stats.favorites ?? 0, [t("место"), t("места"), t("мест")])}
          />
          <InfoTile
            accent="secondary"
            icon="add_location_alt"
            label={t("ПРЕДЛОЖЕНИЯ")}
            note={t("Новые места от вас")}
            value={t("{0} отправлено", stats.suggestions ?? 0)}
          />
          <InfoTile icon="contact_mail" label={t("КОНТАКТЫ")} note={user.phone_number || t("Телефон не указан")} value={user.email || t("Email не указан")} />
        </div>
      </div>
    </div>
  );
}
