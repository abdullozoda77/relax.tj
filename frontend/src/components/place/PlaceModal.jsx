import { useCallback, useEffect, useState } from "react";
import { api } from "../../api.js";
import { useUi } from "../../context/UiContext.jsx";
import { SEASONS, formatFee, formatRating, plural } from "../../utils.js";
import FavoriteButton from "../FavoriteButton.jsx";
import Icon from "../Icon.jsx";
import Modal from "../Modal.jsx";
import PlaceBackground from "../PlaceBackground.jsx";
import Stars from "../Stars.jsx";
import Reviews from "./Reviews.jsx";

function InfoChip({ icon, children }) {
  return (
    <span className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-700/60 px-3 py-1.5 rounded-lg text-body-sm text-slate-200">
      <Icon name={icon} className="text-[18px] text-emerald-400" />
      {children}
    </span>
  );
}

function Section({ title, text }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="text-label-md font-label-md text-emerald-400 uppercase tracking-widest mb-2">{title}</h3>
      <p className="text-body-md text-slate-300 leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  );
}

function SimilarPlaces({ placeId }) {
  const { openPlace } = useUi();
  const [places, setPlaces] = useState([]);

  useEffect(() => {
    api(`/places/${placeId}/similar/`).then(setPlaces).catch(() => setPlaces([]));
  }, [placeId]);

  if (!places.length) return null;
  return (
    <div className="border-t border-slate-800 pt-8">
      <h3 className="text-headline-sm font-headline-sm text-white mb-4">Похожие места</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {places.slice(0, 6).map((p) => (
          <button
            key={p.id}
            className="group relative h-32 rounded-xl overflow-hidden border border-slate-800 hover:border-emerald-500/40 text-left"
            onClick={() => openPlace(p.id)}
            type="button"
          >
            <PlaceBackground place={p} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
            <div className="absolute bottom-0 p-3">
              <p className="text-body-sm text-white font-semibold">{p.name}</p>
              <p className="text-label-sm font-label-sm text-emerald-400">
                {p.region} · ★ {formatRating(p.average_rating)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PlaceModal({ id, onClose }) {
  const [place, setPlace] = useState(null);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api(`/places/${id}/`)
      .then((data) => setPlace({ ...data, main_image: data.images[0]?.image || null }))
      .catch((err) => setError(err.message));
  }, [id]);

  const onSummary = useCallback((s) => setSummary(s), []);

  if (error || !place) {
    return (
      <Modal onClose={onClose} wide>
        <div className="h-96 flex items-center justify-center text-slate-400">{error || "Загрузка..."}</div>
      </Modal>
    );
  }

  const rating = summary ? summary.average : place.average_rating;
  const reviewsCount = summary ? summary.total : place.reviews_count;

  return (
    <Modal onClose={onClose} wide>
      <div className="group relative h-72 overflow-hidden rounded-t-2xl">
        <PlaceBackground className="rounded-t-2xl" place={place} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md px-3 py-1 rounded-full text-label-sm font-label-sm">
            {place.category?.name || "Без категории"}
          </span>
          <h2 className="text-3xl font-headline-lg font-bold text-white mt-3">{place.name}</h2>
          <p className="flex items-center gap-1.5 text-emerald-400 text-label-md font-label-md mt-2">
            <Icon name="location_on" className="text-[18px]" />
            {place.region.name}
            {place.address && `, ${place.address}`}
          </p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-headline-lg font-headline-lg text-white">{formatRating(rating)}</span>
            <div>
              <Stars rating={rating || 0} size={18} />
              <p className="text-body-sm text-slate-400">{plural(reviewsCount, ["отзыв", "отзыва", "отзывов"])}</p>
            </div>
          </div>
          <FavoriteButton large place={place} />
        </div>

        <div className="flex flex-wrap gap-2">
          <InfoChip icon="wb_sunny">{SEASONS[place.best_season]}</InfoChip>
          <InfoChip icon="payments">{formatFee(place.entrance_fee)}</InfoChip>
          {place.altitude && <InfoChip icon="elevation">{place.altitude} м над уровнем моря</InfoChip>}
          <InfoChip icon="visibility">{plural(place.views_count, ["просмотр", "просмотра", "просмотров"])}</InfoChip>
        </div>

        <Section text={place.description} title="Описание" />
        <Section text={place.how_to_get_there} title="Как добраться" />
        {place.latitude && place.longitude && (
          <a
            className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-body-sm"
            href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=12/${place.latitude}/${place.longitude}`}
            rel="noreferrer"
            target="_blank"
          >
            <Icon name="map" className="text-[18px]" />
            Открыть на карте
          </a>
        )}

        {place.activities.length > 0 && (
          <div>
            <h3 className="text-label-md font-label-md text-emerald-400 uppercase tracking-widest mb-3">Чем заняться</h3>
            <div className="flex flex-wrap gap-2">
              {place.activities.map((a) => (
                <span key={a.id} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-label-sm font-label-sm">
                  {a.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {place.images.length > 1 && (
          <div className="grid grid-cols-3 gap-3">
            {place.images.slice(1, 7).map((img) => (
              <a key={img.id} href={img.image} rel="noreferrer" target="_blank">
                <img alt="" className="h-28 w-full object-cover rounded-xl border border-slate-800" src={img.image} />
              </a>
            ))}
          </div>
        )}

        <div className="border-t border-slate-800 pt-8">
          <Reviews onSummary={onSummary} placeId={place.id} />
        </div>
        <SimilarPlaces placeId={place.id} />
      </div>
    </Modal>
  );
}
