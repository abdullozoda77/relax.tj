import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { useUi } from "../../context/UiContext.jsx";
import { SEASONS, formatFee, formatRating } from "../../utils.js";
import Icon from "../Icon.jsx";
import PlaceBackground from "../PlaceBackground.jsx";
import { t } from "../../i18n.js";

export default function FavoritesCard() {
  const { openPlace, toggleFavorite, favoritesVersion } = useUi();
  const [favorites, setFavorites] = useState(null);

  // Reload after any ♥ change on the page (here or in the place window).
  useEffect(() => {
    api("/favorites/?page_size=50")
      .then((data) => setFavorites(data.results))
      .catch(() => setFavorites([]));
  }, [favoritesVersion]);

  return (
    <div className="bg-surface-container rounded-xl p-6 lg:p-8 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">{t("ИЗБРАННОЕ")}</span>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-1">{t("Сохранённые места")}</h2>
        </div>
        <Link className="text-primary hover:text-tertiary font-label-md text-label-md flex items-center gap-1" to="/#places">
          <span>{t("Смотреть все места")}</span>
          <Icon name="arrow_forward" className="text-[18px]" />
        </Link>
      </div>

      {favorites === null && <div className="h-40 rounded-xl bg-surface-container-low animate-pulse" />}
      {favorites?.length === 0 && (
        <p className="text-body-md text-on-surface-variant">{t("Пока пусто. Нажмите ♥ на карточке места, чтобы сохранить его сюда.")}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {favorites?.map(({ id, place_detail: p }) => (
          <div
            key={id}
            className="group bg-surface-container-low rounded-xl overflow-hidden shadow-sm hover:bg-surface-container-high transition-all flex flex-col justify-between cursor-pointer"
            onClick={() => openPlace(p.id)}
          >
            <div className="relative h-36 overflow-hidden">
              <PlaceBackground place={p} />
              <span className="absolute top-2 right-2 bg-surface-container-lowest/80 backdrop-blur-md text-primary font-label-sm text-label-sm px-2 py-0.5 rounded">
                {p.category || t("Место")} · {SEASONS[p.best_season]}
              </span>
            </div>
            <div className="p-4 flex flex-col gap-2 flex-1">
              <div className="font-title-md text-title-md text-on-surface leading-snug">{p.name}</div>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                {p.region} · {formatFee(p.entrance_fee)}
              </p>
              <div className="flex items-center justify-between pt-2 mt-auto">
                <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
                  <Icon name="star" filled className="text-[14px]" /> {formatRating(p.average_rating)}
                </span>
                <button
                  className="text-rose-400 hover:text-on-surface transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(p.id, true);
                  }}
                  title={t("Убрать из избранного")}
                  type="button"
                >
                  <Icon name="favorite" filled className="text-[20px]" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
