import { useEffect, useRef, useState } from "react";
import { LANGS, lang, setLang } from "../i18n.js";
import Icon from "./Icon.jsx";

// RU / TJ / EN. Choosing a language saves it and reloads the page.
export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const current = LANGS.find((l) => l.code === lang);

  useEffect(() => {
    const onClick = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="relative" ref={box}>
      <button
        className="flex items-center gap-1 text-slate-300 hover:text-white text-label-md font-label-md px-2 py-1 rounded-md border border-slate-700/60 hover:border-slate-500 transition-colors"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <Icon name="language" className="text-[17px] text-emerald-400" />
        {current.label}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-40 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1 z-50">
          {LANGS.map((l) => (
            <button
              key={l.code}
              className={`w-full text-left px-4 py-2 text-body-sm flex items-center justify-between hover:bg-slate-800 ${l.code === lang ? "text-emerald-300" : "text-slate-300"}`}
              onClick={() => (l.code === lang ? setOpen(false) : setLang(l.code))}
              type="button"
            >
              {l.name}
              <span className="text-label-sm font-label-sm text-slate-500">{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
