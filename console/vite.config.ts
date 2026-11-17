import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The console is a staff web app, not a PWA: no service worker, nothing cached on the device.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174 },
});
