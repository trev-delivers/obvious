#!/usr/bin/env node
/**
 * Checks a laid-out HTML document the way a production editor would, before
 * anyone looks at it: text cut off, things too close to the trim, runts,
 * small or low-contrast text, fonts that didn't load, photos too low-res for
 * print. Takes a screenshot of every page so you can then look at it.
 *
 *   node check-layout.mjs page.html
 *   node check-layout.mjs page.html --pages ".page" --safe 10 --out shots
 *   node check-layout.mjs http://localhost:4321/newsletter/print/
 *
 * Options
 *   --pages <selector>  one element per printed page (default: [data-page],
 *                       then .page, then the body)
 *   --safe <mm>         keep text this far inside each page edge (default 10)
 *   --min-size <px>     smallest acceptable text size (default 11, about 8pt)
 *   --out <dir>         where screenshots go (default ./layout-check)
 *   --scale <n>         screenshot pixel ratio (default 1.5)
 *
 * Mark anything meant to run off the edge (a full-bleed photo or band) with
 * data-bleed, and any box whose content must fit with data-fit="name" to get
 * a named overflow report. Every element with overflow hidden or clip is
 * checked anyway.
 *
 * Exit code 1 if there's a failure, 0 if only warnings or nothing.
 * Needs Playwright. Uses the project's copy, or the global one.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

function args(argv) {
  const out = { target: null, pages: null, safe: 10, minSize: 11, out: "layout-check", scale: 1.5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pages") out.pages = argv[++i];
    else if (a === "--safe") out.safe = Number(argv[++i]);
    else if (a === "--min-size") out.minSize = Number(argv[++i]);
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--scale") out.scale = Number(argv[++i]);
    else if (!out.target) out.target = a;
  }
  if (!out.target) {
    console.error("Usage: node check-layout.mjs <file.html|url> [--pages sel] [--safe mm] [--min-size px] [--out dir]");
    process.exit(2);
  }
  return out;
}

async function playwright() {
  try {
    return await import("playwright");
  } catch {
    const root = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
    return createRequire(`${root}/`)("playwright");
  }
}

/** Runs inside the page. Returns { pages: [{ index, issues: [...] }] }. */
function inspect({ pageSelector, safePx, minSize }) {
  const issues = [];
  const text = (el) => (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const label = (el) => {
    if (el.dataset && el.dataset.fit) return `[data-fit="${el.dataset.fit}"]`;
    const tag = el.tagName.toLowerCase();
    const t = text(el);
    return t ? `${tag} "${t}"` : tag;
  };

  let pages = pageSelector ? [...document.querySelectorAll(pageSelector)] : [];
  if (!pages.length) pages = [...document.querySelectorAll("[data-page]")];
  if (!pages.length) pages = [...document.querySelectorAll(".page")];
  if (!pages.length) pages = [document.body];

  // Fonts: the first family named for any element that holds text should be loaded.
  const families = new Set();
  for (const el of document.querySelectorAll("body *")) {
    if (/^(STYLE|SCRIPT|TEMPLATE|NOSCRIPT)$/.test(el.tagName)) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const first = getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
    if (first && !/^(serif|sans-serif|monospace|system-ui|inherit)$/i.test(first)) families.add(first);
  }
  const fonts = [];
  for (const fam of families) {
    const loaded = [...document.fonts].some((f) => f.family.replace(/["']/g, "") === fam && f.status === "loaded");
    if (!loaded) fonts.push(fam);
  }

  // Colour helpers for contrast.
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const background = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.5) return c;
      if (getComputedStyle(n).backgroundImage !== "none") return null; // can't tell over an image
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  const report = pages.map((pageEl, index) => {
    const out = [];
    const box = pageEl.getBoundingClientRect();
    const add = (level, kind, msg) => out.push({ level, kind, msg });

    // 1. Overflow: anything clipping its own content.
    for (const el of [pageEl, ...pageEl.querySelectorAll("*")]) {
      const cs = getComputedStyle(el);
      const clips = /hidden|clip/.test(cs.overflow + cs.overflowY + cs.overflowX) || el.dataset.fit;
      if (!clips) continue;
      const overY = el.scrollHeight - el.clientHeight;
      const overX = el.scrollWidth - el.clientWidth;
      if (overY > 1) add("fail", "overflow", `${label(el)} is ${overY}px too tall for its box`);
      if (overX > 1) add("fail", "overflow", `${label(el)} is ${overX}px too wide for its box`);
    }

    // 2. Text past the page edge or inside the safe margin.
    const walker = document.createTreeWalker(pageEl, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim()) continue;
      const el = node.parentElement;
      if (!el || el.closest("[data-bleed]") || seen.has(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        if (!r.width || !r.height) continue;
        const outside = r.left < box.left || r.right > box.right || r.top < box.top || r.bottom > box.bottom;
        const near = r.left < box.left + safePx || r.right > box.right - safePx || r.top < box.top + safePx || r.bottom > box.bottom - safePx;
        if (outside) { add("fail", "off-page", `${label(el)} runs off the page`); seen.add(el); break; }
        if (near) { add("warn", "safe-area", `${label(el)} is inside the ${Math.round(safePx / 3.78)}mm safe margin`); seen.add(el); break; }
      }
    }

    // 3. Text size and contrast, once per element that directly holds text.
    const checked = new Set();
    const walker2 = document.createTreeWalker(pageEl, NodeFilter.SHOW_TEXT);
    for (let node = walker2.nextNode(); node; node = walker2.nextNode()) {
      const el = node.parentElement;
      if (!node.textContent.trim() || !el || checked.has(el)) continue;
      checked.add(el);
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      if (size < minSize) add("warn", "small-text", `${label(el)} is ${size}px (${(size * 0.75).toFixed(1)}pt)`);
      const fg = parse(cs.color);
      const bg = background(el);
      if (fg && bg) {
        const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
        const ratio = (a + 0.05) / (b + 0.05);
        const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
        if (ratio < (large ? 3 : 4.5)) add("fail", "contrast", `${label(el)} contrast ${ratio.toFixed(2)}:1`);
      }
    }

    // 4. Runts: a paragraph whose last line is one short word.
    for (const el of pageEl.querySelectorAll("p, li, dd, blockquote, figcaption")) {
      const walkerP = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes = [];
      for (let n = walkerP.nextNode(); n; n = walkerP.nextNode()) if (n.textContent.trim()) nodes.push(n);
      if (!nodes.length) continue;
      const last = nodes[nodes.length - 1];
      const t = last.textContent.replace(/\s+$/, "");
      const start = t.search(/\S+$/);
      if (start <= 0) continue;
      const word = document.createRange();
      word.setStart(last, start);
      word.setEnd(last, t.length);
      const before = document.createRange();
      const prev = t.slice(0, start).search(/\S+\s*$/);
      if (prev < 0) continue;
      before.setStart(last, prev);
      before.setEnd(last, start);
      const w = word.getClientRects();
      const b = before.getClientRects();
      if (!w.length || !b.length) continue;
      const wr = w[w.length - 1];
      const br = b[b.length - 1];
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || wr.height;
      const blockWidth = el.getBoundingClientRect().width;
      if (wr.top - br.top > lineHeight / 2 && wr.width < blockWidth * 0.25) {
        add("warn", "runt", `${label(el)} ends with "${t.slice(start)}" alone on its last line`);
      }
    }

    // 5. Images: effective resolution at the placed size, assuming 96 CSS px per inch.
    for (const img of pageEl.querySelectorAll("img")) {
      const r = img.getBoundingClientRect();
      if (!img.complete || !img.naturalWidth) { add("fail", "image", `image ${img.alt ? `"${img.alt.slice(0, 40)}"` : img.src.slice(-40)} didn't load`); continue; }
      const fit = getComputedStyle(img).objectFit;
      const sx = r.width / img.naturalWidth;
      const sy = r.height / img.naturalHeight;
      const scale = fit === "contain" ? Math.min(sx, sy) : fit === "cover" ? Math.max(sx, sy) : Math.max(sx, sy);
      const ppi = Math.round(96 / scale);
      const name = img.alt ? `"${img.alt.slice(0, 40)}"` : img.src.slice(-40);
      if (ppi < 150) add("fail", "image", `image ${name} is ${ppi}ppi at this size (aim for 300, 200 at a push)`);
      else if (ppi < 250) add("warn", "image", `image ${name} is ${ppi}ppi at this size (aim for 300)`);
    }

    return { index: index + 1, width: Math.round(box.width), height: Math.round(box.height), issues: out };
  });

  return { fonts, pages: report };
}

const opts = args(process.argv.slice(2));
const url = /^https?:|^file:/.test(opts.target) ? opts.target : pathToFileURL(resolve(opts.target)).href;
const { chromium } = await playwright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: opts.scale });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);

const result = await page.evaluate(inspect, { pageSelector: opts.pages, safePx: opts.safe * 3.7795, minSize: opts.minSize });

mkdirSync(opts.out, { recursive: true });
const handles = await page.$$(opts.pages || "[data-page], .page");
const shots = handles.length ? handles : [await page.$("body")];
for (let i = 0; i < shots.length; i++) await shots[i].screenshot({ path: `${opts.out}/page-${i + 1}.png` });
await browser.close();

let failed = false;
if (result.fonts.length) { failed = true; console.log(`FAIL fonts: not loaded as web fonts, so Chromium will have substituted something: ${result.fonts.join(", ")}`); }
for (const e of errors) console.log(`WARN console: ${e}`);
for (const p of result.pages) {
  console.log(`\nPage ${p.index} (${p.width}×${p.height})`);
  if (!p.issues.length) console.log("  no problems found");
  for (const i of p.issues) {
    if (i.level === "fail") failed = true;
    console.log(`  ${i.level.toUpperCase()} ${i.kind}: ${i.msg}`);
  }
}
console.log(`\nScreenshots in ${resolve(opts.out)}. Look at every one before calling it done.`);
process.exit(failed ? 1 : 0);
