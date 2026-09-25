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

export default function Hero({ stats = {}, onNearby }) {
  return (
    <section className="relative min-h-[860px] flex flex-col justify-between pt-12 pb-16 px-6 lg:px-12 overflow-hidden bg-[#070c11] text-white">
      <svg className="absolute inset-x-0 bottom-0 w-full h-[70%] z-0 opacity-60" preserveAspectRatio="none" viewBox="0 0 1440 600">
        <path d="M0 600V330l140-120 110 90 190-210 150 150 120-90 200 230 160-170 190 160 180-190v420Z" fill="#13221d" />
        <path d="M0 600V420l200-130 140 90 210-160 170 150 150-80 180 140 190-120 200 110v180Z" fill="#0f1a17" />
        <path d="M440 90l-38 42 18 4 20-22 16 26 22-6Z" fill="#cbd5e1" opacity=".5" />
        <path d="M950 170l-30 34 16 2 14-14 14 20 16-4Z" fill="#cbd5e1" opacity=".4" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1117] via-[#0b1117]/40 to-[#070c11]/70 z-0" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

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
