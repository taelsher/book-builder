import fs from "node:fs";
import path from "node:path";
import { resolveContentRoot, safeResolve } from "./docsRoot.js";
import {
  buildTree,
  deriveRoute,
  nextFilePrefix,
  nextFolderOrder,
  slugify,
  swapOrder,
} from "./docsTree.js";

const LIVE_SITE_ORIGIN = "http://localhost:4321";

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data ? JSON.parse(data) : {}));
    req.on("error", reject);
  });
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const ALLOWED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif"]);

// Keeps the extension, slugifies the base name, and falls back to "image" for names
// with no usable characters (e.g. a file named only in non-ASCII characters).
function sanitizeImageFileName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const base = slugify(path.basename(originalName, ext)) || "image";
  return { base, ext };
}

export function docsApiPlugin(projectRoot) {
  const docsRoot = resolveContentRoot(projectRoot);
  const imagesRoot = path.join(projectRoot, "public", "images");

  return {
    name: "docs-api-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        const url = new URL(req.url, "http://localhost");

        try {
          if (url.pathname === "/api/tree" && req.method === "GET") {
            return sendJson(res, 200, { tree: buildTree(docsRoot), liveSiteOrigin: LIVE_SITE_ORIGIN });
          }

          if (url.pathname === "/api/file" && req.method === "GET") {
            const relPath = url.searchParams.get("path");
            const absPath = safeResolve(docsRoot, relPath);
            const content = fs.readFileSync(absPath, "utf8");
            const stat = fs.statSync(absPath);
            return sendJson(res, 200, {
              content,
              mtimeMs: stat.mtimeMs,
              route: deriveRoute(relPath),
              liveSiteOrigin: LIVE_SITE_ORIGIN,
            });
          }

          if (url.pathname === "/api/file" && req.method === "PUT") {
            const relPath = url.searchParams.get("path");
            const absPath = safeResolve(docsRoot, relPath);
            const { content, expectedMtime } = await readBody(req);
            const stat = fs.statSync(absPath);
            if (typeof expectedMtime === "number" && stat.mtimeMs !== expectedMtime) {
              return sendJson(res, 409, { error: "File changed on disk since it was loaded." });
            }
            fs.writeFileSync(absPath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
            const newStat = fs.statSync(absPath);
            return sendJson(res, 200, { mtimeMs: newStat.mtimeMs });
          }

          if (url.pathname === "/api/file" && req.method === "POST") {
            const { folder, title } = await readBody(req);
            const folderAbsPath = safeResolve(docsRoot, folder ?? "");
            const prefix = nextFilePrefix(folderAbsPath);
            const fileName = `${prefix}-${slugify(title)}.mdx`;
            const relPath = path.join(folder ?? "", fileName);
            const absPath = safeResolve(docsRoot, relPath);
            if (fs.existsSync(absPath)) {
              return sendJson(res, 409, { error: "A file with that name already exists." });
            }
            fs.mkdirSync(folderAbsPath, { recursive: true });
            fs.writeFileSync(absPath, `---\ntitle: ${title}\n---\n\n`, "utf8");
            return sendJson(res, 201, { path: relPath });
          }

          if (url.pathname === "/api/file" && req.method === "DELETE") {
            const relPath = url.searchParams.get("path");
            const absPath = safeResolve(docsRoot, relPath);
            fs.unlinkSync(absPath);
            return sendJson(res, 200, { ok: true });
          }

          if (url.pathname === "/api/folder" && req.method === "POST") {
            const { title, order } = await readBody(req);
            const folderName = `(${slugify(title)})`;
            const absPath = safeResolve(docsRoot, folderName);
            if (fs.existsSync(absPath)) {
              return sendJson(res, 409, { error: "A folder with that name already exists." });
            }
            const resolvedOrder = Number.isFinite(order) ? order : nextFolderOrder(docsRoot);
            fs.mkdirSync(absPath, { recursive: true });
            fs.writeFileSync(
              path.join(absPath, "meta.ts"),
              `import { defineMeta } from "blume";\n\nexport default defineMeta({\n  title: "${title}",\n  order: ${resolvedOrder},\n});\n`,
              "utf8",
            );
            return sendJson(res, 201, { path: folderName });
          }

          if (url.pathname === "/api/image" && req.method === "POST") {
            const fileNameHeader = req.headers["x-file-name"];
            if (!fileNameHeader) return sendJson(res, 400, { error: "Missing X-File-Name header." });
            const { base, ext } = sanitizeImageFileName(decodeURIComponent(fileNameHeader));
            if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
              return sendJson(res, 400, { error: `Unsupported image type: ${ext || "unknown"}` });
            }
            const buffer = await readRawBody(req);
            if (buffer.length === 0) return sendJson(res, 400, { error: "Empty upload." });
            fs.mkdirSync(imagesRoot, { recursive: true });
            let fileName = `${base}${ext}`;
            let counter = 1;
            while (fs.existsSync(safeResolve(imagesRoot, fileName))) {
              fileName = `${base}-${counter}${ext}`;
              counter += 1;
            }
            fs.writeFileSync(safeResolve(imagesRoot, fileName), buffer);
            return sendJson(res, 201, { url: `/images/${fileName}` });
          }

          if (url.pathname === "/api/node/reorder" && req.method === "POST") {
            const { path: relPath, direction } = await readBody(req);
            if (direction !== "up" && direction !== "down") {
              return sendJson(res, 400, { error: "direction must be 'up' or 'down'." });
            }
            const absPath = safeResolve(docsRoot, relPath);
            const dirAbsPath = path.dirname(absPath);
            const relDir = path.dirname(relPath);
            const result = swapOrder(dirAbsPath, path.basename(absPath), direction);
            if (result === null) return sendJson(res, 200, { moved: false });
            const { newName, renames } = result;
            const newRelPath = path.join(relDir, newName);
            const renamedPaths = renames.map(({ from, to }) => ({
              from: path.join(relDir, from),
              to: path.join(relDir, to),
            }));
            return sendJson(res, 200, { moved: true, path: newRelPath, renamedPaths });
          }

          if (url.pathname === "/api/folder" && req.method === "DELETE") {
            const relPath = url.searchParams.get("path");
            const absPath = safeResolve(docsRoot, relPath);
            fs.rmSync(absPath, { recursive: true, force: true });
            return sendJson(res, 200, { ok: true });
          }

          return sendJson(res, 404, { error: "Not found" });
        } catch (err) {
          return sendJson(res, 400, { error: err.message });
        }
      });
    },
  };
}
