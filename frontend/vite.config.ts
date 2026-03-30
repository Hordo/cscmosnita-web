import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

//
// Vite + Vercel API Routing
//
// - When running `vercel dev` locally, Vercel handles /api routes as serverless functions.
//   No proxy is needed; Vite serves the frontend, Vercel serves API.
// - When running `vite` or `npm run dev`, proxy /api to the deployed Vercel instance for testing against production API.
// - In production, Vercel will handle both frontend and API.
//

// Detect if running under Vercel dev server
const isVercelDev =
  process.env.VERCEL === "1" || process.env.VERCEL_DEV === "1";
// Detect if running plain vite dev server
const isViteDev = process.env.NODE_ENV === "development" && !isVercelDev;

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: isVercelDev
      ? undefined // vercel dev: use local serverless API
      : isViteDev
        ? {
            "/api": {
              target: "http://localhost:3000",
              changeOrigin: true,
              secure: false,
            },
          }
        : {
            "/api": {
              target: "https://cscmosnita-web.vercel.app",
              changeOrigin: true,
              secure: true,
            },
          },
  },
});
