import { useEffect, useRef, useState } from "react";
import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  HeadingPitchRange,
  HeightReference,
  LabelStyle,
  Math as CesiumMath,
  VerticalOrigin,
} from "cesium";
import { api } from "../../api.js";
import { useUi } from "../../context/UiContext.jsx";
import { categoryStyle, formatRating } from "../../utils.js";
import { createViewer, placeMarker } from "../cesium.js";
import Icon from "../Icon.jsx";
import PlaceBackground from "../PlaceBackground.jsx";
import { t } from "../../i18n.js";

const CATEGORY_COLORS = {
  "Озёра": "#06b6d4",
  "Горы": "#94a3b8",
  "Ущелья": "#f59e0b",
  "Курорты и санатории": "#10b981",
  "Исторические места": "#f97316",
  "Парки": "#22c55e",
  "Музеи": "#a855f7",
  "Долины": "#84cc16",
  "Перевалы и дороги": "#0ea5e9",
};
// The whole Earth seen from space, centred on Central Asia.
const GLOBE = { destination: Cartesian3.fromDegrees(71, 25, 21000000) };
const OVERVIEW = {
  destination: Cartesian3.fromDegrees(71.0, 34.2, 520000),
  orientation: { heading: 0, pitch: CesiumMath.toRadians(-48), roll: 0 },
};
const SPIN_SPEED = 0.06; // radians per second while the globe turns by itself
const PINS_VISIBLE = new DistanceDisplayCondition(0, 3500000); // place pins only near Tajikistan

// All places on a 3D map. It opens as a slowly turning globe; choosing a place (search or pin)
// stops the spin and flies the camera down from space to it.
export default function PlacesMap3D() {
  const { openPlace } = useUi();
  const box = useRef(null);
  const container = useRef(null);
  const viewerRef = useRef(null);
  const [places, setPlaces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const spinning = useRef(true);

  useEffect(() => {
    api("/places/?page_size=100")
      .then((d) => setPlaces(d.results.filter((p) => p.latitude && p.longitude)))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    let viewer;
    try {
      viewer = createViewer(container.current);
    } catch {
      setError(t("Ваш браузер не поддерживает 3D (WebGL)."));
      return;
    }
    viewerRef.current = viewer;
    viewer.camera.setView(GLOBE);

    // The globe turns by itself until the visitor grabs it or chooses a place.
    let last = performance.now();
    const spin = () => {
      const now = performance.now();
      // Turns like the real Earth: from west to east.
      if (spinning.current) viewer.camera.rotate(Cartesian3.UNIT_Z, SPIN_SPEED * Math.min(0.1, (now - last) / 1000));
      last = now;
    };
    viewer.scene.preUpdate.addEventListener(spin);
    const stop = () => (spinning.current = false);
    const canvas = viewer.scene.canvas;
    canvas.addEventListener("pointerdown", stop);
    canvas.addEventListener("wheel", stop, { passive: true });

    // Seen from space, Tajikistan is one glowing point with its name; clicking it flies to the country.
    viewer.entities.add({
      id: "tajikistan",
      position: Cartesian3.fromDegrees(71.2, 38.8),
      point: {
        pixelSize: 12,
        color: Color.fromCssColorString("#34d399"),
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY, // mountains must not cut the dot
        distanceDisplayCondition: new DistanceDisplayCondition(3500000, 1e9),
      },
      label: {
        text: t("Таджикистан"),
        // Drawn at double size and scaled down, so the text stays sharp.
        font: "600 30px Inter, sans-serif",
        scale: 0.5,
        fillColor: Color.WHITE,
        style: LabelStyle.FILL,
        showBackground: true,
        backgroundColor: Color.fromCssColorString("#020617").withAlpha(0.8),
        backgroundPadding: new Cartesian2(16, 10),
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -16),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new DistanceDisplayCondition(3500000, 1e9),
      },
    });

    viewer.selectedEntityChanged.addEventListener((entity) => {
      viewer.selectedEntity = undefined;
      if (entity?.id === "tajikistan") return flyToTajikistan();
      const place = entity?.properties?.place?.getValue();
      if (place) flyToPlace(place);
    });
    return () => {
      viewer.scene.preUpdate.removeEventListener(spin);
      canvas.removeEventListener("pointerdown", stop);
      canvas.removeEventListener("wheel", stop);
      viewer.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Markers and name labels; labels appear only when the camera is close enough.
  // The markers show icons from the Material Symbols font, so they are drawn once it has loaded.
  useEffect(() => {
    let cancelled = false;
    document.fonts
      .load('38px "Material Symbols Outlined"')
      .catch(() => {})
      .then(() => {
        const viewer = viewerRef.current;
        if (cancelled || !viewer || viewer.isDestroyed()) return;
        addMarkers(viewer);
      });
    return () => {
      cancelled = true;
    };
  }, [places]); // eslint-disable-line react-hooks/exhaustive-deps

  function addMarkers(viewer) {
    viewer.entities.values.filter((e) => e.properties?.place).forEach((e) => viewer.entities.remove(e));
    places.forEach((p) => {
      viewer.entities.add({
        position: Cartesian3.fromDegrees(Number(p.longitude), Number(p.latitude)),
        billboard: { ...placeMarker(CATEGORY_COLORS[p.category] || "#f59e0b", categoryStyle(p.category).icon), distanceDisplayCondition: PINS_VISIBLE },
        label: {
          text: p.name,
          font: "600 14px Inter, sans-serif",
          fillColor: Color.WHITE,
          outlineColor: Color.fromCssColorString("#0b1117"),
          outlineWidth: 4,
          style: LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: VerticalOrigin.TOP,
          pixelOffset: new Cartesian2(0, 6),
          heightReference: HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new DistanceDisplayCondition(0, 150000),
        },
        properties: { place: p },
      });
    });
  }

  // From wherever the camera is (even from space), fly down to the place and show its card.
  function flyToPlace(place) {
    spinning.current = false;
    setSelected(place);
    setQuery("");
    const high = (place.altitude || 0) >= 1000;
    viewerRef.current?.camera.flyToBoundingSphere(
      new BoundingSphere(Cartesian3.fromDegrees(Number(place.longitude), Number(place.latitude), place.altitude || 0), 1),
      { offset: new HeadingPitchRange(CesiumMath.toRadians(-20), CesiumMath.toRadians(-25), high ? 9000 : 2500), duration: 4.5 }
    );
  }

  function flyToTajikistan() {
    spinning.current = false;
    setSelected(null);
    viewerRef.current?.camera.flyTo({ ...OVERVIEW, duration: 3.5 });
  }

  // Back to space: the globe starts turning again.
  function showGlobe() {
    setSelected(null);
    viewerRef.current?.camera.flyTo({ ...GLOBE, duration: 3.5, complete: () => (spinning.current = true) });
  }

  const needle = query.trim().toLowerCase();
  const matches = needle ? places.filter((p) => p.name.toLowerCase().includes(needle)).slice(0, 7) : [];

  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else box.current?.requestFullscreen();
  }

  if (error) return <p className="text-body-md text-slate-400">{error}</p>;

  const button =
    "bg-slate-950/80 hover:bg-slate-900 backdrop-blur-md text-slate-100 text-label-sm font-label-sm px-3 py-2 rounded-lg flex items-center gap-1.5";

  return (
    <div className="relative w-full h-[560px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800" ref={box}>
      <div className="w-full h-full" ref={container} />
      <div className="absolute left-3 top-3 right-14 flex flex-wrap items-start gap-2">
        <div className="relative w-64 max-w-full">
          <Icon name="search" className="absolute z-10 left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none" />
          <input
            className="w-full bg-slate-950/80 backdrop-blur-md text-slate-100 placeholder-slate-400 text-body-sm pl-9 pr-3 py-2 rounded-lg border border-slate-700/60 focus:outline-none focus:border-emerald-400"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && matches[0] && flyToPlace(matches[0])}
            placeholder={t("Найти место…")}
            type="search"
            value={query}
          />
          {needle && (
            <ul className="absolute left-0 right-0 top-full mt-1 bg-slate-950/95 backdrop-blur-md border border-slate-700/60 rounded-lg overflow-hidden shadow-2xl z-10">
              {matches.map((p) => (
                <li key={p.id}>
                  <button className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2" onClick={() => flyToPlace(p)} type="button">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[p.category] || "#f59e0b" }} />
                    <span className="text-body-sm text-slate-100 truncate">{p.name}</span>
                    <span className="ml-auto text-label-sm font-label-sm text-slate-400 shrink-0">{t(p.region)}</span>
                  </button>
                </li>
              ))}
              {matches.length === 0 && <li className="px-3 py-2 text-body-sm text-slate-400">{t("Ничего не найдено")}</li>}
            </ul>
          )}
        </div>
        <button className={button} onClick={showGlobe} type="button">
          <Icon name="public" className="text-[16px] text-emerald-400" /> {t("Глобус")}
        </button>
        <button className={button} onClick={flyToTajikistan} type="button">
          <Icon name="map" className="text-[16px] text-emerald-400" /> {t("Весь Таджикистан")}
        </button>
      </div>
      <button className={`${button} absolute right-3 top-3`} onClick={fullscreen} title={t("Во весь экран")} type="button">
        <Icon name="fullscreen" className="text-[18px] text-emerald-400" />
      </button>

      <div className="absolute left-3 bottom-10 hidden md:flex flex-col gap-1 bg-slate-950/75 backdrop-blur-md rounded-lg p-3">
        {Object.entries(CATEGORY_COLORS).map(([name, color]) => (
          <span key={name} className="flex items-center gap-2 text-label-sm font-label-sm text-slate-200">
            <span className="w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-[rgba(255,255,255,0.9)]" style={{ background: color }}>
              <Icon name={categoryStyle(name).icon} className="text-[12px] text-[#fff]" />
            </span>
            {t(name)}
          </span>
        ))}
      </div>

      {selected && (
        <div className="absolute right-3 bottom-10 w-72 max-w-[calc(100%-1.5rem)] bg-slate-950/90 backdrop-blur-md border border-slate-700/60 rounded-xl overflow-hidden shadow-2xl">
          <div className="group relative h-32">
            <PlaceBackground place={selected} />
            <button className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-950/80 text-slate-200 flex items-center justify-center" onClick={() => setSelected(null)} type="button">
              <Icon name="close" className="text-[16px]" />
            </button>
          </div>
          <div className="p-4 flex flex-col gap-1">
            <span className="text-label-sm font-label-sm text-amber-300">{selected.category ? t(selected.category) : t("Место")}</span>
            <span className="font-headline-sm text-headline-sm text-white leading-tight">{selected.name}</span>
            <span className="text-body-sm text-slate-400">
              {t(selected.region)} · ★ {formatRating(selected.average_rating)}
              {selected.altitude ? t(" · {0} м", selected.altitude) : ""}
            </span>
            <button
              className="mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2 rounded-lg text-label-md font-label-md"
              onClick={() => openPlace(selected.id)}
              type="button"
            >
              {t("Подробнее")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
