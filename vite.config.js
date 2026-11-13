import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";

const src = fileURLToPath(new URL("./src", import.meta.url));
const API = process.env.API_TARGET || "http://localhost:8787";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    react(),
  ],
  resolve: {
    alias: [
      // Uygulama kodundaki useServerFn çağrıları doğrudan fetch tabanlı
      // sunucu fonksiyonlarına bağlanır.
      { find: /^@tanstack\/react-start$/, replacement: `${src}/shims/react-start.js` },
      { find: /^@\//, replacement: `${src}/` },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": API,
      "/uploads": API,
    },
  },
  build: {
    outDir: "dist",
  },
});