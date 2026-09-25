import { cpSync, createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const CESIUM_DIR = resolve("node_modules/cesium/Build/Cesium");
const MIME = { ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".wasm": "application/wasm" };

// CesiumJS loads its Workers, Assets and Widgets at runtime from /cesium/.
// In dev they are served straight from node_modules, on build they are copied to dist/cesium.
function cesiumStatic() {
  return {
    name: "cesium-static",
    configureServer(server) {
      server.middlewares.use("/cesium", (req, res, next) => {
        const file = normalize(join(CESIUM_DIR, decodeURIComponent(req.url.split("?")[0])));
        if (!file.startsWith(CESIUM_DIR) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader("Content-Type", MIME[extname(file)] || "application/octet-stream");
        createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      for (const dir of ["Workers", "Assets", "ThirdParty", "Widgets"]) {
        cpSync(join(CESIUM_DIR, dir), resolve("dist/cesium", dir), { recursive: true });
      }
    },
  };
}

// /api and /media go to Django, so the browser sees one address and CORS is not needed.
export default defineConfig({
  plugins: [react(), cesiumStatic()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/media": "http://127.0.0.1:8000",
    },
  },
});
