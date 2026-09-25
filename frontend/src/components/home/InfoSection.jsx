import Icon from "../Icon.jsx";

const TIPS = [
  {
    icon: "event",
    title: "Когда ехать",
    text: "С мая по октябрь — лучшее время для походов, озёр и перевалов. Зимой — лыжи в Сафеддаре.",
    footer: "Май – октябрь",
  },
  {
    icon: "badge",
    title: "Виза и пропуск",
    text: "Иностранцы оформляют e-Visa онлайн. Для поездки на Памир (ГБАО) нужен отдельный пропуск.",
    footer: "Оформление онлайн",
  },
  {
    icon: "directions_car",
    title: "Транспорт",
    text: "На горных дорогах нужен внедорожник 4x4 и опытный местный водитель.",
    footer: "Безопасные 4x4",
  },
];

export default function InfoSection({ onSuggest }) {
  return (
    <section className="py-24 px-6 lg:px-12 bg-[#0b1117] scroll-mt-20" id="info">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1">
          <span className="text-label-md font-label-md text-emerald-400 uppercase tracking-widest mb-2 block">Полезно знать</span>
          <h2 className="text-3xl md:text-headline-lg font-headline-lg text-white mb-6">Советы путешественнику</h2>
          <p className="text-body-md text-slate-400 mb-8 leading-relaxed">
            Планируйте поездку спокойно: когда ехать, какие документы нужны и как добраться до гор.
          </p>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-[#13221d] border border-emerald-900/50 text-white shadow-xl">
            <h4 className="text-headline-sm font-headline-sm mb-2 text-emerald-300">Знаете красивое место?</h4>
            <p className="text-body-sm text-slate-300 mb-4 leading-relaxed">
              Предложите его — после проверки администратором оно появится на сайте.
            </p>
            <button
              className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors px-5 py-2.5 rounded-lg text-label-md font-label-md shadow-md"
              onClick={onSuggest}
              type="button"
            >
              Предложить место
            </button>
          </div>
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIPS.map((tip) => (
            <div key={tip.title} className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <Icon name={tip.icon} className="text-[20px]" />
                </div>
                <h3 className="text-headline-sm font-headline-sm text-white mb-2">{tip.title}</h3>
                <p className="text-body-sm text-slate-300 leading-relaxed">{tip.text}</p>
              </div>
              <span className="text-label-sm font-label-sm text-emerald-400 mt-4 pt-4 border-t border-slate-800">{tip.footer}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
