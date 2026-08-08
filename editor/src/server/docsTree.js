import fs from "node:fs";
import path from "node:path";

const NUMERIC_PREFIX = /^(\d+)([-_.])(.+)$/;
const GROUP_FOLDER = /^\((.+)\)$/;

export function slugify(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function parseNumericPrefix(stem) {
  const match = stem.match(NUMERIC_PREFIX);
  if (!match) return { order: Number.POSITIVE_INFINITY, rest: stem, prefixWidth: null, separator: null };
  return { order: Number(match[1]), rest: match[3], prefixWidth: match[1].length, separator: match[2] };
}

export function parseFrontmatterTitle(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const titleLine = match[1].match(/^title\s*:\s*(.+)$/m);
  if (!titleLine) return null;
  return titleLine[1].trim().replace(/^["']|["']$/g, "");
}

export function parseMetaTs(content) {
  const title = content.match(/title\s*:\s*["']([^"']+)["']/)?.[1] ?? null;
  const order = content.match(/order\s*:\s*(\d+)/)?.[1];
  return { title, order: order ? Number(order) : Number.POSITIVE_INFINITY };
}

// Mirrors Blume's route derivation: numeric-prefixed segments are stripped to their
// slug, paren-wrapped folders are route-transparent (contribute no segment), and a
// file whose stripped stem is "index" maps to its parent's own route.
export function deriveRoute(relPath) {
  const segments = relPath.split(path.sep).filter(Boolean);
  const routeSegments = [];
  segments.forEach((segment, i) => {
    const isFile = i === segments.length - 1;
    const stem = isFile ? segment.replace(/\.mdx$/, "") : segment;
    const { rest } = parseNumericPrefix(stem);
    if (isFile && rest === "index") return;
    const group = rest.match(GROUP_FOLDER);
    if (group) return;
    routeSegments.push(rest);
  });
  return "/" + routeSegments.join("/");
}

function readDirEntries(dirAbsPath) {
  return fs
    .readdirSync(dirAbsPath, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."));
}

function buildFileNode(dirAbsPath, dirRelPath, entryName) {
  const absPath = path.join(dirAbsPath, entryName);
  const relPath = path.join(dirRelPath, entryName);
  const stat = fs.statSync(absPath);
  const content = fs.readFileSync(absPath, "utf8");
  const stem = entryName.replace(/\.mdx$/, "");
  const { order, rest } = parseNumericPrefix(stem);
  const isIndex = rest === "index";
  return {
    type: "file",
    name: entryName,
    path: relPath,
    title: parseFrontmatterTitle(content) ?? rest,
    order: isIndex ? Number.NEGATIVE_INFINITY : order,
    route: deriveRoute(relPath),
    mtimeMs: stat.mtimeMs,
  };
}

function buildFolderNode(docsRoot, dirRelPath, entryName) {
  const absPath = path.join(docsRoot, dirRelPath, entryName);
  const relPath = path.join(dirRelPath, entryName);
  const metaPath = path.join(absPath, "meta.ts");
  let title = entryName.replace(GROUP_FOLDER, "$1");
  let order = Number.POSITIVE_INFINITY;
  if (fs.existsSync(metaPath)) {
    const meta = parseMetaTs(fs.readFileSync(metaPath, "utf8"));
    if (meta.title) title = meta.title;
    order = meta.order;
  }
  return {
    type: "folder",
    name: entryName,
    path: relPath,
    title,
    order,
    children: buildTree(docsRoot, relPath),
  };
}

export function buildTree(docsRoot, dirRelPath = "") {
  const dirAbsPath = path.join(docsRoot, dirRelPath);
  const entries = readDirEntries(dirAbsPath);
  const nodes = entries
    .filter((entry) => entry.name !== "meta.ts")
    .map((entry) => {
      if (entry.isDirectory()) return buildFolderNode(docsRoot, dirRelPath, entry.name);
      if (entry.name.endsWith(".mdx")) return buildFileNode(dirAbsPath, dirRelPath, entry.name);
      return null;
    })
    .filter(Boolean);
  nodes.sort((a, b) => (a.order === b.order ? a.name.localeCompare(b.name) : a.order - b.order));
  return nodes;
}

// Next numeric prefix for a new file in this folder: max(existing)+1, zero-padded to
// match the sibling width (falls back to 2 digits when the folder is empty).
export function nextFilePrefix(dirAbsPath) {
  const entries = fs.existsSync(dirAbsPath) ? readDirEntries(dirAbsPath) : [];
  let maxOrder = 0;
  let width = 2;
  for (const entry of entries) {
    if (!entry.name.endsWith(".mdx")) continue;
    const { order, prefixWidth } = parseNumericPrefix(entry.name.replace(/\.mdx$/, ""));
    if (Number.isFinite(order)) {
      maxOrder = Math.max(maxOrder, order);
      if (prefixWidth) width = prefixWidth;
    }
  }
  return String(maxOrder + 1).padStart(width, "0");
}

export function nextFolderOrder(docsRoot) {
  const entries = readDirEntries(docsRoot).filter((e) => e.isDirectory());
  let maxOrder = 0;
  for (const entry of entries) {
    const metaPath = path.join(docsRoot, entry.name, "meta.ts");
    if (!fs.existsSync(metaPath)) continue;
    const { order } = parseMetaTs(fs.readFileSync(metaPath, "utf8"));
    if (Number.isFinite(order)) maxOrder = Math.max(maxOrder, order);
  }
  return maxOrder + 1;
}

// Reads this directory's immediate file and folder children in the same order
// buildTree sorts them for display (order ascending, ties broken by name),
// annotated with whatever a reorder needs to write back: a file's numeric-prefix
// pieces (rest/prefixWidth/separator), or nothing extra for a folder, whose
// meta.ts `order` field is rewritten in place instead of being renamed.
function readOrderableEntries(dirAbsPath) {
  const entries = readDirEntries(dirAbsPath);
  const parsed = entries
    .map((entry) => {
      if (entry.isDirectory()) {
        const metaPath = path.join(dirAbsPath, entry.name, "meta.ts");
        let order = Number.POSITIVE_INFINITY;
        if (fs.existsSync(metaPath)) {
          order = parseMetaTs(fs.readFileSync(metaPath, "utf8")).order;
        }
        return { type: "folder", name: entry.name, order };
      }
      if (entry.name.endsWith(".mdx")) {
        const stem = entry.name.replace(/\.mdx$/, "");
        const { order, rest, prefixWidth, separator } = parseNumericPrefix(stem);
        const isIndex = rest === "index";
        return {
          type: "file",
          name: entry.name,
          order: isIndex ? Number.NEGATIVE_INFINITY : order,
          rest,
          prefixWidth,
          separator,
        };
      }
      return null;
    })
    .filter(Boolean);
  parsed.sort((a, b) => (a.order === b.order ? a.name.localeCompare(b.name) : a.order - b.order));
  return parsed;
}

function setFolderOrder(dirAbsPath, folderName, newOrder) {
  const metaPath = path.join(dirAbsPath, folderName, "meta.ts");
  const content = fs.readFileSync(metaPath, "utf8");
  fs.writeFileSync(metaPath, content.replace(/order\s*:\s*\d+/, `order: ${newOrder}`), "utf8");
}

// Applies each entry's new position as a fresh order 1..N (`orderedEntries` is already
// in its final order). Folder order lives in meta.ts, so those writes can happen
// directly. File order lives in the filename, so renaming needs care: renaming
// directly from old name to new name, one entry at a time, can have entry A's new
// name collide with entry B's still-current name whenever two siblings share the same
// slug ("rest") at different numeric prefixes — e.g. two pages both titled "Test" in
// the same folder. That collision silently clobbers B's file with A's content via
// fs.renameSync's overwrite-on-rename behavior. Renaming every file to a collision-free
// temp name first, then to its real final name, makes the whole batch order-independent
// and immune to that clobber. Returns { finalNames, renames }: finalNames maps each
// entry to its name after the change (folders are unchanged); renames lists only the
// files whose name actually changed ({ from, to } basenames) — contiguous renumbering
// can shift every file after the tie point, not just the two entries the caller asked
// to swap, and callers with one of those bystanders open need to know it moved too.
function applyContiguousOrder(dirAbsPath, orderedEntries) {
  const finalNames = new Map();
  const fileRenames = [];
  orderedEntries.forEach((entry, i) => {
    const newOrder = i + 1;
    if (entry.type === "folder") {
      setFolderOrder(dirAbsPath, entry.name, newOrder);
      finalNames.set(entry, entry.name);
      return;
    }
    const newName = `${String(newOrder).padStart(entry.prefixWidth, "0")}${entry.separator}${entry.rest}.mdx`;
    finalNames.set(entry, newName);
    if (newName !== entry.name) fileRenames.push({ entry, newName });
  });

  const tempNames = fileRenames.map(({ entry }, i) => {
    const tempName = `.reorder-tmp-${i}-${entry.name}`;
    fs.renameSync(path.join(dirAbsPath, entry.name), path.join(dirAbsPath, tempName));
    return tempName;
  });
  fileRenames.forEach(({ newName }, i) => {
    fs.renameSync(path.join(dirAbsPath, tempNames[i]), path.join(dirAbsPath, newName));
  });

  const renames = fileRenames.map(({ entry, newName }) => ({ from: entry.name, to: newName }));
  return { finalNames, renames };
}

// Moves `name` past its immediate sibling in `direction` ("up" = earlier, "down" =
// later) — regardless of whether either side is a file or a folder. A file's numeric
// filename prefix and a folder's meta.ts `order` are just two storage schemes for the
// same comparable number buildTree already sorts both of them on.
//
// Repositions `name` within the directory's orderable (finite-order) siblings and then
// renumbers that whole subset contiguously 1..N to reflect the new arrangement, rather
// than exchanging just the two neighbors' order values. A pairwise swap is a no-op
// when the two happen to be tied — which is the common case here, since files and
// folders each number from 1 independently (a fresh root file and a fresh root folder
// both default to order 1). Contiguous renumbering removes ties within the subset
// entirely, so this can't recur. Entries with a non-finite order (no numeric prefix,
// no meta.ts order field) are left untouched — sort places them after every finite
// entry, so they never end up spliced into the renumbered subset.
// Returns null if `name` is already at that edge (no-op, not an error). Otherwise
// returns { newName, renames }: newName is the moved entry's own new name (unchanged
// for a folder); renames is every file rename that happened as a side effect
// (including, when the moved entry is a file, its own — same shape as
// applyContiguousOrder's `renames`), so a caller with any of those files open
// elsewhere can update its own bookkeeping instead of only tracking the one entry it
// asked to move.
export function swapOrder(dirAbsPath, name, direction) {
  const siblings = readOrderableEntries(dirAbsPath);
  const current = siblings.find((s) => s.name === name);
  if (!current) throw new Error("Not found in this folder.");
  if (!Number.isFinite(current.order)) {
    throw new Error("Only ordered files and folders can be reordered.");
  }

  // The edge/no-op check must be relative to the orderable subset, not the full
  // (orderable + pinned) sibling list: a pinned sibling (e.g. index.mdx) can sort
  // immediately adjacent to the last orderable entry, and that's still an edge, not
  // a real neighbor to swap with.
  const orderable = siblings.filter((s) => Number.isFinite(s.order));
  const idx = orderable.indexOf(current);
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= orderable.length) return null;

  orderable.splice(idx, 1);
  orderable.splice(targetIdx, 0, current);

  const { finalNames, renames } = applyContiguousOrder(dirAbsPath, orderable);
  return { newName: finalNames.get(current), renames };
}
