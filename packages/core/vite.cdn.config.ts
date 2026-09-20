import { defineConfig } from "vite";

// CDN bundle: lit and appwrite are inlined so a single <script> tag works.
export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es", "iife"],
      name: "AuthUI",
      fileName: (format) => `authui.cdn.${format === "es" ? "mjs" : "js"}`,
    },
    outDir: "dist",
    emptyOutDir: false,
    target: "es2021",
    minify: "esbuild",
  },
});
