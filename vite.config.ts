import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { resolve } from "node:path";

const __dirname = import.meta.dirname;

// Two entry points: guest SPA (/ -> served for /i/:code) and admin SPA (/admin/).
export default defineConfig({
  plugins: [preact()],
  root: "src",
  publicDir: resolve(__dirname, "public"),
  build: {
    outDir: resolve(__dirname, "dist/client"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        guest: resolve(__dirname, "src/index.html"),
        admin: resolve(__dirname, "src/admin/index.html"),
      },
    },
  },
  server: {
    proxy: { "/api": "http://localhost:8787" },
  },
});
