import { categoryStyle } from "../../utils.js";
import Icon from "../Icon.jsx";

export default function CategoriesSection({ categories, onSelect }) {
  return (
    <section className="py-24 px-6 lg:px-12 bg-surface-container-low border-y border-slate-800/80 scroll-mt-20" id="categories">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-label-md font-label-md text-emerald-400 uppercase tracking-widest mb-2 block">Для души и тела</span>
          <h2 className="text-3xl md:text-headline-lg font-headline-lg text-white mb-4">Выберите свой отдых</h2>
          <p className="text-body-md text-slate-400">
            Горные озёра, целебные источники, ущелья и исторические места — нажмите на категорию, чтобы увидеть подходящие места.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((c) => {
            const style = categoryStyle(c.name);
            return (
              <button
                key={c.id}
                className="text-left bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-emerald-500/40 p-8 rounded-2xl shadow-xl flex flex-col justify-between transition-all group"
                onClick={() => onSelect(c.id)}
                type="button"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon name={style.icon} />
                  </div>
                  <h3 className="text-headline-sm font-headline-sm text-white mb-3">{c.name}</h3>
                  <p className="text-body-sm text-slate-300 mb-6 leading-relaxed">{style.text}</p>
                </div>
                <span className="flex items-center gap-2 text-amber-400 text-label-md font-label-md">
                  Смотреть места <Icon name="arrow_forward" className="text-[18px]" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
