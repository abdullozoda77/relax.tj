// Shared CesiumJS setup for all 3D views (place terrain, route map, map of all places).
import { Color, HeightReference, JulianDate, PinBuilder, Terrain, VerticalOrigin, Viewer } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// Cesium loads its workers and images from here (see cesiumStatic() in vite.config.js).
window.CESIUM_BASE_URL = "/cesium/";

// Cesium World Terrain + Bing Maps Aerial through Cesium ion. Without our own ion account Cesium uses
// the public token built into the library, which is meant for demos: fine for this project.

// Sun position: a summer day in Tajikistan (12:00 local time), bright light with soft shadows on slopes.
const SUNNY_DAY = JulianDate.fromIso8601("2026-06-21T07:00:00Z");

// Creates a viewer with our quality settings and without Cesium's default buttons.
export function createViewer(container) {
  const viewer = new Viewer(container, {
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
  const { scene } = viewer;

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
  return viewer;
}

const pinBuilder = new PinBuilder();

// Map pin clamped to the ground. `text` (e.g. "3") is drawn inside the pin.
export function pin(color = "#f59e0b", text = null, size = 48) {
  const image = text
    ? pinBuilder.fromText(String(text), Color.fromCssColorString(color), size).toDataURL()
    : pinBuilder.fromColor(Color.fromCssColorString(color), size).toDataURL();
  return {
    image,
    verticalOrigin: VerticalOrigin.BOTTOM,
    heightReference: HeightReference.CLAMP_TO_GROUND,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  };
}

const markers = new Map();

// Round map marker: the category icon (a Material Symbols name) in white on a coloured badge,
// with a white ring, a short pointer and a soft shadow. Drawn at double size for sharp edges.
// Call it after the icon font has loaded (document.fonts.load), or the icon name is drawn as text.
export function placeMarker(color, icon) {
  const key = `${color}|${icon}`;
  if (!markers.has(key)) {
    const S = 2;
    const canvas = document.createElement("canvas");
    canvas.width = 44 * S;
    canvas.height = 56 * S;
    const g = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = 21 * S;
    const r = 15 * S;
    const ring = r + 3 * S;

    // White ring and pointer, with a shadow under them.
    g.shadowColor = "rgba(2, 6, 23, 0.55)";
    g.shadowBlur = 6 * S;
    g.shadowOffsetY = 2 * S;
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(cx, cy, ring, 0, Math.PI * 2);
    g.moveTo(cx - 7 * S, cy + ring - 3 * S);
    g.lineTo(cx, canvas.height - 4 * S);
    g.lineTo(cx + 7 * S, cy + ring - 3 * S);
    g.fill();
    g.shadowColor = "transparent";

    // Coloured badge, a little lighter at the top.
    const base = Color.fromCssColorString(color);
    const light = Color.lerp(base, Color.WHITE, 0.25, new Color());
    const fill = g.createLinearGradient(0, cy - r, 0, cy + r);
    fill.addColorStop(0, light.toCssColorString());
    fill.addColorStop(1, base.toCssColorString());
    g.fillStyle = fill;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#ffffff";
    g.font = `${19 * S}px "Material Symbols Outlined"`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(icon, cx, cy + S);
    markers.set(key, canvas.toDataURL());
  }
  return {
    image: markers.get(key),
    scale: 0.5,
    verticalOrigin: VerticalOrigin.BOTTOM,
    heightReference: HeightReference.CLAMP_TO_GROUND,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  };
}
