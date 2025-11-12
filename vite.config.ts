import type { ViteDevServer } from "vite";
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
// @ts-expect-error js file
import { facsimileListingPlugin } from "./vite-plugins/facsimile-listing.js";
import { router } from "./dev-server/router";

function devApiPlugin(): Plugin {
  return {
    name: "dev-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(router);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), devApiPlugin(), facsimileListingPlugin()],
});
