import { useEffect, useRef, useState } from "react";
import {
  Cartesian3,
  Cartographic,
  Color,
  HeadingPitchRange,
  HeightReference,
  JulianDate,
  Math as CesiumMath,
  PinBuilder,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Terrain,
  VerticalOrigin,
  Viewer,
  sampleTerrainMostDetailed,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import Icon from "../Icon.jsx";

// Cesium loads its workers and images from here (see cesiumStatic() in vite.config.js).
window.CESIUM_BASE_URL = "/cesium/";

// Cesium World Terrain + Bing Maps Aerial through Cesium ion. Without our own ion account Cesium uses
// the public token built into the library, which is meant for demos: fine for this project.

const DEGREES_PER_SECOND = 5;
// Sun position: a summer day in Tajikistan (12:00 local time), bright light with soft shadows on slopes.
const SUNNY_DAY = JulianDate.fromIso8601("2026-06-21T07:00:00Z");

// Mountains are looked at from further away, city places from closer.
function startView(place) {
  const mountain = (place.altitude || 0) >= 1000;
  return new HeadingPitchRange(CesiumMath.toRadians(-20), CesiumMath.toRadians(mountain ? -22 : -32), mountain ? 5200 : 1400);
}

export default function Terrain3D({ place }) {
  const box = useRef(null);
  const container = useRef(null);
  const viewerRef = useRef(null);
  const targetRef = useRef(null);
  const spinning = useRef(true);
  const [isSpinning, setIsSpinning] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let viewer;
    try {
      viewer = new Viewer(container.current, {
        terrain: Terrain.fromWorldTerrain({ requestVertexNormals: true, requestWaterMask: true }),
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
      });
    } catch {
      setError("Ваш браузер не поддерживает 3D (WebGL).");
      return;
    }
    viewerRef.current = viewer;
    const { scene, camera } = viewer;

    // Quality: full pixel density, more detailed terrain, sunlight, atmosphere and anti-aliasing.
    viewer.useBrowserRecommendedResolution = false;
    scene.globe.maximumScreenSpaceError = 1.2;
    scene.globe.enableLighting = true;
    scene.light.intensity = 3; // default 2 looks too dark on satellite photos
    scene.highDynamicRange = false; // HDR tone mapping makes the photos dull and dark
    scene.globe.depthTestAgainstTerrain = true;
    scene.postProcessStages.fxaa.enabled = true;
    scene.fog.density = 0.00012;
    viewer.clock.currentTime = SUNNY_DAY.clone();
    viewer.clock.shouldAnimate = false;

    const lng = Number(place.longitude);
    const lat = Number(place.latitude);
    viewer.entities.add({
      position: Cartesian3.fromDegrees(lng, lat),
      billboard: {
        image: new PinBuilder().fromColor(Color.fromCssColorString("#f59e0b"), 48).toDataURL(),
        verticalOrigin: VerticalOrigin.BOTTOM,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    // Look at the place from above, then circle around it. Mouse dragging also rotates around the place.
    targetRef.current = Cartesian3.fromDegrees(lng, lat, place.altitude || 0);
    camera.lookAt(targetRef.current, startView(place));
    // When the real terrain is ready, aim exactly at the ground height of the place.
    const removeTerrainListener = scene.terrainProviderChanged.addEventListener(async () => {
      try {
        const [point] = await sampleTerrainMostDetailed(scene.terrainProvider, [Cartographic.fromDegrees(lng, lat)]);
        if (viewer.isDestroyed()) return;
        targetRef.current = Cartesian3.fromDegrees(lng, lat, point.height || place.altitude || 0);
        camera.lookAt(targetRef.current, startView(place));
      } catch {
        // Keep the altitude from our database if the terrain height can not be read.
      }
    });

    let last = performance.now();
    const spin = () => {
      const now = performance.now();
      if (spinning.current) camera.rotateRight(CesiumMath.toRadians(((now - last) / 1000) * DEGREES_PER_SECOND));
      last = now;
    };
    scene.preRender.addEventListener(spin);

    // The camera keeps moving, so new tiles keep loading: hide the text when almost everything is loaded,
    // or after 10 seconds at the latest.
    const removeProgress = scene.globe.tileLoadProgressEvent.addEventListener((queue) => {
      if (queue < 5) setLoading(false);
    });
    const loadingTimer = setTimeout(() => setLoading(false), 10000);

    const input = new ScreenSpaceEventHandler(scene.canvas);
    const stop = () => {
      spinning.current = false;
      setIsSpinning(false);
    };
    [
      ScreenSpaceEventType.LEFT_DOWN,
      ScreenSpaceEventType.RIGHT_DOWN,
      ScreenSpaceEventType.MIDDLE_DOWN,
      ScreenSpaceEventType.WHEEL,
      ScreenSpaceEventType.PINCH_START,
    ].forEach((type) => input.setInputAction(stop, type));

    return () => {
      clearTimeout(loadingTimer);
      removeTerrainListener();
      removeProgress();
      input.destroy();
      viewer.destroy();
    };
  }, [place]);

  function toggleSpin() {
    spinning.current = !spinning.current;
    setIsSpinning(spinning.current);
  }

  function resetView() {
    const viewer = viewerRef.current;
    if (!viewer || !targetRef.current) return;
    viewer.camera.lookAt(targetRef.current, startView(place));
    spinning.current = true;
    setIsSpinning(true);
  }

  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else box.current?.requestFullscreen();
  }

  if (error) {
    return <p className="text-body-md text-on-surface-variant">{error}</p>;
  }

  const button =
    "bg-surface-container-lowest/80 hover:bg-surface-container backdrop-blur-md text-on-surface text-label-sm font-label-sm px-3 py-2 rounded-lg flex items-center gap-1.5";

  return (
    <div className="relative w-full h-[420px] md:h-[520px] rounded-xl overflow-hidden bg-surface-container-lowest" ref={box}>
      <div className="w-full h-full" ref={container} />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-on-surface-variant text-body-sm pointer-events-none bg-surface-container-lowest/40">
          <Icon name="progress_activity" className="animate-spin text-primary" /> Загружаем рельеф и спутниковые снимки...
        </div>
      )}
      <div className="absolute left-3 top-3 flex gap-2">
        <button className={button} onClick={toggleSpin} type="button">
          <Icon name={isSpinning ? "pause" : "360"} className="text-[16px] text-primary" />
          {isSpinning ? "Пауза" : "Облёт"}
        </button>
        <button className={button} onClick={resetView} type="button">
          <Icon name="restart_alt" className="text-[16px] text-primary" /> Сбросить вид
        </button>
      </div>
      <button className={`${button} absolute right-3 top-3`} onClick={fullscreen} title="Во весь экран" type="button">
        <Icon name="fullscreen" className="text-[18px] text-primary" />
      </button>
    </div>
  );
}
