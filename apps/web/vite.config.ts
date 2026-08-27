import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, type Plugin } from "vite";
import type { ServerResponse } from "node:http";

const crossOriginIsolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "cross-origin",
};

const setCrossOriginIsolationHeaders = (
  _req: unknown,
  res: ServerResponse,
  next: () => void,
): void => {
  for (const [key, value] of Object.entries(crossOriginIsolationHeaders)) {
    res.setHeader(key, value);
  }
  next();
};

const coepHeaders: Plugin = {
  name: "coep-headers",
  configureServer(server) {
    server.middlewares.stack.unshift({
      route: "",
      handle: setCrossOriginIsolationHeaders,
    });
  },
  configurePreviewServer(server) {
    server.middlewares.stack.unshift({
      route: "",
      handle: setCrossOriginIsolationHeaders,
    });
  },
};

export default defineConfig({
  envDir: "../../",
  plugins: [
    sveltekit({
      compilerOptions: {
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
      },

      adapter: adapter({ fallback: "index.html" }),
    }),
    coepHeaders,
  ],
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  server: {
    port: 5173,
  },
});
