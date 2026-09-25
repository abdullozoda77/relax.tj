import { useEffect, useState } from "react";
import Icon from "../Icon.jsx";

function Stat({ value, title, text, amber }) {
  const color = amber
    ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
    : "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
  return (
    <div className="flex items-center gap-4">
      <div className={`min-w-14 h-14 px-2 rounded-xl border flex items-center justify-center text-headline-md font-headline-md shadow-inner ${color}`}>
        {value ?? "—"}
      </div>
      <div>
        <h3 className="text-headline-sm font-headline-sm text-white">{title}</h3>
        <p className="text-body-sm text-slate-400">{text}</p>
      </div>
    </div>
  );
}

// Photos from Wikimedia Commons, saved in public/hero. The licenses require showing the author,
// so the credit is shown under the slide.
const PHOTOS = [
  {
    src: "/hero/rudaki.jpg",
    place: "Душанбе · Памятник Рудаки",
    author: "Шухрат Саъдиев",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:-Rudaki_in_Park_Dushanbe_city.jpg",
  },
  {
    src: "/hero/flagpole.jpg",
    place: "Душанбе · Площадь Дусти и флагшток",
    author: "Adam Harangozó",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Panorama_with_Dousti_Square_and_Dushanbe_Flagpole.jpg",
  },
  {
    src: "/hero/palace.jpg",
    place: "Душанбе · Парк Рудаки и Дворец нации",
    author: "Maris Teteris",
    license: "CC BY 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Ustod_Rudaki_Park_and_Palace_of_the_Nation_in_Dushanbe_-_panoramio.jpg",
  },
  {
    src: "/hero/city.jpg",
    place: "Душанбе · Современный центр",
    author: "Adam Harangozó",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Panorama_with_buildings,_Dushanbe.jpg",
  },
  {
    src: "/hero/yashikul.jpg",
    place: "Памир · Озеро Яшилькуль",
    author: "Kondephy",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Pamir_Mountains,_Lake_Yashikul_viewed_from_the_south_(August_2017).jpg",
  },
];
const SLIDE_MS = 6000;

export default function Hero({ stats = {}, onNearby }) {
  const [slide, setSlide] = useState(0);

  // Next photo every 6 seconds. Changing `slide` by a dot click restarts the timer.
  useEffect(() => {
    const timer = setTimeout(() => setSlide((s) => (s + 1) % PHOTOS.length), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [slide]);

  const photo = PHOTOS[slide];

  return (
    <section className="relative min-h-[860px] flex flex-col justify-between pt-12 pb-16 px-6 lg:px-12 overflow-hidden bg-surface-container-lowest text-white">
      {PHOTOS.map((p, i) => (
        <div
          key={p.src}
          aria-hidden
          className={`absolute inset-0 z-0 bg-cover bg-center transition-[opacity,transform] ease-out ${
            i === slide ? "opacity-100 scale-105 duration-[1500ms,7000ms]" : "opacity-0 scale-100 duration-[1500ms,0ms]"
          }`}
          style={{ backgroundImage: `url("${p.src}")` }}
        />
      ))}
      {/* Dark gradients keep the text readable on any photo */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-surface-container-lowest/85 via-surface-container-lowest/50 to-transparent" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-surface via-surface/20 to-surface-container-lowest/50" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute right-6 lg:right-12 bottom-[250px] md:bottom-[170px] z-10 flex flex-col items-end gap-2 text-right">
        <div className="flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-md border border-slate-700/60 px-3 py-1.5 rounded-full text-label-sm font-label-sm text-slate-200">
          <Icon name="location_on" className="text-[14px] text-emerald-400" />
          {photo.place}
        </div>
        <a className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors" href={photo.page} rel="noreferrer" target="_blank">
          Фото: {photo.author}, {photo.license}, Wikimedia Commons
        </a>
        <div className="flex gap-1.5">
          {PHOTOS.map((p, i) => (
            <button
              key={p.src}
              aria-label={p.place}
              className={`h-1.5 rounded-full transition-all ${i === slide ? "w-6 bg-emerald-400" : "w-1.5 bg-slate-500 hover:bg-slate-300"}`}
              onClick={() => setSlide(i)}
              type="button"
            />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full z-10 flex flex-col items-start my-auto py-16">
        <div className="inline-flex items-center gap-2 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-4 py-1.5 rounded-full text-label-md font-label-md mb-6 shadow-[0_0_16px_rgba(16,185,129,0.15)] backdrop-blur-md">
          <Icon name="landscape" filled className="text-[18px] text-emerald-400" />
          <span>Крыша мира</span>
        </div>
        <h1 className="text-4xl md:text-headline-xl font-headline-xl max-w-4xl tracking-tight mb-6 text-white drop-shadow-sm">
          Лучшие места для отдыха в Таджикистане
        </h1>
        <p className="text-body-lg text-slate-300 max-w-2xl mb-10 leading-relaxed">
          Горные озёра Фанских гор, Памир, ущелья Варзоба, горячие источники и древние крепости — находите места, читайте
          отзывы и собирайте свои маршруты.
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <a
            className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-all px-8 py-4 rounded-xl text-label-md font-label-md shadow-lg shadow-amber-950/40 flex items-center gap-2"
            href="#places"
          >
            <span>Смотреть места</span>
            <Icon name="arrow_forward" className="text-[18px]" />
          </a>
          {onNearby && (
            <button
              className="bg-slate-900/80 backdrop-blur-md text-white hover:bg-slate-800 hover:border-emerald-500/40 transition-all px-8 py-4 rounded-xl text-label-md font-label-md border border-slate-700/80 flex items-center gap-2 shadow-lg"
              onClick={onNearby}
              type="button"
            >
              <Icon name="near_me" className="text-[18px] text-emerald-400" />
              <span>Места рядом со мной</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full z-10 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/70 backdrop-blur-xl p-8 rounded-2xl border border-slate-700/60 shadow-2xl">
        <Stat amber value={stats.places} title="Мест для отдыха" text="Озёра, горы, ущелья и санатории" />
        <Stat value={stats.regions} title="Регионов" text="От Худжанда до Памира" />
        <Stat amber value={stats.activities} title="Видов активностей" text="Походы, рыбалка, лыжи и купание" />
      </div>
    </section>
  );
}
