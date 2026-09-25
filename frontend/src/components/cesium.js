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
