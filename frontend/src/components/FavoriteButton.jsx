import { useUi } from "../context/UiContext.jsx";
import Icon from "./Icon.jsx";

// Heart on a card (round) or a big button in the place window (large).
export default function FavoriteButton({ place, large = false }) {
  const { isFavorite, toggleFavorite } = useUi();
  const fav = isFavorite(place);

  const onClick = (e) => {
    e.stopPropagation();
    toggleFavorite(place.id, fav);
  };

  if (large) {
    return (
      <button
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md font-label-md border transition-all ${
          fav ? "bg-rose-500/15 border-rose-400/40 text-rose-300" : "bg-slate-800 border-slate-700 text-slate-200 hover:border-rose-400/40"
        }`}
        onClick={onClick}
        type="button"
      >
        <Icon filled={fav} name="favorite" className="text-[18px]" />
        {fav ? "В избранном" : "В избранное"}
      </button>
    );
  }

  return (
    <button
      className={`absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-slate-950/60 backdrop-blur-md border border-slate-700/60 hover:border-rose-400/60 flex items-center justify-center transition-all ${
        fav ? "text-rose-400" : "text-slate-300"
      }`}
      onClick={onClick}
      title="Избранное"
      type="button"
    >
      <Icon filled={fav} name="favorite" className="text-[20px]" />
    </button>
  );
}
