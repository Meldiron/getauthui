import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: {
        authui: resolve(__dirname, "src/index.ts"),
        react: resolve(__dirname, "src/react/index.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [/^lit/, /^@lit/, /^react/, /^appwrite/],
    },
    target: "es2021",
    minify: "esbuild",
  },
  plugins: [dts({ include: ["src"] })],
});
