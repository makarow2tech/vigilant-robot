import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Sayfalar veri işlevlerini @tanstack/react-start üzerinden çağırır; yerelde doğrudan çalışır.
      { find: "@tanstack/react-start", replacement: fileURLToPath(new URL("./src/shims/react-start.js", import.meta.url)) },
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ],
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3000", "/uploads": "http://localhost:3000" },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
