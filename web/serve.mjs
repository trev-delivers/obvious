#!/usr/bin/env node
/**
 * Serves site/ on http://localhost:4321 with the same clean URLs Vercel
 * gives it (/themes/core is site/themes/core.html) and the headers from
 * vercel.json, so the pages run under the real CSP.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const site = join(dirname(fileURLToPath(import.meta.url)), "..", "site");
const port = Number(process.env.PORT) || 4321;
/* vercel.json's one header rule is "/(.*)", which reads the same as a regular expression */
const rules = (JSON.parse(readFileSync(join(site, "..", "vercel.json"), "utf8")).headers ?? []).map((h) => ({ re: new RegExp(`^${h.source}$`), headers: h.headers }));
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain" };

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  for (const r of rules) if (r.re.test(path)) for (const h of r.headers) res.setHeader(h.key, h.value);
  const tries = path.endsWith("/") ? [join(path, "index.html")] : [path, `${path}.html`];
  for (const p of tries) {
    const file = join(site, p);
    if (!file.startsWith(site)) break;
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      return res.end(body);
    } catch {}
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Not found");
}).listen(port, () => console.log(`http://localhost:${port}`));
