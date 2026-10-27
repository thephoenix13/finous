import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The PWA virtual module only exists in the real build; tests get a stub.
    alias: { "virtual:pwa-register/react": fileURLToPath(new URL("./src/test/pwa-register-react.ts", import.meta.url)) },
  },
  test: {
    // Pure logic tests run in node. Component tests opt in with `// @vitest-environment jsdom`.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
