import fs from "node:fs";
import path from "node:path";

// blume.config.ts is a small, hand-authored TS literal (`content: { root: "docs" }`).
// We deliberately don't load it via jiti/ts-node here: running Blume's own config
// loader in this process is exactly the kind of coupling the spike showed breaks
// (jiti + Astro's `astro:` virtual modules conflict once any renderer integration is
// present). A plain regex over the literal is enough for this project's config shape.
export function resolveContentRoot(projectRoot) {
  const configPath = path.join(projectRoot, "blume.config.ts");
  const source = fs.readFileSync(configPath, "utf8");
  const match = source.match(/content\s*:\s*{\s*root\s*:\s*["']([^"']+)["']/);
  const relRoot = match ? match[1] : "docs";
  return path.resolve(projectRoot, relRoot);
}

// Every fs path derived from a request must resolve inside docsRoot. Throws on escape.
export function safeResolve(docsRoot, requestedPath) {
  const resolved = path.resolve(docsRoot, `.${path.sep}${requestedPath ?? ""}`);
  const rootWithSep = docsRoot.endsWith(path.sep) ? docsRoot : docsRoot + path.sep;
  if (resolved !== docsRoot && !resolved.startsWith(rootWithSep)) {
    throw new Error(`Path escapes docs root: ${requestedPath}`);
  }
  return resolved;
}
