import { Link } from "react-router-dom";
import { useToast } from "../../context/ToastContext.jsx";
import { SEASONS, formatFee } from "../../utils.js";
import FavoriteButton from "../FavoriteButton.jsx";
import Icon from "../Icon.jsx";
import { locale, t } from "../../i18n.js";

// Right column: price, favorite, map and share.
export default function PlaceSidebar({ place }) {
  const toast = useToast();

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast(t("Ссылка скопирована"));
    } catch {
      toast(window.location.href);
    }
  }

  const fee = Number(place.entrance_fee);

  return (
    <aside className="bg-surface-container-low/95 backdrop-blur-xl rounded-2xl p-6 sm:p-7 shadow-2xl flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">{t("Вход")}</span>
          <span className="text-4xl font-headline-lg font-semibold text-primary">{fee > 0 ? `${fee.toLocaleString(locale())}` : t("Бесплатно")}</span>
          {fee > 0 && <span className="text-label-md font-label-md text-outline">{t("сомони с человека")}</span>}
        </div>
        <div className="flex flex-col items-end">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-secondary/15 text-secondary">
            {SEASONS[place.best_season]}
          </span>
          <span className="text-label-sm font-label-sm text-outline mt-1">{t("лучший сезон")}</span>
        </div>
      </div>

      <FavoriteButton large place={place} />

      <div className="grid grid-cols-2 gap-3">
        {place.latitude && place.longitude ? (
          <a
            className="bg-surface-container-high hover:bg-surface-bright text-on-surface text-body-sm px-3 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
            href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=12/${place.latitude}/${place.longitude}`}
            rel="noreferrer"
            target="_blank"
          >
            <Icon name="map" className="text-[18px]" /> {t("Карта")}
          </a>
        ) : (
          <span />
        )}
        <button
          className="bg-surface-container-high hover:bg-surface-bright text-on-surface text-body-sm px-3 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
          onClick={share}
          type="button"
        >
          <Icon name="share" className="text-[18px]" /> {t("Поделиться")}
        </button>
      </div>

      <div className="flex flex-col gap-3 pt-3 border-t border-outline-variant/30 text-label-sm font-label-sm text-on-surface-variant">
        <div className="flex items-center gap-2.5">
          <Icon name="verified_user" className="text-primary text-[19px]" />
          <span>{t("Место проверено администратором Rohat")}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Icon name="payments" className="text-secondary text-[19px]" />
          <span>{fee > 0 ? t("Оплата на месте: {0}", formatFee(fee)) : t("Платить за вход не нужно")}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Icon name="group" className="text-primary text-[19px]" />
          <span>{t("Отзывы только от зарегистрированных пользователей")}</span>
        </div>
      </div>

      <div className="bg-surface-container-lowest/70 p-3.5 rounded-xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="chat" className="text-outline text-[18px]" />
          <span className="text-label-sm font-label-sm text-on-surface">{t("Как лучше добраться?")}</span>
        </div>
        <Link className="text-label-sm font-label-sm text-primary font-medium hover:underline shrink-0" to="/#info">
          {t("Советы")}
        </Link>
      </div>
    </aside>
  );
}
