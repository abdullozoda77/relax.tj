// Interface languages: Russian (the texts in the code), Tajik and English (translations.js).
// The key of a translation is the Russian text itself: t("Войти") -> "Login" in English.
// Placeholders: t("{0} мест", 5). Data from the database (place names, descriptions) is not translated.
import { translations } from "./translations.js";

export const LANGS = [
  { code: "ru", label: "RU", name: "Русский" },
  { code: "tg", label: "TJ", name: "Тоҷикӣ" },
  { code: "en", label: "EN", name: "English" },
];

function savedLang() {
  try {
    return localStorage.getItem("lang");
  } catch {
    return null;
  }
}

// Read once on start: many labels are built when modules load, so changing the language reloads the page.
export const lang = LANGS.some((l) => l.code === savedLang()) ? savedLang() : "ru";
document.documentElement.lang = lang;

export function t(text, ...args) {
  const translated = (lang !== "ru" && translations[lang]?.[text]) || text;
  return args.length ? translated.replace(/\{(\d+)\}/g, (_, i) => args[i] ?? "") : translated;
}

export function setLang(code) {
  try {
    localStorage.setItem("lang", code);
  } catch {
    // Private mode: the language will not be remembered.
  }
  window.location.reload();
}

// Locale for dates and numbers.
export function locale() {
  return { ru: "ru-RU", tg: "tg-TJ", en: "en-US" }[lang];
}
