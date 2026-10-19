#!/usr/bin/env node
/**
 * Which obvious token is this literal, or the nearest to it?
 *
 * Give it the values the audit flagged and it says, for the app's own theme,
 * which token matches exactly and which is closest when nothing does, with
 * the gap. An exact match is a straight swap. A near miss is a design call
 * (the thing will look different), so it's reported as one and never
 * swapped silently.
 *
 *   node ds-nearest.mjs <app> 13px 26px "#E8E9E5" 300ms "cubic-bezier(.2,1,.3,1)"
 *   node ds-nearest.mjs <app> 26px --as radius      # only compare against one group
 *   node ds-nearest.mjs <app> 1.45 --as leading
 *   node ds-nearest.mjs <app> "#fff" --theme morris  # pick the theme yourself
 *
 * --as applies to every value in the call, so group values by kind.
 * Groups for --as: colour, text, space, radius, border, control, duration,
 * ease, leading, weight. Without --as, a px value is compared against text,
 * space, radius, border and control, and the closest in each is shown.
 *
 * Token values come from tokens.json in the app's ds/, its installed
 * node_modules/obvious, or the obvious checkout this skill lives in. Radius
 * steps are worked out from the theme's --ds-radius-base and control sizes
 * from its --ds-density, the same sums the CSS does.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const optionValues = new Set(["--as", "--theme", "--obvious"].map(opt).filter(Boolean));
const positional = args.filter((a) => !a.startsWith("--") && !optionValues.has(a));
if (positional.length < 2) {
  console.error("Usage: node ds-nearest.mjs <app> <value> [more values] [--as group] [--theme name]");
  process.exit(2);
}
const app = resolve(positional[0]);
const values = positional.slice(1);
const only = opt("--as");

/* ---- find tokens.json and the theme --------------------------------- */

const tryJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};
const obviousRoots = [opt("--obvious"), process.env.OBVIOUS, join(HERE, "..", "..", "..", "..")].filter(Boolean);
const tokenFiles = [
  join(app, "ds", "js", "tokens.json"),
  join(app, "node_modules", "obvious", "dist", "js", "tokens.json"),
  join(app, "dist", "js", "tokens.json"),
  ...obviousRoots.map((r) => join(resolve(r), "dist", "js", "tokens.json")),
];
const tokenFile = tokenFiles.find((f) => existsSync(f) && tryJson(f)?.primitives);
if (!tokenFile) {
  console.error("Couldn't find obvious's tokens.json in the app's ds/, node_modules/obvious or an obvious checkout.");
  process.exit(2);
}
const tokens = tryJson(tokenFile);

function detectTheme() {
  const SKIP = new Set(["node_modules", ".git", ".next", "dist", "build", "out", "ds", ".claude", ".agents", "site", "fixtures", "test"]);
  const found = new Set();
  const walk = (dir) => {
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const e of entries) {
      if (SKIP.has(e)) continue;
      const full = join(dir, e);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(full);
      else if ([".css", ".scss", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".html"].includes(extname(e))) {
        const src = readFileSync(full, "utf8");
        for (const m of src.matchAll(/(?:ds|obvious(?:\/dist)?)\/css\/themes\/([a-z]+)\.css/g)) found.add(m[1]);
      }
    }
  };
  walk(app);
  return [...found].filter((t) => tokens.themes[t]);
}
let theme = opt("--theme");
if (!theme) {
  const found = detectTheme();
  theme = found.length === 1 ? found[0] : "core";
  if (found.length !== 1)
    console.log(`Theme: ${found.length ? `several imported (${found.join(", ")})` : "none found"}, so using core. Pass --theme to choose.\n`);
}
if (!tokens.themes[theme]) {
  console.error(`No theme called ${theme}. Themes: ${Object.keys(tokens.themes).join(", ")}`);
  process.exit(2);
}
const t = tokens.themes[theme];
const dark = tokens.dark?.[theme] ?? {};
const P = tokens.primitives;
const radiusBase = parseFloat(t["--ds-radius-base"]);
const density = parseFloat(t["--ds-density"]);

/* ---- resolve tokens to numbers --------------------------------------- */

const px = (v) => {
  const m = String(v).trim().match(/^(-?\d*\.?\d+)(px|rem)?$/);
  if (!m) return null;
  return m[2] === "rem" ? parseFloat(m[1]) * 16 : parseFloat(m[1]);
};
const pick = (prefix) => Object.entries(P).filter(([k]) => k.startsWith(prefix));

const groups = {
  text: pick("--ds-text-")
    .map(([k, v]) => [k, px(v), v])
    .filter(([, n]) => n !== null),
  space: pick("--ds-space-")
    .filter(([k]) => !k.includes("fluid"))
    .map(([k, v]) => [k, px(v), v]),
  radius: pick("--ds-radius-").map(([k, v]) => {
    if (k === "--ds-radius-full") return [k, px(v), v];
    const mult = v.match(/\*\s*([\d.]+)/);
    const n = mult ? radiusBase * parseFloat(mult[1]) : radiusBase;
    return [k, Math.round(n * 100) / 100, `${v} = ${Math.round(n * 100) / 100}px in ${theme}`];
  }),
  border: pick("--ds-border-").map(([k, v]) => [k, px(v), v]),
  control: pick("--ds-control-").map(([k, v]) => {
    const m = v.match(/calc\((\d+)px \* var\(--ds-density\)\)/);
    const n = m ? parseFloat(m[1]) * density : px(v);
    return [k, n, m ? `${v} = ${n}px in ${theme}` : v];
  }),
  duration: pick("--ds-duration-").map(([k, v]) => [k, parseFloat(v), v]),
  leading: [...pick("--ds-leading-"), ...pick("--ds-type-").filter(([k]) => k.endsWith("-leading"))].map(([k, v]) => [k, parseFloat(v), v]),
  weight: pick("--ds-weight-").map(([k, v]) => [k, parseFloat(v), v]),
};

/* ---- colour maths ---------------------------------------------------- */

function parseColour(c) {
  const s = String(c).trim();
  let m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((x) => x + x).join("");
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  return null;
}
const lin = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
/* Distance in OKLab (Ottosson, 2020), which tracks how different colours
   look better than distance in raw channel numbers. Used only to rank
   candidates: anything short of exact is still a different colour. */
function oklab({ r, g, b }) {
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const colourDistance = (a, b) => {
  const [x, y] = [oklab(a), oklab(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) + Math.abs(a.a - b.a) * 0.5;
};
const lum = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/* ---- matching -------------------------------------------------------- */

const fmt = (n) => (Math.round(n * 100) / 100).toString();

function nearestIn(group, n) {
  const list = groups[group].filter(([, v]) => typeof v === "number" && !Number.isNaN(v));
  const sorted = [...list].sort((a, b) => Math.abs(a[1] - n) - Math.abs(b[1] - n));
  return sorted[0] ?? null;
}

function reportNumber(raw, n, unit, candidates) {
  console.log(`${raw}`);
  for (const g of candidates) {
    const best = nearestIn(g, n);
    if (!best) continue;
    const gap = best[1] - n;
    const what = Math.abs(gap) < 0.005 ? "exact" : `${gap > 0 ? "+" : ""}${fmt(gap)}${unit} (${fmt((Math.abs(gap) / n) * 100)}%)`;
    console.log(`  ${g.padEnd(9)} ${best[0].padEnd(26)} ${String(best[2]).padEnd(34)} ${what}`);
  }
}

function reportColour(raw) {
  const c = parseColour(raw);
  console.log(raw);
  if (!c) {
    console.log("  can't read that colour (hex, rgb() and rgba() only)");
    return;
  }
  const sets = [["", t]];
  if (Object.keys(dark).length) sets.push(["dark ", dark]);
  const rows = [];
  for (const [label, set] of sets) {
    for (const [k, v] of Object.entries(set)) {
      if (!k.startsWith("--ds-color-")) continue;
      const tc = parseColour(v);
      if (tc) rows.push({ k: label + k, v, d: colourDistance(c, tc) });
    }
  }
  rows.sort((a, b) => a.d - b.d);
  console.log("  (distance is OKLab x 100, for ranking; only exact is a straight swap)");
  for (const r of rows.slice(0, 3)) {
    const what = r.d < 0.0005 ? "exact" : `${fmt(r.d * 100)} apart`;
    console.log(`  ${r.k.padEnd(32)} ${r.v.padEnd(26)} ${what}`);
  }
  const bg = parseColour(t["--ds-color-bg"]);
  if (bg && c.a === 1) console.log(`  as text on ${theme}'s bg: ${fmt(contrast(c, bg))}:1`);
}

function reportEase(raw) {
  const nums = (s) => (s.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  const want = nums(raw);
  console.log(raw);
  const rows = Object.entries(P)
    .filter(([k]) => k.startsWith("--ds-ease-"))
    .map(([k, v]) => {
      const have = nums(v);
      const d = have.length === want.length ? Math.hypot(...have.map((x, i) => x - want[i])) : Infinity;
      return { k, v, d };
    })
    .sort((a, b) => a.d - b.d);
  const best = rows[0];
  if (!best || best.d === Infinity) console.log("  no curve of the same shape. The house curve is --ds-ease-out.");
  else console.log(`  ${best.k.padEnd(18)} ${best.v.padEnd(34)} ${best.d < 0.001 ? "exact" : `off by ${fmt(best.d)}`}`);
}

console.log(`Theme ${theme} (radius base ${t["--ds-radius-base"]}, density ${t["--ds-density"]}), tokens from ${tokenFile}\n`);

for (const raw of values) {
  const v = raw.trim();
  if (only === "colour" || /^#|^rgba?\(/i.test(v)) reportColour(v);
  else if (only === "ease" || /^(cubic-bezier|linear)\(/i.test(v)) reportEase(v);
  else if (only === "duration" || /^\d*\.?\d+m?s$/.test(v)) {
    const ms = v.endsWith("ms") ? parseFloat(v) : v.endsWith("s") ? parseFloat(v) * 1000 : parseFloat(v);
    reportNumber(v, ms, "ms", ["duration"]);
    if (ms > parseFloat(P["--ds-duration-slowest"])) console.log("  longer than any duration token: a loop or choreography, not a transition");
  } else if (only === "leading" || only === "weight") {
    reportNumber(v, parseFloat(v), "", [only]);
  } else {
    const n = px(v);
    if (n === null) {
      console.log(`${v}\n  can't read that value. Try px, rem, ms, s, a colour or a cubic-bezier().`);
    } else {
      reportNumber(v, n, "px", only ? [only] : ["text", "space", "radius", "border", "control"]);
    }
  }
  console.log("");
}
console.log("exact: swap it. Anything else is a design call: change it only if it still looks right, or record why in .ds-audit.json.");
