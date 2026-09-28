import { useEffect, useState } from "react";
import Icon from "../Icon.jsx";
import { t } from "../../i18n.js";

// Photos from Wikimedia Commons, saved in public/hero. The licenses require showing the author,
// so the credit is shown under the tag.
const PHOTOS = [
  {
    src: "/hero/iskanderkul.jpg",
    place: t("Фанские горы · Озеро Искандеркуль"),
    author: "Marat Nadjibaev",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Iskanderkul_9.jpg",
  },
  {
    src: "/hero/rudaki.jpg",
    place: t("Душанбе · Памятник Рудаки"),
    author: t("Шухрат Саъдиев"),
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:-Rudaki_in_Park_Dushanbe_city.jpg",
  },
  {
    src: "/hero/alaudin.jpg",
    place: t("Фанские горы · Алаудинские озёра"),
    author: "Marat Nadjibaev",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Alaudin_14.jpg",
  },
  {
    src: "/hero/flagpole.jpg",
    place: t("Душанбе · Площадь Дусти и флагшток"),
    author: "Adam Harangozó",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Panorama_with_Dousti_Square_and_Dushanbe_Flagpole.jpg",
  },
  {
    src: "/hero/kulikalon.jpg",
    place: t("Фанские горы · Озеро Куликалон"),
    author: "Adam Harangozó",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Kulikalon_Lake_and_Fann_Mountains,_Tajikistan.jpg",
  },
  {
    src: "/hero/palace.jpg",
    place: t("Душанбе · Парк Рудаки и Дворец нации"),
    author: "Maris Teteris",
    license: "CC BY 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Ustod_Rudaki_Park_and_Palace_of_the_Nation_in_Dushanbe_-_panoramio.jpg",
  },
  {
    src: "/hero/karakul.jpg",
    place: t("Памир · Озеро Каракуль"),
    author: "Benoît Vicart",
    license: "CC0",
    page: "https://commons.wikimedia.org/wiki/File:Lake_Karakul.jpg",
  },
  {
    src: "/hero/city.jpg",
    place: t("Душанбе · Современный центр"),
    author: "Adam Harangozó",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Panorama_with_buildings,_Dushanbe.jpg",
  },
  {
    src: "/hero/sarez.jpg",
    place: t("Памир · Сарезское озеро"),
    author: "Marat Nadjibaev",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Sarez_lake_35.jpg",
  },
  {
    src: "/hero/yashikul.jpg",
    place: t("Памир · Озеро Яшилькуль"),
    author: "Kondephy",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Pamir_Mountains,_Lake_Yashikul_viewed_from_the_south_(August_2017).jpg",
  },
];
const SLIDE_MS = 6000;
const FADE_MS = 1800; // crossfade from one photo to the next
const ZOOM_MS = SLIDE_MS + FADE_MS * 2; // the slow zoom keeps going while the next photo fades in
// Each photo zooms towards a different point, so every slide moves differently.
const ORIGINS = ["50% 35%", "20% 45%", "80% 55%", "35% 75%", "70% 30%"];

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The new photo fades in on top, from a soft blur to sharp, and starts its slow zoom.
// The previous one stays fully visible underneath and keeps zooming, so there is no dark dip or jump.
// Phones get 960 px copies of the photos (about 6 times lighter), computers the 1920 px ones.
const PHOTO_DIR = window.matchMedia("(max-width: 767px)").matches ? "/hero/small/" : "/hero/";
const photoUrl = (photo) => PHOTO_DIR + photo.src.split("/").pop();

function slideStyle(i, { slide, prev }, ready) {
  const still = reducedMotion();
  // Only the photo on screen, the one fading out and the next one are downloaded; the others wait their turn.
  const needed = i === slide || i === prev || i === (slide + 1) % PHOTOS.length;
  const base = {
    backgroundImage: needed ? `url("${photoUrl(PHOTOS[i])}")` : "none",
    transformOrigin: ORIGINS[i % ORIGINS.length],
  };
  const moving = `opacity ${FADE_MS}ms ease-in-out, filter ${FADE_MS}ms ease-out, transform ${ZOOM_MS}ms linear`;
  if (i === slide && !ready) return { ...base, zIndex: 2, opacity: 1 }; // first paint, before the zoom starts
  if (i === slide) {
    return still
      ? { ...base, zIndex: 2, opacity: 1, transition: `opacity ${FADE_MS}ms ease-in-out` }
      : { ...base, zIndex: 2, opacity: 1, transform: "scale(1.14)", filter: "blur(0px)", transition: moving };
  }
  if (i === prev) return { ...base, zIndex: 1, opacity: 1, transform: still ? "none" : "scale(1.14)", transition: still ? "none" : moving };
  // Hidden photos wait, reset and slightly blurred, for their turn.
  return { ...base, zIndex: 0, opacity: 0, transform: "scale(1)", filter: still ? "none" : "blur(10px)", transition: "none" };
}

function FadeIn({ delay = 0, duration = 1000, className = "", children }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return (
    <div className={`transition-opacity ${shown ? "opacity-100" : "opacity-0"} ${className}`} style={{ transitionDuration: `${duration}ms` }}>
      {children}
    </div>
  );
}

// Each letter slides in from the left one after another. Letters are grouped by word,
// so long lines wrap between words and never in the middle of one.
// `lineClasses[i]` styles line i (the second line of the hero heading is the green accent).
function AnimatedHeading({ text, start = 200, charDelay = 30, className = "", lineClasses = [] }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), start);
    return () => clearTimeout(timer);
  }, [start]);

  let index = 0;
  return (
    <h1 aria-label={text.replace("\n", " ")} className={className} style={{ letterSpacing: "-0.04em" }}>
      {text.split("\n").map((line, li) => (
        <span key={li} aria-hidden className={`block ${lineClasses[li] || ""}`}>
          {/* A dash stays on the line of the word before it. */}
          {line.split(/ (?=[^—])/).map((word, wi) => (
            <span key={wi}>
              {wi > 0 && " "}
              <span className="inline-block whitespace-nowrap">
                {[...word].map((char, ci) => {
                  const delay = index++ * charDelay;
                  return (
                    <span
                      key={ci}
                      className="inline-block transition-[opacity,transform] duration-500 ease-out"
                      style={{
                        opacity: shown ? 1 : 0,
                        transform: shown ? "translateX(0)" : "translateX(-18px)",
                        transitionDelay: `${delay}ms`,
                      }}
                    >
                      {char === " " ? "\u00a0" : char}
                    </span>
                  );
                })}
              </span>
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}

export default function Hero({ onNearby }) {
  const [show, setShow] = useState({ slide: 0, prev: -1 });
  const [ready, setReady] = useState(false);
  const { slide } = show;
  const goTo = (i) => setShow((s) => (s.slide === i ? s : { slide: i, prev: s.slide }));

  // Start the first photo's zoom after the first paint, so it animates too.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Next photo every 6 seconds. Changing the slide by a dot click restarts the timer.
  useEffect(() => {
    const timer = setTimeout(() => goTo((slide + 1) % PHOTOS.length), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [slide]);

  const photo = PHOTOS[slide];

  return (
    <section className="relative h-screen -mt-20 overflow-hidden bg-[#000] text-[#fff] font-body-md">
      {/* z-0 keeps the photos' own stacking inside this box, under the shade and the text. */}
      <div aria-hidden className="absolute inset-0 z-0">
        {PHOTOS.map((p, i) => (
          <div key={p.src} className="absolute inset-0 bg-cover bg-center will-change-transform" style={slideStyle(i, show, ready)} />
        ))}
      </div>
      {/* Darken the photos, most of all on the left and at the bottom where the text is, so it reads well. */}
      <div aria-hidden className="absolute inset-0 bg-[rgba(0,0,0,0.35)]" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[rgba(0,0,0,0.55)] via-[rgba(0,0,0,0.2)] to-transparent" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.6)] via-transparent to-transparent" />
      <div className="relative h-full flex flex-col px-6 md:px-12 lg:px-16 pt-28">
        <div className="flex-1 flex flex-col justify-end pb-12 lg:pb-16 lg:grid lg:grid-cols-[3fr_2fr] lg:items-end gap-8">
          {/* The hero always sits on a dark photo, so its colours are fixed and do not follow the light theme. */}
          <div className="hero-shadow max-w-3xl">
            <FadeIn delay={100}>
              <span className="liquid-glass-dark inline-flex items-center gap-2 border border-[rgba(255,255,255,0.18)] rounded-full px-4 py-1.5 mb-6 text-label-md font-label-md uppercase tracking-[0.2em] text-[#a7f3d0]">
                <Icon name="landscape" filled className="text-[18px] text-[#34d399]" />
                {t("Крыша мира")}
              </span>
            </FadeIn>
            <AnimatedHeading
              className="font-label-md font-extrabold text-[2.3rem] leading-[1.1] sm:text-[3.4rem] lg:text-[3.9rem] xl:text-[4.4rem] mb-6"
              lineClasses={["", "text-[#6ee7b7]"]}
              start={250}
              text={t("Таджикистан —\nрай на земле.")}
            />
            <FadeIn delay={900}>
              <p className="max-w-xl border-l-2 border-[#34d399] pl-4 mb-8 text-base md:text-lg leading-relaxed text-[rgba(255,255,255,0.88)]">
                {t("Горные озёра, ущелья и древние крепости — находите места, читайте отзывы и собирайте маршруты.")}
              </p>
            </FadeIn>
            <FadeIn className="flex flex-wrap gap-3 sm:gap-4" delay={1250}>
              <a
                className="press group bg-[#10b981] hover:bg-[#34d399] text-[#022c22] font-semibold px-7 py-3.5 rounded-xl flex items-center gap-2 shadow-[0_12px_32px_-10px_rgba(16,185,129,0.7)] transition-colors"
                href="#places"
              >
                {t("Смотреть места")}
                <Icon name="arrow_forward" className="text-[20px] transition-transform group-hover:translate-x-1" />
              </a>
              {onNearby && (
                <button
                  className="liquid-glass-dark border border-[rgba(255,255,255,0.25)] text-[#fff] hover:bg-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.45)] font-semibold px-7 py-3.5 rounded-xl flex items-center gap-2 transition-colors"
                  onClick={onNearby}
                  type="button"
                >
                  <Icon name="near_me" className="text-[19px] text-[#6ee7b7]" />
                  {t("Места рядом со мной")}
                </button>
              )}
            </FadeIn>
          </div>

          <FadeIn className="flex flex-col items-start lg:items-end gap-3" delay={1400}>
            {/* Keyed by slide, so the place name and credit fade in with each new photo. */}
            <div key={slide} className="fade-up flex flex-col items-start lg:items-end gap-3">
              <div className="hero-shadow flex items-center gap-1.5 text-sm text-[#e5e7eb]">
                <Icon name="location_on" className="text-[16px] text-[#34d399]" />
                {photo.place}
              </div>
              <a className="hero-shadow text-[11px] text-[rgba(255,255,255,0.7)] hover:text-[#fff] transition-colors" href={photo.page} rel="noreferrer" target="_blank">
                {t("Фото:")} {photo.author}, {photo.license}, Wikimedia Commons
              </a>
            </div>
            {/* The active dot fills up while its photo is shown. */}
            <div className="flex items-center gap-1.5">
              {PHOTOS.map((p, i) => (
                <button
                  key={p.src}
                  aria-label={p.place}
                  className={`relative h-1.5 rounded-full overflow-hidden transition-all duration-500 ${
                    i === slide ? "w-10 bg-[rgba(255,255,255,0.25)]" : "w-1.5 bg-[rgba(255,255,255,0.5)] hover:bg-[#fff]"
                  }`}
                  onClick={() => goTo(i)}
                  type="button"
                >
                  {i === slide && <span key={slide} className="slide-progress absolute inset-y-0 left-0 bg-[#34d399]" style={{ animationDuration: `${SLIDE_MS}ms` }} />}
                </button>
              ))}
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Scroll hint: a dot moving down inside a mouse outline. */}
      <FadeIn className="hidden lg:flex absolute bottom-8 left-1/2 -translate-x-1/2" delay={2000}>
        <a aria-label={t("Смотреть места")} className="w-6 h-10 rounded-full border-2 border-[rgba(255,255,255,0.6)] flex justify-center pt-2 hover:border-[#fff] transition-colors" href="#places">
          <span className="scroll-hint w-1 h-2 rounded-full bg-[#fff]" />
        </a>
      </FadeIn>
    </section>
  );
}
