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
  Rectangle,
  VerticalOrigin,
} from "cesium";
import { api } from "../../api.js";
import { useUi } from "../../context/UiContext.jsx";
import { formatRating } from "../../utils.js";
import { createViewer, pin } from "../cesium.js";
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
const TAJIKISTAN = Rectangle.fromDegrees(67.3, 36.6, 75.2, 41.1);

// All places on a 3D map of Tajikistan. Click a pin to fly there and see a short card.
export default function PlacesMap3D() {
  const { openPlace } = useUi();
  const box = useRef(null);
  const container = useRef(null);
  const viewerRef = useRef(null);
  const [places, setPlaces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

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
    viewer.camera.setView({ destination: TAJIKISTAN });
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(71.0, 34.2, 520000),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-48), roll: 0 },
      duration: 2.5,
    });

    viewer.selectedEntityChanged.addEventListener((entity) => {
      const place = entity?.properties?.place?.getValue();
      viewer.selectedEntity = undefined;
      if (!place) return;
      setSelected(place);
      viewer.camera.flyToBoundingSphere(
        new BoundingSphere(Cartesian3.fromDegrees(Number(place.longitude), Number(place.latitude), place.altitude || 0), 1),
        { offset: new HeadingPitchRange(CesiumMath.toRadians(-20), CesiumMath.toRadians(-25), (place.altitude || 0) >= 1000 ? 9000 : 2500), duration: 2.5 }
      );
    });
    return () => viewer.destroy();
  }, []);

  // Pins and name labels; labels appear only when the camera is close enough.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.entities.removeAll();
    places.forEach((p) => {
      viewer.entities.add({
        position: Cartesian3.fromDegrees(Number(p.longitude), Number(p.latitude)),
        billboard: pin(CATEGORY_COLORS[p.category] || "#f59e0b", null, 40),
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
  }, [places]);

  function showAll() {
    setSelected(null);
    viewerRef.current?.camera.flyTo({
      destination: Cartesian3.fromDegrees(71.0, 34.2, 520000),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-48), roll: 0 },
      duration: 2,
    });
  }

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
      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
        <button className={button} onClick={showAll} type="button">
          <Icon name="public" className="text-[16px] text-emerald-400" /> {t("Весь Таджикистан")}
        </button>
      </div>
      <button className={`${button} absolute right-3 top-3`} onClick={fullscreen} title={t("Во весь экран")} type="button">
        <Icon name="fullscreen" className="text-[18px] text-emerald-400" />
      </button>

      <div className="absolute left-3 bottom-10 hidden md:flex flex-col gap-1 bg-slate-950/75 backdrop-blur-md rounded-lg p-3">
        {Object.entries(CATEGORY_COLORS).map(([name, color]) => (
          <span key={name} className="flex items-center gap-2 text-label-sm font-label-sm text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} /> {name}
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
            <span className="text-label-sm font-label-sm text-amber-300">{selected.category || t("Место")}</span>
            <span className="font-headline-sm text-headline-sm text-white leading-tight">{selected.name}</span>
            <span className="text-body-sm text-slate-400">
              {selected.region} · ★ {formatRating(selected.average_rating)}
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
