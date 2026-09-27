import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Icon from "./Icon.jsx";
import { TAJIKISTAN_BOX as BOX, inTajikistanBox } from "../utils.js";
import { t } from "../i18n.js";

// Map of Tajikistan for choosing where a place is: click the map or use your own location.
// value: { lat, lng } | null
export default function LocationPicker({ value, onChange }) {
  const box = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);

  useEffect(() => {
    const m = L.map(box.current, {
      center: [38.86, 71.28],
      zoom: 6,
      minZoom: 5,
      maxBounds: L.latLngBounds([BOX.lat[0] - 2, BOX.lng[0] - 3], [BOX.lat[1] + 2, BOX.lng[1] + 3]),
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.on("click", (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    return () => m.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The marker follows the chosen point; a circle marker needs no image files.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    const ok = inTajikistanBox(value);
    const style = { radius: 9, weight: 3, color: "#ffffff", fillColor: ok ? "#10b981" : "#f43f5e", fillOpacity: 1 };
    if (marker.current) marker.current.setLatLng([value.lat, value.lng]).setStyle(style);
    else marker.current = L.circleMarker([value.lat, value.lng], style).addTo(m);
  }, [value]);

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(point);
        map.current?.flyTo([point.lat, point.lng], 12);
      },
      () => {},
      { timeout: 8000 }
    );
  }

  const outside = value && !inTajikistanBox(value);
  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-56 rounded-xl overflow-hidden border border-slate-700" ref={box} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm">
        <span className={outside ? "text-rose-300" : value ? "text-emerald-300" : "text-slate-400"}>
          {outside
            ? t("Точка за пределами Таджикистана — выберите место в Таджикистане.")
            : value
              ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
              : t("Нажмите на карту там, где находится место.")}
        </span>
        <button className="text-emerald-300 hover:text-emerald-200 flex items-center gap-1" onClick={useMyLocation} type="button">
          <Icon name="my_location" className="text-[18px]" /> {t("Моё местоположение")}
        </button>
      </div>
    </div>
  );
}
