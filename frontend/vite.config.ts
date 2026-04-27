import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

//
// Vite dev server — no proxy needed.
// All API calls use the full VITE_API_URL env variable (e.g. http://localhost:8000 locally,
// or the Koyeb Django URL in production).  Set VITE_API_URL in .env accordingly.
//

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "CSC Moșnița",
        short_name: "CSC Moșnița",
        description: "Club Sportiv Comunal Moșnița Nouă",
        theme_color: "#1a3a5c",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,ico}"],
      },
    }),
  ],
  server: {},
});
