#!/usr/bin/env node
/**
 * One measured pass over a live page, to feed an accessibility review.
 * Every line it prints is a lead to check by hand, never a verdict.
 *
 *   node a11y-pass.mjs <url> --from <app dir> [options]
 *
 *   --from <dir>     where to load Playwright (and axe-core, if present) from.
 *                    Usually the app being reviewed. Nothing is installed.
 *   --widths 390,1280   viewport widths for the page checks (default 390,1280)
 *   --dark           also run each width with prefers-color-scheme: dark
 *   --tabs 80        most Tab presses in the keyboard walk (default 80)
 *   --out <dir>      where to write report.json, aria-<width>.yml and
 *                    screenshots (default ./a11y-pass-out)
 *   --no-axe         skip axe even if the app has it
 *   --storage <file> a Playwright storageState JSON, for pages behind sign-in
 *                    (save one from a test account; never use real credentials)
 *
 * It has no imports beyond Node's own. Playwright and axe-core are borrowed
 * from the app's node_modules through createRequire, so the script runs
 * against whatever versions the app already has and never installs anything.
 * Chromium is the preinstalled one at /opt/pw-browsers/chromium (override
 * with CHROMIUM_PATH). Never run `playwright install`.
 *
 * What it measures, per width (and per colour scheme with --dark):
 *   axe     WCAG 2.0/2.1/2.2 A and AA rules, if axe-core is in the app.
 *           wcag22aa is passed explicitly because axe leaves target-size off
 *           by default.
 *   keys    a Tab walk: every stop's role and name, whether anything on
 *           screen changed when it took focus (a screenshot of the element
 *           focused and blurred, compared byte for byte), whether it was
 *           entirely covered by something else (2.4.11), positive tabindex,
 *           and the same element twice in a row (a possible trap).
 *   targets interactive things smaller than 24 by 24 CSS px (2.5.8) and
 *           smaller than obvious's --ds-control-tap-min of 44px. Links
 *           inside running text are marked, since 2.5.8 excuses them.
 *   aria    the accessibility tree as Playwright's ARIA snapshot (YAML),
 *           written to a file for reading: landmarks, headings, names.
 * Once per page:
 *   reflow  320 CSS px wide: sideways scroll and anything wider than the
 *           viewport (1.4.10). 320 px is the same as 1280 px at 400% zoom.
 *   zoom200 640 CSS px wide, the same as 1280 px at 200% zoom (1.4.4).
 *   spacing the 1.4.12 text spacing values applied with !important, then
 *           text that is clipped or now overflows its box.
 *   motion  prefers-reduced-motion: reduce, then animations still running
 *           after 1 second.
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const url = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["--dark", "--no-axe"].includes(argv[i - 1])));
if (!url) {
  console.error("Usage: node a11y-pass.mjs <url> --from <app dir> [--widths 390,1280] [--dark] [--tabs 80] [--out dir] [--no-axe]");
  process.exit(2);
}
const from = resolve(opt("--from", process.cwd()));
const widths = opt("--widths", "390,1280").split(",").map(Number).filter(Boolean);
const maxTabs = Number(opt("--tabs", "80"));
const out = resolve(opt("--out", "a11y-pass-out"));
const schemes = flag("--dark") ? ["light", "dark"] : ["light"];
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const storage = opt("--storage", null);
if (storage && !existsSync(storage)) {
  console.error(`No storage state at ${storage}.`);
  process.exit(2);
}
const withStorage = (o) => (storage ? { ...o, storageState: storage } : o);

/* ---- borrow the app's tools ----------------------------------------- */

const req = createRequire(join(from, "package.json"));
let chromium;
let playwrightFrom = null;
for (const name of ["playwright", "@playwright/test", "playwright-core"]) {
  try {
    ({ chromium } = req(name));
    if (chromium) {
      playwrightFrom = req.resolve(name);
      break;
    }
  } catch {}
}
if (!chromium) {
  console.error(`No Playwright in ${from}/node_modules. Pass --from with a folder that has it (run npm ci there first). Don't run playwright install.`);
  process.exit(2);
}
if (!existsSync(CHROMIUM)) {
  console.error(`No Chromium at ${CHROMIUM}. Set CHROMIUM_PATH to the preinstalled browser.`);
  process.exit(2);
}
let axeSource = null;
let axeVersion = null;
if (!flag("--no-axe")) {
  try {
    const pkg = req.resolve("axe-core/package.json");
    axeSource = readFileSync(join(pkg, "..", "axe.min.js"), "utf8");
    axeVersion = JSON.parse(readFileSync(pkg, "utf8")).version;
  } catch {}
}

mkdirSync(out, { recursive: true });
const report = { url, from, playwright: playwrightFrom, axe: axeVersion, chromium: CHROMIUM, runs: [], page: {} };
const lines = [];
const say = (s = "") => lines.push(s);

/* ---- in-page helpers (run inside the browser) ------------------------ */

const INTERACTIVE =
  "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=checkbox], [role=radio], [role=switch], [role=tab], [role=menuitem], [role=option], [role=slider], [tabindex]:not([tabindex='-1'])";

function describe(el) {
  const name = (el.getAttribute("aria-label") || el.innerText || el.value || el.getAttribute("title") || el.getAttribute("alt") || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const id = el.id ? `#${el.id}` : "";
  const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
  return `${el.tagName.toLowerCase()}${id}${cls}${name ? ` "${name}"` : ""}`;
}

/* The helper goes in as an init script, which runs outside the page's
   Content-Security-Policy, so a strict CSP doesn't stop the pass. */
async function newPage(ctx) {
  await ctx.addInitScript(`window.__a11yDescribe = ${describe.toString()};`);
  return ctx.newPage();
}

/* ---- one width ------------------------------------------------------- */

async function runWidth(browser, width, scheme) {
  const ctx = await browser.newContext(withStorage({ viewport: { width, height: 800 }, colorScheme: scheme, reducedMotion: "reduce" }));
  const page = await newPage(ctx);
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const tag = `${width}${scheme === "dark" ? "-dark" : ""}`;
  const run = { width, scheme, errors };

  /* axe */
  if (axeSource) {
    await page.evaluate(axeSource);
    const res = await page.evaluate(async () =>
      // eslint-disable-next-line no-undef
      axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations", "incomplete"] })
    );
    const slim = (r) => ({ id: r.id, impact: r.impact, help: r.help, tags: r.tags.filter((t) => /^wcag\d/.test(t)), count: r.nodes.length, targets: r.nodes.slice(0, 5).map((n) => n.target.join(" ")), summary: r.nodes[0]?.failureSummary?.split("\n").slice(0, 3).join(" ") });
    run.axe = { violations: res.violations.map(slim), incomplete: res.incomplete.map(slim) };
  }

  /* aria snapshot */
  try {
    const yml = await page.locator("body").ariaSnapshot();
    writeFileSync(join(out, `aria-${tag}.yml`), yml);
    run.aria = `aria-${tag}.yml`;
  } catch (e) {
    run.aria = `not available: ${String(e).slice(0, 80)}`;
  }

  /* targets */
  run.targets = await page.evaluate(({ sel }) => {
    const describe = window.__a11yDescribe;
    const res = [];
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === "hidden" || cs.display === "none" || el.closest("[inert],[aria-hidden=true]")) continue;
      if (r.width >= 44 && r.height >= 44) continue;
      const parent = el.parentElement;
      const inline = el.tagName === "A" && cs.display === "inline" && parent && /\S/.test([...parent.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(""));
      res.push({ el: describe(el), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, under24: r.width < 24 || r.height < 24, inline });
    }
    return res;
  }, { sel: INTERACTIVE });

  /* keyboard walk */
  const stops = [];
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  let firstKey = null;
  let lastKey = null;
  let repeats = 0;
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(60);
    const info = await page.evaluate(() => {
      const describe = window.__a11yDescribe;
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      if (!el.dataset.a11yPass) el.dataset.a11yPass = String(Math.random()).slice(2);
      const r = el.getBoundingClientRect();
      const inView = r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
      let covered = false;
      if (inView && r.width && r.height) {
        const pts = [[0.5, 0.5], [0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]].map(([x, y]) => [r.left + r.width * x, r.top + r.height * y]).filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
        covered = pts.length > 0 && pts.every(([x, y]) => { const top = document.elementFromPoint(x, y); return top && top !== el && !el.contains(top) && !top.contains(el); });
      }
      const ti = el.getAttribute("tabindex");
      return { key: el.dataset.a11yPass, el: describe(el), tabindex: ti, positiveTabindex: ti !== null && Number(ti) > 0, inView, covered, rect: { x: r.left, y: r.top, w: r.width, h: r.height } };
    });
    if (!info) { if (i > 0) break; else continue; }
    if (info.key === firstKey) break; // came round again
    firstKey ??= info.key;
    repeats = info.key === lastKey ? repeats + 1 : 0;
    lastKey = info.key;
    try {
      const snap = await page.locator(`[data-a11y-pass="${info.key}"]`).ariaSnapshot({ timeout: 1000 });
      info.role = snap.split("\n")[0].replace(/^- /, "").replace(/:$/, "").slice(0, 80);
    } catch {}
    /* focus indicator: does the element look any different focused? */
    if (info.inView && info.rect.w && info.rect.h) {
      const pad = 8;
      const vw = width;
      const clip = { x: Math.max(0, info.rect.x - pad), y: Math.max(0, info.rect.y - pad), width: Math.min(vw, info.rect.w + pad * 2), height: Math.min(800, info.rect.h + pad * 2) };
      clip.width = Math.min(clip.width, vw - clip.x);
      clip.height = Math.min(clip.height, 800 - clip.y);
      if (clip.width > 0 && clip.height > 0) {
        const focused = await page.screenshot({ clip });
        await page.evaluate(() => document.activeElement.blur());
        await page.waitForTimeout(30);
        const blurred = await page.screenshot({ clip });
        await page.evaluate((k) => document.querySelector(`[data-a11y-pass="${k}"]`)?.focus({ preventScroll: true }), info.key);
        info.focusChangesLook = !focused.equals(blurred);
        if (!info.focusChangesLook) writeFileSync(join(out, `nofocus-${tag}-${stops.length + 1}.png`), focused);
      }
    }
    stops.push(info);
    if (repeats >= 3) { info.possibleTrap = true; break; }
  }
  run.keys = stops.map(({ key, ...s }) => s);
  await page.screenshot({ path: join(out, `page-${tag}.png`), fullPage: true });
  await ctx.close();
  return run;
}

/* ---- once per page ----------------------------------------------------- */

async function overflowAt(browser, width) {
  const ctx = await browser.newContext(withStorage({ viewport: { width, height: 256 } }));
  const page = await newPage(ctx);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const res = await page.evaluate(() => {
    const describe = window.__a11yDescribe;
    const doc = document.documentElement;
    const wide = [];
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.right > doc.clientWidth + 1 && r.width > 0) {
        let p = el.parentElement, scrolls = false;
        for (; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") { scrolls = true; break; } }
        if (!scrolls) wide.push(`${describe(el)} (right edge ${Math.round(r.right)}px)`);
      }
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, sideways: doc.scrollWidth > doc.clientWidth + 1, wide: wide.slice(0, 10) };
  });
  await page.screenshot({ path: join(out, `width-${width}.png`), fullPage: true });
  await ctx.close();
  return res;
}

async function spacing(browser) {
  const ctx = await browser.newContext(withStorage({ viewport: { width: 390, height: 800 } }));
  const page = await newPage(ctx);
  await page.goto(url, { waitUntil: "networkidle" });
  const before = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }" });
  await page.waitForTimeout(300);
  const res = await page.evaluate(({ before }) => {
    const describe = window.__a11yDescribe;
    const clipped = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(el);
      const hides = /hidden|clip/.test(cs.overflow + cs.overflowX + cs.overflowY) || cs.textOverflow === "ellipsis";
      if (hides && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) clipped.push(describe(el));
    }
    return { clipped: clipped.slice(0, 15), sidewaysAfter: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, widthBefore: before };
  }, { before });
  await page.screenshot({ path: join(out, "text-spacing-390.png"), fullPage: true });
  await ctx.close();
  return res;
}

async function motion(browser) {
  const ctx = await browser.newContext(withStorage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" }));
  const page = await newPage(ctx);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const res = await page.evaluate(() => {
    const describe = window.__a11yDescribe;
    return document.getAnimations().filter((a) => a.playState === "running").map((a) => {
      const t = a.effect?.getTiming?.() ?? {};
      return `${a.effect?.target ? describe(a.effect.target) : "?"}: ${a.animationName || a.transitionProperty || a.constructor.name}, ${t.duration}ms x ${t.iterations}`;
    }).slice(0, 15);
  });
  await ctx.close();
  return { stillRunning: res };
}

/* ---- run --------------------------------------------------------------- */

const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  for (const w of widths) for (const s of schemes) report.runs.push(await runWidth(browser, w, s));
  report.page.reflow320 = await overflowAt(browser, 320);
  report.page.zoom200 = await overflowAt(browser, 640);
  report.page.spacing = await spacing(browser);
  report.page.motion = await motion(browser);
} finally {
  await browser.close();
}
writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));

/* ---- print ------------------------------------------------------------- */

say(`a11y-pass: ${url}`);
say(`playwright: ${playwrightFrom}`);
say(`axe-core: ${axeVersion ?? "not in the app, so no rule engine ran; do those checks by hand"}`);
for (const r of report.runs) {
  say();
  say(`== ${r.width}px ${r.scheme} ==`);
  if (r.errors.length) say(`console errors: ${r.errors.length}  ${r.errors.slice(0, 3).join(" | ")}`);
  if (r.axe) {
    say(`axe violations: ${r.axe.violations.length} rules`);
    for (const v of r.axe.violations) say(`  [${v.impact}] ${v.id} (${v.tags.join(",")}) x${v.count}: ${v.help}. e.g. ${v.targets[0]}`);
    say(`axe needs review: ${r.axe.incomplete.map((v) => `${v.id} x${v.count}`).join(", ") || "none"}`);
  }
  const small = r.targets.filter((t) => t.under24 && !t.inline);
  const inline = r.targets.filter((t) => t.under24 && t.inline).length;
  const under44 = r.targets.filter((t) => !t.under24).length;
  say(`targets under 24px: ${small.length}${inline ? ` (plus ${inline} in running text, which 2.5.8 excuses)` : ""}; 24 to 43px: ${under44}`);
  for (const t of small.slice(0, 8)) say(`  ${t.el} ${t.w}x${t.h}`);
  const k = r.keys;
  say(`tab stops: ${k.length}${k.length >= maxTabs ? " (stopped at --tabs limit)" : ""}`);
  for (const s of k.filter((s) => s.focusChangesLook === false && !s.covered)) say(`  no visible change on focus: ${s.el}`);
  for (const s of k.filter((s) => s.covered)) say(`  covered when focused (2.4.11): ${s.el}`);
  for (const s of k.filter((s) => !s.inView)) say(`  focused but off screen: ${s.el}`);
  for (const s of k.filter((s) => s.positiveTabindex)) say(`  positive tabindex ${s.tabindex}: ${s.el}`);
  for (const s of k.filter((s) => s.possibleTrap)) say(`  focus stuck (possible trap): ${s.el}`);
  say(`  order: ${k.slice(0, 25).map((s) => s.role || s.el).join(" > ")}${k.length > 25 ? " > ..." : ""}`);
  say(`aria tree: ${r.aria}`);
}
const p = report.page;
say();
say(`reflow at 320px: ${p.reflow320.sideways ? `SIDEWAYS SCROLL (${p.reflow320.scrollWidth}px wide)` : "no sideways scroll"}`);
for (const w of p.reflow320.wide) say(`  ${w}`);
say(`640px (200% zoom): ${p.zoom200.sideways ? `SIDEWAYS SCROLL (${p.zoom200.scrollWidth}px)` : "no sideways scroll"}`);
say(`text spacing: ${p.spacing.clipped.length} boxes clip text${p.spacing.sidewaysAfter ? ", and the page now scrolls sideways" : ""}`);
for (const c of p.spacing.clipped.slice(0, 8)) say(`  ${c}`);
say(`reduced motion: ${p.motion.stillRunning.length} animations still running after 1s`);
for (const m of p.motion.stillRunning.slice(0, 8)) say(`  ${m}`);
say();
say(`Written to ${out}: report.json, aria-*.yml, page and width screenshots${report.runs.some((r) => r.keys.some((s) => s.focusChangesLook === false)) ? ", nofocus-*.png" : ""}.`);
say("Every line above is a lead. Confirm each one by hand before it goes in the review.");
console.log(lines.join("\n"));
