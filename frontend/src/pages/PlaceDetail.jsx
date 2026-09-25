import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import Icon from "../components/Icon.jsx";
import PlaceCard from "../components/PlaceCard.jsx";
import PlaceGallery from "../components/place/PlaceGallery.jsx";
import { DetailsAccordion, GearChecklist, GoodToKnow, LocationCard, MetricsBar } from "../components/place/PlaceInfoBlocks.jsx";
import PlaceSidebar from "../components/place/PlaceSidebar.jsx";
import Reviews from "../components/place/Reviews.jsx";
import Stars from "../components/Stars.jsx";
import { SEASONS, formatRating, plural } from "../utils.js";

// The 3D map library is big, so it is loaded only when a place page opens.
const Terrain3D = lazy(() => import("../components/place/Terrain3D.jsx"));

function Terrain3DSection({ place }) {
  return (
    <section className="bg-surface-container-low/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-label-sm font-label-sm text-primary uppercase tracking-wider">Как в жизни</span>
          <h2 className="text-headline-md font-headline-md text-on-surface">3D-вид местности</h2>
        </div>
        <span className="text-label-sm font-label-sm text-outline flex items-center gap-1.5">
          <Icon name="3d_rotation" className="text-[16px]" /> Тяните мышью, чтобы вращать · правой кнопкой — наклон
        </span>
      </div>
      <Suspense fallback={<div className="h-[420px] rounded-xl bg-surface-container-lowest animate-pulse" />}>
        <Terrain3D place={place} />
      </Suspense>
    </section>
  );
}

export default function PlaceDetail() {
  const { id } = useParams();
  const [place, setPlace] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    setPlace(null);
    setSummary(null);
    setError("");
    api(`/places/${id}/`)
      .then(setPlace)
      .catch((err) => setError(err.status === 404 ? "Такое место не найдено." : err.message));
    api(`/places/${id}/similar/`).then(setSimilar).catch(() => setSimilar([]));
  }, [id]);

  const onSummary = useCallback((s) => setSummary(s), []);

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-6 py-32 text-center">
        <Icon name="wrong_location" className="text-secondary text-[48px]" />
        <h1 className="font-headline-md text-headline-md text-on-surface mt-4 mb-6">{error}</h1>
        <Link className="text-primary hover:underline" to="/#places">
          ← Ко всем местам
        </Link>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 space-y-6">
        <div className="h-40 rounded-2xl bg-surface-container-low animate-pulse" />
        <div className="h-[420px] rounded-2xl bg-surface-container-low animate-pulse" />
      </div>
    );
  }

  const rating = summary ? summary.average : place.average_rating;
  const reviewsCount = summary ? summary.total : place.reviews_count;
  const teaser = place.description?.split("\n")[0];

  return (
    <div className="flex flex-col w-full bg-surface">
      <section className="relative w-full overflow-hidden bg-surface-container-lowest py-8 md:py-12">
        <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest via-surface-container-low/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-wrap items-center gap-3 text-label-sm font-label-sm text-outline mb-4">
            <Link className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5" to="/#places">
              <Icon name="arrow_back" className="text-[16px]" />
              <span>Места</span>
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="text-on-surface-variant">{place.region.name}</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-medium tracking-wide">{place.name}</span>
            <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              Лучший сезон: {SEASONS[place.best_season].toLowerCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm">
                  <Icon name="terrain" className="text-[15px]" /> {place.category?.name || "Без категории"}
                </span>
                {place.altitude && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                    <Icon name="altitude" className="text-[15px]" /> {place.altitude} м над уровнем моря
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-headline-xl font-headline-xl text-on-surface leading-tight tracking-tight">{place.name}</h1>
              {teaser && <p className="text-body-lg font-body-lg text-on-surface-variant max-w-3xl leading-relaxed">{teaser}</p>}
            </div>
            <div className="lg:col-span-4 flex lg:justify-end">
              <div className="bg-surface-container-low/90 backdrop-blur-md p-5 rounded-2xl flex flex-col gap-2 w-full sm:w-auto shadow-xl">
                <div className="flex items-baseline gap-2">
                  <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">Рейтинг</span>
                  <span className="text-headline-lg font-headline-lg text-primary">{formatRating(rating)}</span>
                  <span className="text-label-sm font-label-sm text-on-surface-variant">из 5</span>
                </div>
                <div className="flex items-center gap-3 text-label-sm font-label-sm text-on-surface-variant">
                  <Stars rating={rating || 0} size={17} />
                  <span>({plural(reviewsCount, ["отзыв", "отзыва", "отзывов"])})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PlaceGallery place={place} similar={similar} />
      <MetricsBar place={place} />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 flex flex-col gap-14 min-w-0">
            {place.latitude && place.longitude && <Terrain3DSection place={place} />}
            <LocationCard place={place} />
            <DetailsAccordion place={place} />
            <GoodToKnow place={place} />
            <GearChecklist place={place} />
            <section className="bg-surface-container-low/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl">
              <Reviews onSummary={onSummary} placeId={place.id} />
            </section>
          </div>
          <div className="lg:col-span-4 lg:sticky lg:top-28">
            <PlaceSidebar place={place} />
          </div>
        </div>

        {similar.length > 0 && (
          <section className="mt-16">
            <span className="text-label-sm font-label-sm text-primary uppercase tracking-wider">Ещё места</span>
            <h2 className="text-3xl md:text-headline-lg font-headline-lg text-on-surface mb-8">Похожие места</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {similar.slice(0, 3).map((p) => (
                <PlaceCard key={p.id} place={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
