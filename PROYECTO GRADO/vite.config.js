import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createGeminiHandler } from "./api/gemini.js";

function geminiDevMiddleware(apiKey) {
  const handler = createGeminiHandler(
    apiKey,
    "Falta GEMINI_API_KEY en .env.local"
  );

  return {
    name: "gemini-dev-middleware",
    apply: "serve",
    transformIndexHtml(html) {
      return html.replace(
        /\s*<link rel="manifest" href="\/manifest\.webmanifest"\s*\/?>/i,
        ""
      );
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (new URL(req.url || "/", "http://localhost").pathname !== "/api/gemini") {
          next();
          return;
        }

        Promise.resolve(handler(req, res)).catch((error) => {
          server.config.logger.error("Falló el middleware local de Gemini.", {
            error,
          });
          if (!res.headersSent) {
            res.writeHead(500, {
              "Cache-Control": "no-store",
              "Content-Type": "application/json; charset=utf-8",
            });
            res.end(
              JSON.stringify({ error: "Falló el middleware local de Gemini." })
            );
          } else {
            res.destroy(error);
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_KEY;

  return {
    envPrefix: [],
    plugins: [react(), geminiDevMiddleware(apiKey)],
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (/\/node_modules\/(?:firebase\/auth|@firebase\/auth(?:-compat)?)\//.test(id)) {
              return "firebase-auth";
            }
            if (/\/node_modules\/(?:firebase\/firestore|@firebase\/firestore(?:-compat)?)\//.test(id)) {
              return "firebase-firestore";
            }
            if (/\/node_modules\/three\//.test(id)) return "three";
            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
            if (/\/node_modules\/firebase\//.test(id)) return "firebase-sdk";
            if (/\/node_modules\/@firebase\//.test(id)) return "firebase-core";
          },
        },
      },
    },
  };
});
