import { useEffect, useRef, useState } from "react";
import { FullscreenControl, Map, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Icon from "../Icon.jsx";

const ELEVATION_TILES = ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"];

// Free tiles, no API key: satellite photos from Esri and real elevation data (AWS Terrain Tiles).
const STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      // 128 instead of 256 makes MapLibre load tiles one zoom level deeper: twice the detail.
      tileSize: 128,
      maxzoom: 19,
      attribution: "Спутник: Esri, Maxar, Earthstar Geographics",
    },
    elevation: {
      type: "raster-dem",
      tiles: ELEVATION_TILES,
      tileSize: 256,
      encoding: "terrarium",
      maxzoom: 15,
      attribution: "Рельеф: Mapzen, AWS Terrain Tiles",
    },
    // A second copy of the elevation for relief shading (MapLibre recommends a separate source).
    shading: { type: "raster-dem", tiles: ELEVATION_TILES, tileSize: 256, encoding: "terrarium", maxzoom: 15 },
  },
  layers: [
    {
      id: "satellite",
      type: "raster",
      source: "satellite",
      paint: { "raster-contrast": 0.15, "raster-saturation": 0.25, "raster-resampling": "linear" },
    },
    {
      id: "relief",
      type: "hillshade",
      source: "shading",
      paint: { "hillshade-exaggeration": 0.35, "hillshade-shadow-color": "#0b1117", "hillshade-highlight-color": "rgba(255,255,255,0.15)" },
    },
  ],
  terrain: { source: "elevation", exaggeration: 1.5 },
  sky: {
    "sky-color": "#5b9bd5",
    "horizon-color": "#cfe3f3",
    "fog-color": "#0b1117",
    "sky-horizon-blend": 0.6,
    "horizon-fog-blend": 0.6,
    "fog-ground-blend": 0.3,
  },
};

const DEGREES_PER_SECOND = 6;

// Starting camera: mountains are seen from further away, city places from closer.
function startView(place) {
  const mountain = (place.altitude || 0) >= 1000;
  return {
    center: [Number(place.longitude), Number(place.latitude)],
    zoom: mountain ? 13.4 : 16,
    pitch: mountain ? 65 : 55,
    bearing: -20,
  };
}

export default function Terrain3D({ place }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const spinning = useRef(true);
  const [isSpinning, setIsSpinning] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let map;
    try {
      map = new Map({
        container: container.current,
        style: STYLE,
        maxPitch: 85,
        // Render at least at 2x pixel density so photos and edges are sharp on normal screens too.
        pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
        attributionControl: { compact: true },
        ...startView(place),
      });
    } catch {
      setError("Ваш браузер не поддерживает 3D (WebGL).");
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new FullscreenControl(), "top-right");
    new Marker({ color: "#f59e0b" }).setLngLat([Number(place.longitude), Number(place.latitude)]).addTo(map);
    // Hide the "loading" text once satellite tiles are on screen ("idle" never fires while the camera spins).
    const onData = () => {
      if (map.isSourceLoaded("satellite")) {
        setLoading(false);
        map.off("sourcedata", onData);
      }
    };
    map.on("sourcedata", onData);

    // Slowly circle around the place until the user touches the map.
    let frame;
    let last = performance.now();
    const spin = (now) => {
      if (spinning.current && !map.isMoving()) {
        map.setBearing(map.getBearing() + ((now - last) / 1000) * DEGREES_PER_SECOND);
      }
      last = now;
      frame = requestAnimationFrame(spin);
    };
    map.once("load", () => (frame = requestAnimationFrame(spin)));

    const stop = () => {
      spinning.current = false;
      setIsSpinning(false);
    };
    map.on("mousedown", stop);
    map.on("touchstart", stop);
    map.on("wheel", stop);

    return () => {
      cancelAnimationFrame(frame);
      map.remove();
    };
  }, [place]);

  function toggleSpin() {
    spinning.current = !spinning.current;
    setIsSpinning(spinning.current);
  }

  function resetView() {
    mapRef.current?.flyTo({ ...startView(place), duration: 2000 });
    spinning.current = true;
    setIsSpinning(true);
  }

  if (error) {
    return <p className="text-body-md text-on-surface-variant">{error}</p>;
  }

  return (
    <div className="relative w-full h-[420px] md:h-[480px] rounded-xl overflow-hidden bg-surface-container-lowest">
      {/* MapLibre sets position: relative on its container, so size it with w-full h-full */}
      <div className="w-full h-full" ref={container} />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-on-surface-variant text-body-sm pointer-events-none">
          <Icon name="progress_activity" className="animate-spin text-primary" /> Загружаем рельеф и спутниковые снимки...
        </div>
      )}
      <div className="absolute left-3 top-3 flex gap-2">
        <button
          className="bg-surface-container-lowest/80 hover:bg-surface-container backdrop-blur-md text-on-surface text-label-sm font-label-sm px-3 py-2 rounded-lg flex items-center gap-1.5"
          onClick={toggleSpin}
          type="button"
        >
          <Icon name={isSpinning ? "pause" : "360"} className="text-[16px] text-primary" />
          {isSpinning ? "Пауза" : "Облёт"}
        </button>
        <button
          className="bg-surface-container-lowest/80 hover:bg-surface-container backdrop-blur-md text-on-surface text-label-sm font-label-sm px-3 py-2 rounded-lg flex items-center gap-1.5"
          onClick={resetView}
          type="button"
        >
          <Icon name="restart_alt" className="text-[16px] text-primary" /> Сбросить вид
        </button>
      </div>
    </div>
  );
}
