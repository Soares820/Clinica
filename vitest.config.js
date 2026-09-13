import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "transform" },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.js"],
    globals: true,
  },
});
