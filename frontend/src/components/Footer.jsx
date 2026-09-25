import { useState } from "react";
import { Link } from "react-router-dom";
import { useUi } from "../context/UiContext.jsx";
import { LogoMark } from "./Logo.jsx";

const link = "text-body-sm text-slate-400 hover:text-emerald-400 transition-colors";

export default function Footer() {
  const { openSuggest } = useUi();
  const [name, setName] = useState("");
  return (
    <footer className="w-full bg-[#070b0e] border-t border-slate-800/80 py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <LogoMark small />
            <span className="text-headline-sm font-headline-sm text-white">Relax.tj</span>
          </div>
          <p className="text-body-sm text-slate-400 leading-relaxed">
            Места для отдыха в Таджикистане: горы Памира, озёра Фанских гор, санатории и древние крепости.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-label-md font-label-md text-white">Регионы</span>
          <Link className={link} to="/?search=Согд#places">Согдийская область</Link>
          <Link className={link} to="/?search=ГБАО#places">Памир (ГБАО)</Link>
          <Link className={link} to="/?search=Душанбе#places">Душанбе</Link>
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-label-md font-label-md text-white">Разделы</span>
          <Link className={link} to="/#categories">Категории отдыха</Link>
          <Link className={link} to="/#lists">Маршруты</Link>
          <a className={link} href="http://127.0.0.1:8000/swagger/" rel="noreferrer" target="_blank">Документация API</a>
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-label-md font-label-md text-white">Предложить место</span>
          <p className="text-body-sm text-slate-400">Знаете место, которого нет на сайте? Расскажите о нём.</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              openSuggest(name.trim());
            }}
          >
            <input
              className="px-3 py-2 rounded-lg bg-slate-900 text-body-sm border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 flex-1 min-w-0"
              onChange={(e) => setName(e.target.value)}
              placeholder="Название места"
              value={name}
            />
            <button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-label-md font-label-md transition-colors shadow" type="submit">
              Далее
            </button>
          </form>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-12 mt-12 pt-6 border-t border-slate-800/80 text-center text-slate-400 text-label-sm">
        © 2026 Relax.tj. Все права защищены.
      </div>
    </footer>
  );
}
