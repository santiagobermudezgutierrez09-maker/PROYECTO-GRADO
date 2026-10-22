import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/\/node_modules\/(firebase|@firebase)\//.test(id)) return "firebase";
          if (/\/node_modules\/three\//.test(id)) return "three";
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
        },
      },
    },
  },
});
