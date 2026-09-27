import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Icon from "./Icon.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import Logo from "./Logo.jsx";
import NotificationBell from "./NotificationBell.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import UserMenu from "./UserMenu.jsx";
import { t } from "../i18n.js";

const NAV = [
  { to: "/#top", label: t("Главная") },
  { to: "/#places", label: t("Места") },
  { to: "/#map", label: t("Карта") },
  { to: "/#categories", label: t("Категории") },
  { to: "/#lists", label: t("Маршруты") },
  { to: "/#info", label: t("Советы") },
];

// True while the home page hero is under the header: the header then floats as a glass bar.
function useOverHero(enabled) {
  const [over, setOver] = useState(true);
  useEffect(() => {
    if (!enabled) return;
    const update = () => setOver(window.scrollY < window.innerHeight * 0.9);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabled]);
  return enabled && over;
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("search") || "");
  const overHero = useOverHero(location.pathname === "/");

  // Keep the input in sync when the search changes from somewhere else (footer links, reset button).
  useEffect(() => {
    setQuery(params.get("search") || "");
  }, [params]);

  // Search runs 400 ms after the user stops typing.
  useEffect(() => {
    const current = params.get("search") || "";
    if (query.trim() === current) return;
    const timer = setTimeout(() => {
      const q = query.trim();
      navigate({ pathname: "/", search: q ? `?search=${encodeURIComponent(q)}` : "" }, { replace: location.pathname === "/" });
    }, 400);
    return () => clearTimeout(timer);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <header
      className={`fixed top-0 w-full z-40 transition-[background-color,padding,border-color,box-shadow] duration-500 ${
        overHero
          ? "px-2 sm:px-4 md:px-8 lg:px-12 pt-4 border-b border-transparent"
          : "bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
      }`}
    >
      <div
        className={`max-w-7xl mx-auto px-3 sm:px-6 lg:px-12 flex items-center justify-between gap-2 sm:gap-4 transition-[height,border-radius] duration-500 ${
          overHero ? "liquid-glass h-16 rounded-xl" : "h-20"
        }`}
      >
        <Logo />
        <nav className="hidden md:flex items-center gap-6">
          {NAV.map((item) => (
            <Link key={item.to} className="text-body-md text-slate-300 hover:text-emerald-400 transition-colors" to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative hidden sm:block">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]" />
            <input
              className="pl-9 pr-4 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-body-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 w-48 focus:w-64 transition-all"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && document.getElementById("places")?.scrollIntoView()}
              placeholder={t("Поиск мест...")}
              type="search"
              value={query}
            />
          </div>
          <LanguageSwitcher />
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
