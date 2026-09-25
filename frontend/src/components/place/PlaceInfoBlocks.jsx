import { useState } from "react";
import { SEASONS, formatFee } from "../../utils.js";
import Icon from "../Icon.jsx";
import { t } from "../../i18n.js";

const card = "bg-surface-container-low/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl";
const DUSHANBE_ALTITUDE = 800;
const SOMONI_PEAK = 7495;

function SectionTitle({ label, title, accent = "text-primary", children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <span className={`text-label-sm font-label-sm uppercase tracking-wider ${accent}`}>{label}</span>
        <h2 className="text-headline-md font-headline-md text-on-surface">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function MetricsBar({ place }) {
  const metrics = [
    { icon: "wb_sunny", label: t("Сезон"), value: SEASONS[place.best_season] },
    { icon: "altitude", label: t("Высота"), value: place.altitude ? t("{0} м", place.altitude) : "—", accent: true },
    { icon: "payments", label: t("Вход"), value: formatFee(place.entrance_fee) },
    { icon: "location_on", label: t("Регион"), value: t(place.region.name) },
    { icon: "category", label: t("Категория"), value: place.category ? t(place.category.name) : "—", accent: true },
    { icon: "visibility", label: t("Просмотры"), value: place.views_count },
  ];
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-12 w-full my-4">
      <div className="bg-surface-container-low/80 backdrop-blur-md rounded-2xl p-6 shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  m.accent ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
                }`}
              >
                <Icon name={m.icon} className="text-[22px]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">{m.label}</span>
                <span className={`text-body-lg font-body-lg font-semibold truncate ${m.accent ? "text-secondary" : "text-on-surface"}`}>{m.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Map from OpenStreetMap and an altitude scale from Dushanbe up to Ismoil Somoni Peak.
export function LocationCard({ place }) {
  const lat = Number(place.latitude);
  const lng = Number(place.longitude);
  const hasMap = place.latitude && place.longitude;
  const d = 0.08;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
  const percent = (h) => Math.min(100, (h / SOMONI_PEAK) * 100);

  return (
    <section className={`${card} flex flex-col gap-6`}>
      <SectionTitle label={t("Расположение и высота")} title={t("Где находится")}>
        {hasMap && (
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
        )}
      </SectionTitle>
      {hasMap ? (
        <iframe
          className="w-full h-64 rounded-xl border-0 bg-surface-container-lowest"
          loading="lazy"
          src={mapUrl}
          title={t("Карта: {0}", place.name)}
        />
      ) : (
        <p className="text-body-md text-on-surface-variant">{t("Координаты этого места пока не указаны.")}</p>
      )}
      {place.altitude && (
        <div className="bg-surface-container-lowest/80 rounded-xl p-4 flex flex-col gap-3">
          <div className="relative h-3 rounded-full bg-surface-container-high">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/40 to-primary" style={{ width: `${percent(place.altitude)}%` }} />
            <span className="absolute -top-1 w-5 h-5 rounded-full bg-secondary border-2 border-surface" style={{ left: `calc(${percent(place.altitude)}% - 10px)` }} />
            <span className="absolute -top-0.5 w-4 h-4 rounded-full bg-primary/70 border-2 border-surface" style={{ left: `calc(${percent(DUSHANBE_ALTITUDE)}% - 8px)` }} />
          </div>
          <div className="flex items-center justify-between text-label-sm font-label-sm text-outline">
            <span>{t("Душанбе (")}{DUSHANBE_ALTITUDE} {t("м)")}</span>
            <span className="text-secondary font-semibold">
              {place.name} ({place.altitude} {t("м)")}
            </span>
            <span>{t("Пик Исмоила Сомони (")}{SOMONI_PEAK} {t("м)")}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function AccordionItem({ item, open, onToggle }) {
  return (
    <div className="bg-surface-container-low/70 backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-300">
      <button className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-surface-container/50 transition-colors" onClick={onToggle} type="button">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0 text-primary">
            <Icon name={item.icon} className="text-[24px]" />
          </div>
          <div>
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-label-sm font-label-sm">{item.badge}</span>
            <h3 className="text-title-md font-title-md text-on-surface mt-1">{item.title}</h3>
          </div>
        </div>
        <Icon name="expand_more" className={`text-outline transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-6 pb-6 pt-2 text-body-md font-body-md text-on-surface-variant leading-relaxed whitespace-pre-line">{item.content}</div>}
    </div>
  );
}

export function DetailsAccordion({ place }) {
  const items = [
    { icon: "description", badge: t("О месте"), title: t("Описание"), content: place.description },
    { icon: "directions_car", badge: t("Дорога"), title: t("Как добраться"), content: place.how_to_get_there },
    {
      icon: "hiking",
      badge: t("{0} активностей", place.activities.length),
      title: t("Чем заняться"),
      content: place.activities.length ? (
        <div className="flex flex-wrap gap-2">
          {place.activities.map((a) => (
            <span key={a.id} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-label-sm font-label-sm">
              {t(a.name)}
            </span>
          ))}
        </div>
      ) : null,
    },
    { icon: "home_pin", badge: t("Адрес"), title: t("Точное место"), content: place.address },
  ].filter((item) => item.content);

  const [openSet, setOpenSet] = useState(() => new Set([0]));
  const allOpen = openSet.size === items.length;
  const toggle = (i) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-label-sm font-label-sm text-primary uppercase tracking-wider">{t("Подробности")}</span>
          <h2 className="text-3xl md:text-headline-lg font-headline-lg text-on-surface">{t("Всё о месте")}</h2>
        </div>
        <button
          className="text-label-sm font-label-sm text-primary hover:text-tertiary transition-colors flex items-center gap-1"
          onClick={() => setOpenSet(allOpen ? new Set() : new Set(items.map((_, i) => i)))}
          type="button"
        >
          <span>{allOpen ? t("Свернуть всё") : t("Развернуть всё")}</span>
          <Icon name={allOpen ? "unfold_less" : "unfold_more"} className="text-[16px]" />
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {items.map((item, i) => (
          <AccordionItem key={item.title} item={item} onToggle={() => toggle(i)} open={openSet.has(i)} />
        ))}
      </div>
    </section>
  );
}

// "What's there" and "Keep in mind", built from the place's own data.
export function GoodToKnow({ place }) {
  const fee = Number(place.entrance_fee);
  const good = [
    ...place.activities.map((a) => t("Можно заняться: {0}", t(a.name).toLowerCase())),
    fee === 0 && t("Вход бесплатный"),
    place.best_season === "all_year" && t("Можно приезжать в любое время года"),
    place.latitude && t("Точка отмечена на карте — легко найти"),
  ].filter(Boolean);
  const warnings = [
    fee > 0 && t("Вход платный: {0}", formatFee(fee)),
    place.altitude > 2500 && t("Высота {0} м — поднимайтесь постепенно, возможна горная болезнь", place.altitude),
    place.altitude > 1500 && t("В горах погода меняется быстро — возьмите тёплую одежду"),
    place.best_season !== "all_year" && t("Лучшее время для поездки — {0}", SEASONS[place.best_season].toLowerCase()),
  ].filter(Boolean);

  const List = ({ items, icon, color }) => (
    <ul className="flex flex-col gap-3 text-body-md font-body-md text-on-surface-variant">
      {items.map((text) => (
        <li key={text} className="flex items-start gap-2.5">
          <Icon name={icon} className={`${color} text-[18px] mt-0.5`} />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <section className={card}>
      <SectionTitle label={t("Коротко")} title={t("Что важно знать")} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4 bg-surface-container-lowest/60 p-6 rounded-xl">
          <div className="flex items-center gap-2 text-primary font-semibold text-title-md">
            <Icon name="check_circle" className="text-[22px]" /> {t("Что здесь есть")}
          </div>
          {good.length ? <List color="text-primary" icon="check" items={good} /> : <p className="text-body-md text-on-surface-variant">{t("Информация скоро появится.")}</p>}
        </div>
        <div className="flex flex-col gap-4 bg-surface-container-lowest/60 p-6 rounded-xl">
          <div className="flex items-center gap-2 text-secondary font-semibold text-title-md">
            <Icon name="info" className="text-[22px]" /> {t("Учтите")}
          </div>
          {warnings.length ? <List color="text-outline" icon="priority_high" items={warnings} /> : <p className="text-body-md text-on-surface-variant">{t("Особых ограничений нет.")}</p>}
        </div>
      </div>
    </section>
  );
}

const GEAR = {
  clothes: { winter: [t("Тёплая куртка и шапка"), t("Термобельё"), t("Непромокаемая обувь")], other: [t("Лёгкая одежда и головной убор"), t("Ветровка на вечер"), t("Удобная обувь")] },
  health: [t("Солнцезащитный крем SPF 50"), t("Аптечка и личные лекарства"), t("Вода и перекус")],
  gear: [t("Заряженный телефон и powerbank"), t("Наличные сомони"), t("Фонарик")],
};

export function GearChecklist({ place }) {
  const cold = place.best_season === "winter" || place.altitude > 2500;
  const groups = [
    { icon: "checkroom", title: t("Одежда"), text: "text-primary", dot: "bg-primary", items: cold ? GEAR.clothes.winter : GEAR.clothes.other },
    { icon: "medical_services", title: t("Здоровье"), text: "text-secondary", dot: "bg-secondary", items: GEAR.health },
    { icon: "backpack", title: t("В рюкзак"), text: "text-primary", dot: "bg-primary", items: GEAR.gear },
  ];
  return (
    <section className={card}>
      <SectionTitle accent="text-secondary" label={t("Подготовка")} title={t("Что взять с собой")}>
        <span className="text-label-sm font-label-sm text-outline">{cold ? t("Для холодной погоды") : t("Для тёплого сезона")}</span>
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {groups.map((g) => (
          <div key={g.title} className="bg-surface-container-lowest/60 p-5 rounded-xl flex flex-col gap-3">
            <div className={`flex items-center gap-2 font-medium text-body-lg ${g.text}`}>
              <Icon name={g.icon} className="text-[20px]" /> {g.title}
            </div>
            <ul className="flex flex-col gap-2 text-body-sm font-body-sm text-on-surface-variant">
              {g.items.map((text) => (
                <li key={text} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${g.dot}`} /> {text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
