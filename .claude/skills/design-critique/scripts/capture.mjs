#!/usr/bin/env node
/**
 * Screenshots and plain facts for a design critique.
 *
 * Opens each page at each width and colour scheme in Chromium, saves what a
 * person would see first (the fold) and the whole page in readable slices,
 * and writes down the things a critique needs evidence for: console errors,
 * failed requests, sideways scroll, the heading outline, tap targets under
 * 24px and 44px, the type sizes and faces in use, and text that measures
 * under its contrast minimum.
 *
 *   node capture.mjs http://localhost:4353/ --out shots
 *   node capture.mjs http://localhost:4353 --paths /,/start,/themes/core --out shots
 *   node capture.mjs <url> --widths 390,1280 --schemes light,dark --early --out shots
 *
 * Options
 *   --out DIR         where to write PNGs and report.json (default ./critique-shots)
 *   --paths a,b       paths joined onto the first URL (default: just the URL)
 *   --widths a,b      CSS px widths (default 390,1280)
 *   --schemes a,b     light, dark or both (default light,dark)
 *   --reduced-motion  also emulate prefers-reduced-motion: reduce
 *   --early           also take a fold shot at DOMContentLoaded, before the
 *                     network settles, to catch loading states and flashes
 *   --dpr N           device pixel ratio (default 1, keeps files small)
 *   --slices N        most full-page slices per view (default 6)
 *   --wait MS         extra settle time after load (default 500)
 *   --steps FILE      after the page settles, run the steps in FILE (JSON) and
 *                     take a fold shot at each "shot". For flows and states:
 *                     [{"click": "text=Menu"}, {"shot": "menu-open"},
 *                      {"press": "Escape"}, {"fill": ["#email", "x"]},
 *                      {"click": "button[type=submit]"}, {"wait": 400},
 *                      {"shot": "after-submit"}]
 *                     Selectors are Playwright's (CSS, text=, role=). A step
 *                     that fails is recorded and the rest are skipped.
 *
 * Needs Playwright, but installs nothing. It looks for it in the current
 * project's node_modules, then in the global npm folder, then in
 * PLAYWRIGHT_PATH. Chromium comes from CHROMIUM_PATH, then
 * /opt/pw-browsers/chromium if it exists, then Playwright's own default.
 * Never runs `playwright install`.
 *
 * Exits 0 when every page was captured (findings don't fail it), 1 when a
 * page couldn't be opened, 2 on bad arguments or no Playwright.
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/* ---- arguments ------------------------------------------------------ */

const argv = process.argv.slice(2);
const opts = { urls: [], out: "critique-shots", paths: null, widths: [390, 1280], schemes: ["light", "dark"],
  reducedMotion: false, early: false, dpr: 1, slices: 6, wait: 500, steps: null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const next = () => { const v = argv[++i]; if (v === undefined) die(`${a} needs a value`); return v; };
  if (a === "--out") opts.out = next();
  else if (a === "--paths") opts.paths = next().split(",").map((s) => s.trim()).filter(Boolean);
  else if (a === "--widths") opts.widths = next().split(",").map(Number);
  else if (a === "--schemes") opts.schemes = next().split(",").map((s) => s.trim());
  else if (a === "--reduced-motion") opts.reducedMotion = true;
  else if (a === "--early") opts.early = true;
  else if (a === "--dpr") opts.dpr = Number(next());
  else if (a === "--slices") opts.slices = Number(next());
  else if (a === "--wait") opts.wait = Number(next());
  else if (a === "--steps") {
    const file = next();
    try { opts.steps = JSON.parse(readFileSync(file, "utf8")); } catch (e) { die(`couldn't read ${file}: ${e.message}`); }
    if (!Array.isArray(opts.steps)) die("--steps file must hold a JSON array");
  }
  else if (a === "-h" || a === "--help") { console.log("node capture.mjs <url> [--paths /,/a] [--widths 390,1280] [--schemes light,dark] [--reduced-motion] [--early] [--out DIR]"); process.exit(0); }
  else if (a.startsWith("--")) die(`unknown option ${a}`);
  else opts.urls.push(a);
}
if (!opts.urls.length) die("give at least one URL, e.g. node capture.mjs http://localhost:4353/");
if (opts.widths.some((w) => !(w >= 200 && w <= 4000))) die("--widths must be numbers between 200 and 4000");
if (opts.schemes.some((s) => s !== "light" && s !== "dark")) die("--schemes takes light, dark or light,dark");

function die(msg) { console.error(`capture: ${msg}`); process.exit(2); }

const targets = opts.paths
  ? opts.paths.map((p) => new URL(p, opts.urls[0]).href)
  : opts.urls.map((u) => new URL(u).href);

/* ---- find Playwright and Chromium ----------------------------------- */

function loadPlaywright() {
  const places = [join(process.cwd(), "package.json")];
  try { places.push(join(execFileSync("npm", ["root", "-g"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(), "noop.js")); } catch {}
  if (process.env.PLAYWRIGHT_PATH) places.push(join(resolve(process.env.PLAYWRIGHT_PATH), "noop.js"));
  for (const from of places) {
    for (const name of ["playwright", "playwright-core", "@playwright/test"]) {
      try {
        const mod = createRequire(from)(name);
        if (mod.chromium) return { chromium: mod.chromium, from: `${name} via ${from}` };
      } catch {}
    }
  }
  die("couldn't find Playwright in this project, the global npm folder or PLAYWRIGHT_PATH. Don't run `playwright install`; point PLAYWRIGHT_PATH at a node_modules folder that has it.");
}
const { chromium, from: pwFrom } = loadPlaywright();
const executablePath = process.env.CHROMIUM_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

/* ---- what to measure in the page ------------------------------------ */

/* Runs inside the page. Kept plain so it works in any app. */
function measure() {
  const vw = document.documentElement.clientWidth;
  const text = (el) => (el.innerText || el.getAttribute("aria-label") || el.value || el.title || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    /* Off-screen skip links and visually hidden text are left out. */
    return r.width > 1 && r.height > 1 && r.right > 0 && r.bottom > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0;
  };
  const describe = (el) => {
    let d = el.tagName.toLowerCase();
    if (el.id) d += `#${el.id}`;
    else if (el.classList.length) d += "." + [...el.classList].slice(0, 2).join(".");
    return d;
  };

  /* Sideways scroll, and which elements stick out past the right edge. */
  const scrollW = document.documentElement.scrollWidth;
  const overflowing = [];
  if (scrollW > vw + 1) {
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0 && visible(el)) overflowing.push({ el: describe(el), right: Math.round(r.right) });
      if (overflowing.length >= 8) break;
    }
  }

  /* Headings and landmarks. */
  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible)
    .slice(0, 60).map((h) => ({ level: Number(h.tagName[1]), text: text(h) }));
  const landmarks = {};
  for (const sel of ["header", "nav", "main", "footer", "aside", "[role=dialog]", "dialog[open]"]) {
    landmarks[sel] = document.querySelectorAll(sel).length;
  }

  /* Tap targets. WCAG 2.5.8 asks for 24 by 24 CSS px (inline links in a
     sentence are exempt); obvious's --ds-control-tap-min is 44px. */
  const interactive = [...document.querySelectorAll("a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=switch],[role=checkbox],[tabindex]:not([tabindex='-1'])")].filter(visible);
  const small = [];
  let under24 = 0, under44 = 0;
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    const display = getComputedStyle(el).display;
    const inline = el.tagName === "A" && display === "inline" && el.closest("p,li,td,dd,blockquote");
    const min = Math.min(r.width, r.height);
    if (min < 44 && !inline) {
      under44++;
      if (min < 24) under24++;
      if (small.length < 15) small.push({ el: describe(el), text: text(el), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }

  /* Type in use: sizes and first family of elements that hold text directly. */
  const sizes = {}, families = {}, weights = {};
  const lowContrast = [];
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  /* Walks up to find a solid background. Gives up (returns null) on images
     and gradients, so those are left for the eye. */
  const backdrop = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== "none") return null;
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let checked = 0;
  while (walker.nextNode()) {
    const el = walker.currentNode.parentElement;
    if (!el || seen.has(el) || !walker.currentNode.textContent.trim() || !visible(el)) continue;
    seen.add(el);
    const s = getComputedStyle(el);
    const px = parseFloat(s.fontSize);
    sizes[Math.round(px * 10) / 10] = (sizes[Math.round(px * 10) / 10] || 0) + 1;
    const fam = s.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    families[fam] = (families[fam] || 0) + 1;
    weights[s.fontWeight] = (weights[s.fontWeight] || 0) + 1;
    if (checked < 600 && !el.closest("[disabled],[aria-disabled=true]")) {
      checked++;
      const fg = parse(s.color), bg = backdrop(el);
      if (fg && bg) {
        const f = over(fg, bg);
        const L1 = lum(f), L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const large = px >= 24 || (px >= 18.66 && Number(s.fontWeight) >= 700);
        const min = large ? 3 : 4.5;
        if (ratio < min && lowContrast.length < 15) lowContrast.push({ el: describe(el), text: text(el), ratio: Math.round(ratio * 100) / 100, min, px });
      }
    }
  }

  /* Is obvious loaded, and which theme faces does it ask for? */
  const root = getComputedStyle(document.documentElement);
  const ds = {
    loaded: Boolean(root.getPropertyValue("--ds-color-bg").trim()),
    display: root.getPropertyValue("--ds-font-display").trim(),
    sans: root.getPropertyValue("--ds-font-sans").trim(),
    bg: root.getPropertyValue("--ds-color-bg").trim(),
    accent: root.getPropertyValue("--ds-color-accent").trim(),
  };

  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${v})`);
  return {
    title: document.title, lang: document.documentElement.lang || null,
    pageHeight: document.documentElement.scrollHeight,
    sidewaysScroll: scrollW > vw + 1 ? { scrollWidth: scrollW, viewport: vw, overflowing } : null,
    h1Count: headings.filter((h) => h.level === 1).length, headings, landmarks,
    targets: { interactive: interactive.length, under24, under44, examples: small },
    type: { sizes: top(sizes, 14), families: top(families, 6), weights: top(weights, 6) },
    lowContrast, ds,
  };
}

/* ---- capture -------------------------------------------------------- */

const slug = (u) => {
  const p = new URL(u);
  return ((p.pathname.replace(/\/$/, "") || "/home").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home") + (p.hash ? "-" + p.hash.slice(1).replace(/[^a-z0-9]+/gi, "-") : "");
};

const outDir = resolve(opts.out);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath });
const report = { capturedWith: pwFrom, chromium: executablePath || "playwright default", views: [] };
let failed = 0;

for (const url of targets) {
  for (const width of opts.widths) {
    for (const scheme of opts.schemes) {
      const motions = opts.reducedMotion ? ["no-preference", "reduce"] : ["no-preference"];
      for (const motion of motions) {
        const phone = width < 600;
        /* 844 is an iPhone 14's CSS height; 800 is a common laptop viewport. */
        const height = phone ? 844 : 800;
        const name = `${slug(url)}-${width}-${scheme}${motion === "reduce" ? "-reduced" : ""}`;
        const view = { url, width, scheme, motion, name, console: [], pageErrors: [], failedRequests: [], files: [] };
        const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: opts.dpr,
          isMobile: phone, hasTouch: phone, colorScheme: scheme, reducedMotion: motion });
        const page = await ctx.newPage();
        page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") view.console.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
        page.on("pageerror", (e) => view.pageErrors.push(String(e.message || e).slice(0, 300)));
        page.on("requestfailed", (r) => view.failedRequests.push(`${r.failure()?.errorText || "failed"} ${r.url()}`));
        page.on("response", (r) => { if (r.status() >= 400) view.failedRequests.push(`${r.status()} ${r.url()}`); });
        try {
          const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          view.status = res?.status() ?? null;
          if (opts.early) {
            const f = join(outDir, `${name}-early.png`);
            await page.screenshot({ path: f });
            view.files.push(f);
          }
          await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => { view.note = "network never went quiet within 10s"; });
          await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
          await page.waitForTimeout(opts.wait);

          const fold = join(outDir, `${name}-fold.png`);
          await page.screenshot({ path: fold, animations: "disabled" });
          view.files.push(fold);

          view.facts = await page.evaluate(measure);
          /* Slices two viewports tall: long enough to see rhythm, short
             enough that the text stays legible when the image is read. */
          const sliceH = height * 2;
          const total = Math.ceil(view.facts.pageHeight / sliceH);
          const n = Math.min(total, opts.slices);
          for (let i = 0; i < n; i++) {
            const y = i * sliceH;
            const h = Math.min(sliceH, view.facts.pageHeight - y);
            if (h <= 0) break;
            const f = join(outDir, `${name}-full-${i + 1}.png`);
            await page.screenshot({ path: f, fullPage: true, animations: "disabled", clip: { x: 0, y, width, height: h } });
            view.files.push(f);
          }
          if (opts.steps) {
            view.steps = [];
            await page.evaluate(() => window.scrollTo(0, 0));
            for (const step of opts.steps) {
              const [kind, arg] = Object.entries(step)[0] || [];
              try {
                if (kind === "click") await page.locator(arg).first().click({ timeout: 5000 });
                else if (kind === "fill") await page.locator(arg[0]).first().fill(String(arg[1]), { timeout: 5000 });
                else if (kind === "press") await page.keyboard.press(arg);
                else if (kind === "hover") await page.locator(arg).first().hover({ timeout: 5000 });
                else if (kind === "goto") await page.goto(new URL(arg, url).href, { waitUntil: "networkidle", timeout: 30000 });
                else if (kind === "wait") await page.waitForTimeout(Number(arg));
                else if (kind === "shot") {
                  await page.waitForTimeout(300);
                  const f = join(outDir, `${name}-step-${String(arg).replace(/[^a-z0-9]+/gi, "-")}.png`);
                  await page.screenshot({ path: f });
                  view.files.push(f);
                } else throw new Error(`unknown step ${kind}`);
                view.steps.push(`ok ${kind} ${JSON.stringify(arg)}`);
              } catch (e) {
                view.steps.push(`FAILED ${kind} ${JSON.stringify(arg)}: ${String(e.message || e).split("\n")[0]}`);
                break;
              }
            }
          }
          if (total > n) view.note = `${view.note ? view.note + "; " : ""}page is ${total} slices long, saved the first ${n} (raise --slices for more)`;
        } catch (e) {
          failed++;
          view.error = String(e.message || e).split("\n")[0];
        }
        await ctx.close();
        report.views.push(view);
      }
    }
  }
}
await browser.close();
writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));

/* ---- plain summary -------------------------------------------------- */

for (const v of report.views) {
  console.log(`\n${v.name}  ${v.url}`);
  if (v.error) { console.log(`  could not open: ${v.error}`); continue; }
  const f = v.facts;
  console.log(`  status ${v.status}, ${f.pageHeight}px tall, title "${f.title}", lang ${f.lang ?? "missing"}`);
  console.log(`  console ${v.console.length}, page errors ${v.pageErrors.length}, failed requests ${v.failedRequests.length}`);
  for (const m of [...v.pageErrors, ...v.console, ...v.failedRequests].slice(0, 5)) console.log(`    ${m}`);
  console.log(`  sideways scroll: ${f.sidewaysScroll ? `yes, ${f.sidewaysScroll.scrollWidth}px in ${f.sidewaysScroll.viewport}px (${f.sidewaysScroll.overflowing.map((o) => o.el).join(", ")})` : "no"}`);
  console.log(`  h1: ${f.h1Count}, headings: ${f.headings.length}, landmarks: ${Object.entries(f.landmarks).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}`);
  console.log(`  targets: ${f.targets.interactive} interactive, ${f.targets.under24} under 24px` + (v.width < 600 ? `, ${f.targets.under44} under 44px (touch)` : ""));
  console.log(`  type sizes: ${f.type.sizes.join(", ")}`);
  console.log(`  faces: ${f.type.families.join(", ")}`);
  console.log(`  text under its contrast minimum (approximate): ${f.lowContrast.length}`);
  console.log(`  obvious tokens: ${f.ds.loaded ? `yes, bg ${f.ds.bg}, accent ${f.ds.accent}` : "not found on :root"}`);
  if (v.steps) for (const st of v.steps) console.log(`  step ${st}`);
  if (v.note) console.log(`  note: ${v.note}`);
  console.log(`  files: ${v.files.length} in ${outDir}`);
}
console.log(`\nreport: ${join(outDir, "report.json")}`);
process.exit(failed ? 1 : 0);
