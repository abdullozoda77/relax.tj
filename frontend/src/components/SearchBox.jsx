import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import Icon from "./Icon.jsx";
import PlaceBackground from "./PlaceBackground.jsx";
import { t } from "../i18n.js";

// Search in the header. While typing it shows matching places (click or ↑/↓ + Enter opens one);
// the typed text also filters the places on the home page, as before.
export default function SearchBox() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("search") || "");
  const [results, setResults] = useState(null); // null = nothing searched yet
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Set when a suggestion is chosen: clearing the box then must not send the user back to the home page.
  const skipHomeSearch = useRef(false);

  // Keep the input in sync when the search changes from somewhere else (footer links, reset button).
  useEffect(() => {
    setQuery(params.get("search") || "");
  }, [params]);

  // The home page list is filtered 400 ms after the user stops typing.
  useEffect(() => {
    if (skipHomeSearch.current) {
      skipHomeSearch.current = false;
      return;
    }
    const current = params.get("search") || "";
    if (query.trim() === current) return;
    const timer = setTimeout(() => {
      const q = query.trim();
      navigate({ pathname: "/", search: q ? `?search=${encodeURIComponent(q)}` : "" }, { replace: location.pathname === "/" });
    }, 400);
    return () => clearTimeout(timer);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suggestions: places matching the text, those whose name starts with it first.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return setResults(null);
    let cancelled = false;
    const timer = setTimeout(() => {
      api(`/places/?search=${encodeURIComponent(q)}&page_size=12`)
        .then((data) => {
          if (cancelled) return;
          const needle = q.toLowerCase();
          const rank = (p) => (p.name.toLowerCase().startsWith(needle) ? 0 : p.name.toLowerCase().includes(needle) ? 1 : 2);
          setResults([...data.results].sort((a, b) => rank(a) - rank(b)).slice(0, 6));
          setActive(-1);
        })
        .catch(() => {});
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function openPlace(place) {
    setOpen(false);
    skipHomeSearch.current = true;
    navigate(`/places/${place.id}`);
    setQuery("");
  }

  // All results: the home page list filtered by the text (works from any page).
  function showAll() {
    setOpen(false);
    const q = query.trim();
    navigate({ pathname: "/", search: q ? `?search=${encodeURIComponent(q)}` : "", hash: "#places" });
  }

  function onKeyDown(e) {
    const count = results?.length || 0;
    if (e.key === "ArrowDown" && count) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % count);
    } else if (e.key === "ArrowUp" && count) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? count - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (open && active >= 0 && results?.[active]) openPlace(results[active]);
      else showAll();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && query.trim().length >= 2 && results !== null;

  return (
    // Its width can shrink (down to 6rem, before the user name) when the header is short of space, e.g. with a large system font.
    <div className="relative hidden sm:block w-40 xl:w-52 min-w-[6rem] shrink-[6]">
      <Icon name="search" className="absolute z-10 left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none" />
      <input
        aria-autocomplete="list"
        aria-expanded={showList}
        className="pl-9 pr-4 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-body-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 w-full transition-colors"
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={t("Поиск мест...")}
        role="combobox"
        type="search"
        value={query}
      />
      {showList && (
        // mousedown would blur the input and close the list before the click lands, so it is prevented.
        <div
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-slate-950/95 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden z-50"
          onMouseDown={(e) => e.preventDefault()}
          role="listbox"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-body-sm text-slate-400">{t("Ничего не найдено")}</p>
          ) : (
            results.map((p, i) => (
              <button
                key={p.id}
                aria-selected={i === active}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${i === active ? "bg-slate-800" : "hover:bg-slate-800/70"}`}
                onClick={() => openPlace(p)}
                onMouseEnter={() => setActive(i)}
                role="option"
                type="button"
              >
                <span className="group relative w-12 h-10 rounded-lg overflow-hidden shrink-0">
                  <PlaceBackground place={p} />
                </span>
                <span className="min-w-0">
                  <span className="block text-body-sm text-slate-100 truncate">{p.name}</span>
                  <span className="block text-label-sm font-label-sm text-slate-400 truncate">
                    {t(p.region)}
                    {p.category ? ` · ${t(p.category)}` : ""}
                  </span>
                </span>
              </button>
            ))
          )}
          <button
            className="w-full px-4 py-2.5 text-left text-label-md font-label-md text-emerald-300 hover:bg-slate-800/70 border-t border-slate-800 flex items-center gap-1.5"
            onClick={showAll}
            type="button"
          >
            <Icon name="travel_explore" className="text-[16px]" /> {t("Все результаты для «{0}»", query.trim())}
          </button>
        </div>
      )}
    </div>
  );
}
