import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { plural } from "../../utils.js";
import Icon from "../Icon.jsx";

function TravelListCard({ list, highlighted, onCopy }) {
  const box = highlighted
    ? "bg-slate-900/95 border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)] lg:-translate-y-2"
    : "bg-slate-900/90 border border-slate-800 hover:border-slate-700";
  return (
    <div className={`${box} rounded-2xl p-8 shadow-xl flex flex-col justify-between relative transition-all`}>
      {highlighted && (
        <div className="absolute -top-3.5 right-8 bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded-full text-label-sm font-label-sm shadow-md">
          Популярный
        </div>
      )}
      <div>
        <div className="flex justify-between items-start mb-6 gap-3">
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-label-sm font-label-sm">
            {plural(list.places_count, ["место", "места", "мест"])}
          </span>
          <span className="text-body-sm text-slate-400 flex items-center gap-1">
            <Icon name="person" className="text-[16px]" />
            {list.user.username}
          </span>
        </div>
        <Link className="block text-headline-md font-headline-md text-white mb-3 hover:text-emerald-300 transition-colors" to={`/lists/${list.id}`}>
          {list.title}
        </Link>
        <p className="text-body-sm text-slate-300 mb-6 leading-relaxed">{list.description || "Маршрут без описания"}</p>
        <ul className="space-y-3 mb-8 text-body-sm text-slate-200">
          {list.items.slice(0, 3).map((item) => (
            <li key={item.id} className="flex items-center gap-2.5">
              <Icon name="check_circle" className="text-[18px] text-emerald-400" />
              <span>{item.place_detail.name}</span>
            </li>
          ))}
          {list.items.length > 3 && <li className="text-slate-400 pl-7">и ещё {list.items.length - 3}</li>}
        </ul>
      </div>
      <Link className="mb-3 text-center text-label-md font-label-md text-emerald-300 hover:text-emerald-200 flex items-center justify-center gap-1.5" to={`/lists/${list.id}`}>
        <Icon name="map" className="text-[18px]" /> Маршрут на 3D-карте
      </Link>
      {onCopy && (
        <button
          className={`w-full ${
            highlighted
              ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
              : "bg-slate-800 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30"
          } transition-all py-3 rounded-xl text-label-md font-label-md`}
          onClick={() => onCopy(list)}
          type="button"
        >
          Скопировать себе
        </button>
      )}
    </div>
  );
}

export default function ListsSection({ onCopy }) {
  const [lists, setLists] = useState(null);

  useEffect(() => {
    api("/travel-lists/public/?page_size=3")
      .then((data) => setLists(data.results))
      .catch(() => setLists([]));
  }, []);

  return (
    <section className="py-24 px-6 lg:px-12 bg-[#0e1620] border-t border-slate-800/80 scroll-mt-20" id="lists">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-label-md font-label-md text-emerald-400 uppercase tracking-widest mb-2 block">От путешественников</span>
          <h2 className="text-3xl md:text-headline-lg font-headline-lg text-white mb-4">Популярные маршруты</h2>
          <p className="text-body-md text-slate-400">
            Открытые списки путешествий других пользователей. Скопируйте понравившийся маршрут к себе.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {lists?.map((list, i) => (
            <TravelListCard key={list.id} highlighted={lists.length === 3 && i === 1} list={list} onCopy={onCopy} />
          ))}
        </div>
        {lists?.length === 0 && (
          <p className="text-center text-slate-400">Пока нет открытых маршрутов. Создайте свой и сделайте его публичным!</p>
        )}
      </div>
    </section>
  );
}
