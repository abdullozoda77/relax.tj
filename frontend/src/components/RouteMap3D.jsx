import { useEffect, useRef, useState } from "react";
import { ArcType, BoundingSphere, Cartesian3, Color, HeadingPitchRange, Math as CesiumMath, PolylineDashMaterialProperty } from "cesium";
import { createViewer, pin } from "./cesium.js";
import Icon from "./Icon.jsx";
import { t } from "../i18n.js";

// 3D map of a route: numbered pins for every stop and a dashed line between them.
// points: [{ id, name, lat, lng, visited }]
export default function RouteMap3D({ points, onSelect }) {
  const box = useRef(null);
  const container = useRef(null);
  const viewerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let viewer;
    try {
      viewer = createViewer(container.current);
    } catch {
      setError(t("Ваш браузер не поддерживает 3D (WebGL)."));
      return;
    }
    viewerRef.current = viewer;

    const positions = points.map((p) => Cartesian3.fromDegrees(p.lng, p.lat));
    points.forEach((p, i) => {
      viewer.entities.add({
        id: `stop-${p.id}`,
        name: p.name,
        position: positions[i],
        billboard: pin(p.visited ? "#10b981" : "#f59e0b", i + 1, 44),
        properties: { placeId: p.id },
      });
    });
    if (positions.length > 1) {
      viewer.entities.add({
        polyline: {
          positions,
          width: 4,
          clampToGround: true,
          arcType: ArcType.GEODESIC,
          material: new PolylineDashMaterialProperty({ color: Color.fromCssColorString("#f59e0b"), dashLength: 18 }),
        },
      });
    }

    // Clicking a pin opens that place.
    viewer.selectedEntityChanged.addEventListener((entity) => {
      const placeId = entity?.properties?.placeId?.getValue();
      if (placeId) onSelect?.(placeId);
      viewer.selectedEntity = undefined;
    });

    showAll(viewer, positions, 0);
    return () => viewer.destroy();
  }, [points, onSelect]);

  function showAll(viewer, positions, duration = 1.5) {
    if (!positions.length) return;
    const sphere = BoundingSphere.fromPoints(positions);
    const range = Math.max(sphere.radius * 3.2, 6000);
    viewer.camera.flyToBoundingSphere(sphere, { offset: new HeadingPitchRange(0, CesiumMath.toRadians(-50), range), duration });
  }

  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else box.current?.requestFullscreen();
  }

  if (error) return <p className="text-body-md text-on-surface-variant">{error}</p>;

  const button =
    "bg-surface-container-lowest/80 hover:bg-surface-container backdrop-blur-md text-on-surface text-label-sm font-label-sm px-3 py-2 rounded-lg flex items-center gap-1.5";

  return (
    <div className="relative w-full h-[420px] md:h-[520px] rounded-xl overflow-hidden bg-surface-container-lowest" ref={box}>
      <div className="w-full h-full" ref={container} />
      <div className="absolute left-3 top-3 flex gap-2">
        <button
          className={button}
          onClick={() => viewerRef.current && showAll(viewerRef.current, points.map((p) => Cartesian3.fromDegrees(p.lng, p.lat)))}
          type="button"
        >
          <Icon name="zoom_out_map" className="text-[16px] text-primary" /> {t("Весь маршрут")}
        </button>
      </div>
      <button className={`${button} absolute right-3 top-3`} onClick={fullscreen} title={t("Во весь экран")} type="button">
        <Icon name="fullscreen" className="text-[18px] text-primary" />
      </button>
    </div>
  );
}
