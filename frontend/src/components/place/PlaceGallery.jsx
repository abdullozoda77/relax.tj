import { useUi } from "../../context/UiContext.jsx";
import { formatRating } from "../../utils.js";
import Icon from "../Icon.jsx";
import PlaceBackground from "../PlaceBackground.jsx";

// Big photo on the left and three smaller tiles on the right.
// Tiles show more photos of the place; if there are not enough, similar places fill them.
export default function PlaceGallery({ place, similar }) {
  const { openPlace } = useUi();
  const photos = place.images.map((img) => ({ ...place, main_image: img.image }));
  const main = photos[0] || place;
  const tiles = [
    ...photos.slice(1, 4).map((p, i) => ({ key: `img-${i}`, place: p, title: place.name })),
    ...similar.map((p) => ({ key: `sim-${p.id}`, place: p, title: p.name, similar: true })),
  ].slice(0, 3);

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full my-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-auto md:h-[520px]">
        <div className="md:col-span-7 relative group rounded-2xl overflow-hidden shadow-2xl bg-surface-container-low min-h-[320px]">
          <PlaceBackground place={main} />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/90 via-surface-container-lowest/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/90 text-primary font-label-sm text-label-sm backdrop-blur-md">
                <Icon name="landscape" className="text-[16px]" /> {place.region.name}
                {place.altitude ? ` · ${place.altitude} м` : ""}
              </span>
              <span className="text-title-md font-title-md text-on-surface">{place.name}</span>
            </div>
            {place.images.length > 0 && (
              <a
                className="bg-surface-container-high/80 hover:bg-surface-container text-on-surface p-2.5 rounded-full backdrop-blur-md transition-colors"
                href={place.images[0].image}
                rel="noreferrer"
                target="_blank"
                title="Открыть фото"
              >
                <Icon name="fullscreen" className="text-[20px]" />
              </a>
            )}
          </div>
        </div>

        <div className="md:col-span-5 grid grid-cols-2 gap-4">
          {tiles.map((tile, i) => (
            <button
              key={tile.key}
              className={`${i === 2 ? "col-span-2 min-h-[170px]" : "min-h-[150px]"} relative group rounded-2xl overflow-hidden shadow-xl bg-surface-container-low text-left disabled:cursor-default`}
              disabled={!tile.similar}
              onClick={() => tile.similar && openPlace(tile.place.id)}
              type="button"
            >
              <PlaceBackground place={tile.place} />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/85 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                <span className="text-label-sm font-label-sm text-on-surface font-medium truncate">
                  {tile.similar ? `Похожее: ${tile.title}` : tile.title}
                </span>
                {tile.similar && (
                  <span className="inline-flex items-center gap-1 text-label-sm font-label-sm text-secondary shrink-0">
                    <Icon name="star" filled className="text-[14px]" /> {formatRating(tile.place.average_rating)}
                  </span>
                )}
              </div>
            </button>
          ))}
          {tiles.length === 0 && (
            <div className="col-span-2 rounded-2xl bg-surface-container-low flex items-center justify-center text-body-sm text-on-surface-variant p-6 text-center">
              Фотографии появятся после загрузки администратором.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
