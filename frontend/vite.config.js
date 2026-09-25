import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api and /media go to Django, so the browser sees one address and CORS is not needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/media": "http://127.0.0.1:8000",
    },
  },
});
