import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { docsApiPlugin } from "./src/server/docsApiPlugin.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const editorRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

/** Serve ../reference/fonts/ at /fonts/ so the editor can load Valkyrie
 *  without duplicating font files (Vite only supports one publicDir). */
function serveFontsPlugin() {
  const fontsDir = path.join(projectRoot, "reference", "fonts");
  return {
    name: "serve-fonts",
    configureServer(server) {
      server.middlewares.use("/fonts", (req, res, next) => {
        const filePath = path.join(fontsDir, path.basename(req.url));
        if (fs.existsSync(filePath)) {
          res.setHeader("Content-Type", "font/woff2");
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          fs.createReadStream(filePath).pipe(res);
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveFontsPlugin(), docsApiPlugin(projectRoot)],
  resolve: {
    alias: {
      "@": path.join(editorRoot, "src"),
    },
  },
  // Serve the main site's public/ dir (not editor/public) so existing and
  // newly-uploaded images under /images/... resolve inside the editor too.
  publicDir: path.join(projectRoot, "public"),
  server: { port: 5180 },
});
