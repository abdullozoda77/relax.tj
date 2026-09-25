import { useUi } from "../context/UiContext.jsx";
import { SEASONS, formatFee, formatRating } from "../utils.js";
import FavoriteButton from "./FavoriteButton.jsx";
import Icon from "./Icon.jsx";
import PlaceBackground from "./PlaceBackground.jsx";
import { t } from "../i18n.js";

export default function PlaceCard({ place }) {
  const { openPlace } = useUi();
  return (
    <article
      className="group relative rounded-2xl overflow-hidden bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 shadow-xl transition-all duration-300 flex flex-col justify-end h-[420px] cursor-pointer"
      onClick={() => openPlace(place.id)}
    >
      <PlaceBackground place={place} />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      <FavoriteButton place={place} />
      {place.distance_km != null && (
        <span className="absolute top-4 left-4 z-20 bg-slate-950/70 backdrop-blur-md text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-label-sm font-label-sm flex items-center gap-1">
          <Icon name="near_me" className="text-[14px]" />
          {place.distance_km} {t("км")}
        </span>
      )}
      <div className="relative z-10 p-8 flex flex-col justify-end h-full">
        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md self-start px-3 py-1 rounded-full text-label-sm font-label-sm mb-3">
          {place.category ? t(place.category) : t("Без категории")}
        </span>
        <h3 className="text-headline-md font-headline-md text-white mb-2">{place.name}</h3>
        <p className="text-body-sm text-slate-300 mb-4">
          {SEASONS[place.best_season]} · {formatFee(place.entrance_fee)}
        </p>
        <div className="flex items-center justify-between gap-2 text-label-sm font-label-sm">
          <span className="flex items-center gap-2 text-emerald-400 min-w-0">
            <Icon name="location_on" className="text-[16px]" />
            <span className="truncate">{t(place.region)}</span>
          </span>
          <span className="flex items-center gap-3 text-slate-300 shrink-0">
            <span className="flex items-center gap-1">
              <Icon name="star" filled className="text-[16px] text-amber-400" />
              {formatRating(place.average_rating)}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="visibility" className="text-[16px]" />
              {place.views_count ?? 0}
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}

export function SkeletonCards({ count = 3 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="rounded-2xl h-[420px] bg-slate-900/80 border border-slate-800 animate-pulse" />
  ));
}
