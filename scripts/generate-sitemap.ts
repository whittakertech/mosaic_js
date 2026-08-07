import fs from "fs";
import path from "path";

/**
 * SITEMAP GENERATION SCRIPT (#26)
 *
 * Runs AFTER `vitepress build docs` (part of the `docs:build` chain) — it
 * walks the real build output, not the source `docs/` tree, so the sitemap
 * can never go stale relative to whatever pages actually got published
 * (new pages, moved pages, and removed pages are all picked up
 * automatically; there is no separate list to keep in sync by hand).
 *
 * Output:
 *   docs/.vitepress/dist/sitemap.xml
 */

const SITE_URL = "https://mosaicjs.whittakertech.com";
const distDir = path.resolve("docs/.vitepress/dist");

/** Pages excluded from the sitemap — not real content, or not meant to be indexed. */
const EXCLUDED_FILENAMES = new Set(["404.html"]);

/**
 * Directory-name segments excluded entirely — `_generated/` holds
 * transclusion fragments (e.g. drag-hook-table.md, included into
 * drag-lifecycle.md via `<!--@include:-->`) that VitePress still compiles
 * into their own standalone routable pages even though they're only ever
 * meant to be read inline, embedded in a real page. Indexing the fragment
 * itself would surface thin/duplicate content in search results.
 */
const EXCLUDED_DIR_SEGMENTS = new Set(["_generated"]);

function walkHtmlFiles(dir: string, base = dir): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIR_SEGMENTS.has(entry.name)) continue;
      files.push(...walkHtmlFiles(fullPath, base));
      continue;
    }

    if (!entry.name.endsWith(".html")) continue;
    if (EXCLUDED_FILENAMES.has(entry.name)) continue;

    files.push(fullPath);
  }

  return files;
}

/**
 * Converts a built HTML file's absolute path into the URL that actually
 * serves it — mirroring the real dist output structure exactly (an
 * `index.html` file becomes its directory with a trailing slash; any other
 * `<name>.html` keeps its `.html` extension), rather than assuming a URL
 * scheme that may not match what was actually built.
 */
function toUrl(filePath: string): string {
  const relative = path.relative(distDir, filePath).split(path.sep).join("/");

  if (relative === "index.html") return `${SITE_URL}/`;
  if (relative.endsWith("/index.html")) {
    return `${SITE_URL}/${relative.slice(0, -"index.html".length)}`;
  }
  return `${SITE_URL}/${relative}`;
}

if (!fs.existsSync(distDir)) {
  throw new Error(
    `${distDir} does not exist — generate-sitemap must run after "vitepress build docs".`
  );
}

const htmlFiles = walkHtmlFiles(distDir).sort();

if (htmlFiles.length === 0) {
  throw new Error(`No .html files found under ${distDir} — build output looks empty.`);
}

const urls = htmlFiles.map(toUrl);

const lines: string[] = [];
lines.push('<?xml version="1.0" encoding="UTF-8"?>');
lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
for (const url of urls) {
  lines.push("  <url>");
  lines.push(`    <loc>${url}</loc>`);
  lines.push("  </url>");
}
lines.push("</urlset>");
lines.push("");

const outPath = path.join(distDir, "sitemap.xml");
fs.writeFileSync(outPath, lines.join("\n"), "utf8");

console.log(`✓ sitemap.xml generated (${urls.length} URLs)`);
