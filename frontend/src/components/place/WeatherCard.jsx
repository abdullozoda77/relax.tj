import { useEffect, useState } from "react";
import Icon from "../Icon.jsx";

// WMO weather codes used by Open-Meteo -> text and Material icon.
const CODES = [
  [[0], "Ясно", "sunny"],
  [[1, 2], "Переменная облачность", "partly_cloudy_day"],
  [[3], "Пасмурно", "cloud"],
  [[45, 48], "Туман", "foggy"],
  [[51, 53, 55, 56, 57], "Морось", "rainy_light"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "Дождь", "rainy"],
  [[71, 73, 75, 77, 85, 86], "Снег", "weather_snowy"],
  [[95, 96, 99], "Гроза", "thunderstorm"],
];

function describe(code) {
  const found = CODES.find(([codes]) => codes.includes(code));
  return found ? { text: found[1], icon: found[2] } : { text: "—", icon: "help" };
}

const DAY = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
const DATE = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

// Free forecast from open-meteo.com (no API key). Temperature is for the real height of the place.
export default function WeatherCard({ place }) {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!place.latitude || !place.longitude) return;
    const params = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "Asia/Dushanbe",
      forecast_days: 7,
      wind_speed_unit: "ms",
    });
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setWeather)
      .catch(() => setError(true));
  }, [place]);

  if (!place.latitude || !place.longitude || error) return null;

  const now = weather?.current;
  const current = now && describe(now.weather_code);

  return (
    <section className="bg-surface-container-low/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-label-sm font-label-sm text-primary uppercase tracking-wider">Прогноз</span>
          <h2 className="text-headline-md font-headline-md text-on-surface">Погода на месте</h2>
        </div>
        <span className="text-label-sm font-label-sm text-outline">Open-Meteo · обновляется каждый час</span>
      </div>

      {!weather ? (
        <div className="h-40 rounded-xl bg-surface-container-lowest animate-pulse" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-6 bg-surface-container-lowest/60 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <Icon name={current.icon} filled className="text-secondary text-[56px]" />
              <div>
                <div className="text-5xl font-headline-lg font-semibold text-on-surface">{Math.round(now.temperature_2m)}°</div>
                <div className="text-body-md text-on-surface-variant">{current.text}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 flex-1 min-w-[240px]">
              {[
                ["thermostat", "Ощущается", `${Math.round(now.apparent_temperature)}°`],
                ["water_drop", "Влажность", `${now.relative_humidity_2m}%`],
                ["air", "Ветер", `${Math.round(now.wind_speed_10m)} м/с`],
              ].map(([icon, label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-label-sm font-label-sm text-outline flex items-center gap-1">
                    <Icon name={icon} className="text-[14px]" /> {label}
                  </span>
                  <span className="text-title-md font-title-md text-on-surface">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {weather.daily.time.map((day, i) => {
              const d = describe(weather.daily.weather_code[i]);
              const date = new Date(`${day}T12:00:00`);
              return (
                <div key={day} className={`rounded-xl p-3 flex flex-col items-center gap-1 text-center ${i === 0 ? "bg-primary/10" : "bg-surface-container-lowest/60"}`}>
                  <span className="text-label-sm font-label-sm text-on-surface capitalize">{i === 0 ? "Сегодня" : DAY.format(date)}</span>
                  <span className="text-[10px] text-outline">{DATE.format(date)}</span>
                  <Icon name={d.icon} filled className="text-secondary text-[26px]" />
                  <span className="text-body-sm text-on-surface font-semibold">
                    {Math.round(weather.daily.temperature_2m_max[i])}° <span className="text-outline font-normal">{Math.round(weather.daily.temperature_2m_min[i])}°</span>
                  </span>
                  <span className="text-[10px] text-primary flex items-center gap-0.5">
                    <Icon name="umbrella" className="text-[12px]" />
                    {weather.daily.precipitation_probability_max[i] ?? 0}%
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
