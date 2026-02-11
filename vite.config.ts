import type { ViteDevServer } from "vite";
import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
// @ts-expect-error js file
import { facsimileListingPlugin } from "./vite-plugins/facsimile-listing.js";
import { router } from "./dev-server/router";

const normalizeBasePath = (value?: string): string => {
  const raw = (value ?? "").trim();
  if (!raw || raw === "/") {
    return "/";
  }
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
};

function devApiPlugin(): Plugin {
  return {
    name: "dev-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(router);
    },
  };
}

function basePathRedirectPlugin(base: string): Plugin {
  return {
    name: "base-path-redirect",
    configureServer(server: ViteDevServer) {
      if (base === "/") {
        return;
      }
      const baseNoTrailing = base.slice(0, -1);
      server.middlewares.use((req, res, next) => {
        if (req.method === "GET" && req.url === baseNoTrailing) {
          res.statusCode = 302;
          res.setHeader("Location", base);
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = normalizeBasePath(env.VITE_BASE_PATH);

  return {
    base,
    plugins: [
      react(),
      svgr(),
      basePathRedirectPlugin(base),
      devApiPlugin(),
      facsimileListingPlugin(),
    ],
    server: {
      allowedHosts: ["euclides.huma-num.fr"],
    },
  };
});
