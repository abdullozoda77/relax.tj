import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";

// Light / dark theme switch. The choice is saved in localStorage; index.html applies it before React starts.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains("light") ? "light" : "dark"));

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Private mode can block localStorage; the theme still works until reload.
    }
  }, [theme]);

  const light = theme === "light";
  return (
    <button
      className="w-9 h-9 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
      onClick={() => setTheme(light ? "dark" : "light")}
      title={light ? "Тёмная тема" : "Светлая тема"}
      type="button"
    >
      <Icon filled name={light ? "dark_mode" : "light_mode"} className={`text-[21px] ${light ? "" : "text-amber-400"}`} />
    </button>
  );
}
