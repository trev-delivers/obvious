#!/usr/bin/env node
/**
 * Matches the values in a Figma frame to obvious's --ds-* tokens.
 *
 *   node match-tokens.mjs figma-vars.json --theme morris --width 390
 *   node match-tokens.mjs figma-vars.json --theme morris --mode dark
 *   node match-tokens.mjs --theme core --values "#5B7FE8" 24 "Inter" "250ms"
 *   node match-tokens.mjs figma-vars.json --theme core --json
 *
 * The JSON file is what Figma's get_variable_defs returns, saved as is: an
 * object of { "variable or style name": "value" }. A plain array of values
 * works too. Names help: a number called "radius/md" is checked against the
 * radius steps, one called "spacing/4" against the spacing scale.
 *
 * Each value gets one of four verdicts:
 *   exact  a token holds this value. Use it.
 *   near   a colour within 0.02 in OKLab of a token, which CSS Color 4 treats
 *          as the just-noticeable difference. Use the token and say so.
 *   snap   a size between two steps of a scale. obvious's rule is to take
 *          the nearest step rather than add a value. Use it and say so.
 *   none   nothing in the system is close. Don't invent a token: flag it.
 *
 * Fluid sizes (the h1 to h3 and lead text, the fluid spacing, the gutter)
 * are worked out at --width, which should be the Figma frame's width.
 *
 * tokens.json is found in this order: --tokens, then ds/js/tokens.json,
 * node_modules/obvious/dist/js/tokens.json and dist/js/tokens.json in the
 * current folder or any folder above it. That covers apps that sync ds/,
 * apps that install obvious from npm, and obvious itself.
 *
 * Exit codes: 0 report printed, 2 couldn't run. Node's own modules only.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

/* ---------- arguments ---------- */

const argv = process.argv.slice(2);
const opts = { values: [] };
const files = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--theme") opts.theme = argv[++i];
  else if (a === "--width") opts.width = Number(argv[++i]);
  else if (a === "--mode") opts.mode = argv[++i];
  else if (a === "--tokens") opts.tokens = argv[++i];
  else if (a === "--json") opts.json = true;
  else if (a === "--values") {
    while (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) opts.values.push(argv[++i]);
  } else files.push(a);
}

function fail(message) {
  if (opts.json) console.log(JSON.stringify({ error: message }));
  else console.error(`match-tokens: ${message}`);
  process.exit(2);
}

/* ---------- tokens ---------- */

function findTokens() {
  if (opts.tokens) return resolve(opts.tokens);
  let dir = process.cwd();
  for (;;) {
    for (const rel of ["ds/js/tokens.json", "node_modules/obvious/dist/js/tokens.json", "dist/js/tokens.json"]) {
      const p = join(dir, rel);
      if (existsSync(p)) return p;
    }
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

const tokensPath = findTokens();
if (!tokensPath || !existsSync(tokensPath)) {
  fail("can't find obvious's tokens.json. Run this from the app's folder, or pass --tokens <path to ds/js/tokens.json>.");
}
let tokens;
try {
  tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
} catch (e) {
  fail(`can't read ${tokensPath}: ${e.message}`);
}
const themeNames = Object.keys(tokens.themes || {});
if (!opts.theme) fail(`say which theme the app uses with --theme. This tokens.json has: ${themeNames.join(", ")}.`);
if (!tokens.themes[opts.theme]) fail(`no theme called "${opts.theme}". This tokens.json has: ${themeNames.join(", ")}.`);
const mode = opts.mode || "light";
if (mode === "dark" && !tokens.dark?.[opts.theme]) {
  fail(`the ${opts.theme} theme has no dark set. Only these do: ${Object.keys(tokens.dark || {}).join(", ") || "none"}.`);
}
/* Without --width the fluid sizes are worked out at 390, the phone width every
   app is checked at. */
const width = opts.width > 0 ? opts.width : 390;

const vars = {
  ...tokens.primitives,
  ...tokens.themes[opts.theme],
  ...(mode === "dark" ? tokens.dark[opts.theme] : {}),
};

/* Resolves var() references, then works out calc() and clamp() in px at the
   frame width. Returns a number of px, or null if the value isn't a length. */
function expand(value, depth = 0) {
  if (depth > 10) return value;
  return String(value).replace(/var\((--[\w-]+)\)/g, (_, name) => (name in vars ? expand(vars[name], depth + 1) : "0"));
}
function px(value) {
  let s = expand(value).trim();
  s = s.replace(/(-?[\d.]+)vw/g, (_, n) => String((Number(n) * width) / 100));
  s = s.replace(/(-?[\d.]+)px/g, "$1");
  s = s.replace(/clamp\(([^,]+),([^,]+),([^)]+)\)/g, (_, lo, mid, hi) => `Math.min(Math.max(${mid},${lo}),${hi})`);
  s = s.replace(/calc\(/g, "(");
  /* Only digits, arithmetic and Math.min/max may be left, so the Function
     below can only ever do sums. */
  if (!s || !/^[\d.\s+\-*/(),]*$/.test(s.replace(/Math\.(min|max)/g, ""))) return null;
  try {
    const n = Function(`"use strict";return (${s});`)();
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

const family = (prefix) =>
  Object.keys(vars)
    .filter((k) => k.startsWith(prefix))
    .map((k) => ({ token: k, px: px(vars[k]) }))
    .filter((t) => t.px !== null);

const SCALES = {
  space: family("--ds-space-").concat(family("--ds-gutter")),
  text: family("--ds-text-"),
  radius: family("--ds-radius-").filter((t) => t.token !== "--ds-radius-base"),
  border: family("--ds-border-"),
  control: family("--ds-control-"),
};

/* ---------- colour ---------- */

function parseColour(input) {
  const c = String(input).trim();
  let m = c.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  return null;
}
const over = (top, under) => ({
  r: top.r * top.a + under.r * (1 - top.a),
  g: top.g * top.a + under.g * (1 - top.a),
  b: top.b * top.a + under.b * (1 - top.a),
  a: 1,
});
const lin = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
function oklab({ r, g, b }) {
  [r, g, b] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const deltaEOK = (x, y) => {
  const [p, q] = [oklab(x), oklab(y)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
/* CSS Color 4 gamut mapping: "JND is an OkLCh difference of 0.02". */
const JND = 0.02;
const page = parseColour(vars["--ds-color-bg"]) || { r: 255, g: 255, b: 255, a: 1 };
const colourTokens = Object.keys(vars)
  .filter((k) => k.startsWith("--ds-color-"))
  .map((k) => ({ token: k, colour: parseColour(vars[k]), raw: vars[k] }))
  .filter((t) => t.colour);

function matchColour(value) {
  const c = parseColour(value);
  /* Translucent colours are judged by what they look like on the page. */
  const seen = over(c, page);
  const ranked = colourTokens
    .map((t) => ({ ...t, d: deltaEOK(seen, over(t.colour, page)), sameAlpha: Math.abs(t.colour.a - c.a) < 0.02 }))
    .sort((x, y) => x.d - y.d || y.sameAlpha - x.sameAlpha);
  const best = ranked[0];
  const d = +best.d.toFixed(3);
  const alts = ranked.filter((t) => t.d === best.d && t.token !== best.token).map((t) => t.token);
  const also = alts.length ? ` Same value: ${alts.join(", ")}; pick by role.` : "";
  if (best.d < 0.001) return { verdict: "exact", token: best.token, note: `Holds ${best.raw}.${also}` };
  if (best.d <= JND) return { verdict: "near", token: best.token, note: `Off by ${d} in OKLab, under the 0.02 you'd notice. Token holds ${best.raw}.${also}` };
  return { verdict: "none", token: null, note: `Nearest is ${best.token} (${best.raw}), off by ${d}, which is visible. Flag it.` };
}

/* ---------- sizes ---------- */

function nearestOn(scale, n) {
  const ranked = scale.map((t) => ({ ...t, d: Math.abs(t.px - n) })).sort((a, b) => a.d - b.d);
  return ranked;
}

function scaleFor(name) {
  const s = name.toLowerCase();
  if (/radius|corner|round/.test(s)) return "radius";
  if (/border|stroke|outline/.test(s)) return "border";
  if (/font.?size|text.?size|type.?size|\bsize\b.*(text|font)/.test(s)) return "text";
  if (/height|control|button|input|tap/.test(s)) return "control";
  if (/space|spacing|gap|padding|pad\b|margin|inset|gutter/.test(s)) return "space";
  return null;
}

function matchSize(name, n) {
  const hinted = scaleFor(name);
  const scales = hinted ? [hinted] : ["space", "radius", "text", "control", "border"];
  const exact = [];
  let foundOn = hinted;
  for (const s of scales) {
    for (const t of SCALES[s]) {
      if (Math.abs(t.px - n) < 0.5) {
        exact.push(t.token);
        foundOn = foundOn || s;
      }
    }
  }
  if (exact.length) {
    let note = exact.length > 1 ? `Several tokens hold ${n}px; pick by what it is: ${exact.join(", ")}.` : `On the ${foundOn} scale.`;
    if (isFluid(exact[0])) note += ` ${exact[0]} is fluid: ${n}px at ${width}px wide, and it changes with the screen.`;
    return { verdict: "exact", token: exact[0], note };
  }
  const scale = hinted || "space";
  const ranked = nearestOn(SCALES[scale], n);
  const best = ranked[0];
  if (!best) return { verdict: "none", token: null, note: `No ${scale} tokens to compare with.` };
  /* More than a third off the nearest step means the frame wants a size the
     system doesn't have, which is a question for the designer. */
  if (best.d / Math.max(best.px, 1) > 0.34) {
    return { verdict: "none", token: null, note: `Nothing on the ${scale} scale is close; nearest is ${best.token} (${round(best.px)}px). Flag it.` };
  }
  const why = scale === "space" ? "obvious takes the nearest step rather than adding one" : "nearest step";
  return { verdict: "snap", token: best.token, note: `${n}px sits off the ${scale} scale; ${best.token} is ${round(best.px)}px (${why}).` };
}
const round = (n) => Math.round(n * 100) / 100;
const isFluid = (token) => /vw/.test(expand(vars[token]));

/* ---------- type ---------- */

const faces = {
  display: String(vars["--ds-font-display"] || ""),
  sans: String(vars["--ds-font-sans"] || ""),
};
const firstFace = (stack) => stack.split(",")[0].trim().replace(/^['"]|['"]$/g, "").toLowerCase();

function matchFamily(name) {
  const f = name.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
  for (const [slot, stack] of Object.entries(faces)) {
    const listed = stack.split(",").map((x) => x.trim().replace(/^['"]|['"]$/g, "").toLowerCase());
    if (listed[0] === f) return { verdict: "exact", token: `--ds-font-${slot}`, note: `The theme's ${slot} face.` };
    if (listed.includes(f)) return { verdict: "near", token: `--ds-font-${slot}`, note: `In the ${slot} stack as a fallback, not its first face.` };
  }
  return {
    verdict: "none",
    token: null,
    note: `Not one of the theme's faces (${firstFace(faces.display)} for headings, ${firstFace(faces.sans)} for the rest). Use those and don't load ${name}. Flag it.`,
  };
}

const ROLES = ["h1", "h2", "h3", "lead", "body", "ui", "label"].map((role) => ({
  role,
  size: px(vars[`--ds-type-${role}-size`]),
  leading: Number(vars[`--ds-type-${role}-leading`]),
  weight: Number(vars[`--ds-type-${role}-weight`]),
  tracking: parseFloat(vars[`--ds-type-${role}-tracking`]) || 0,
}));

/* Figma writes text styles as Font(family: "Inter", style: Bold, size: 32,
   weight: 700, lineHeight: 40, letterSpacing: -2). Line height may be px, a
   percent, or "auto"; letter spacing px or a percent. */
function parseFont(value) {
  const get = (key) => {
    const m = value.match(new RegExp(`${key}\\s*:\\s*("([^"]*)"|[^,)]+)`, "i"));
    return m ? (m[2] ?? m[1]).trim() : null;
  };
  return {
    family: get("family"),
    size: parseFloat(get("size")),
    weight: parseFloat(get("weight")),
    lineHeight: get("lineHeight"),
    letterSpacing: get("letterSpacing"),
  };
}

function matchFont(value) {
  const f = parseFont(value);
  if (!(f.size > 0)) return { verdict: "none", token: null, note: "Couldn't read a size from this text style. Map it by hand." };
  let leading = null;
  if (f.lineHeight && /%$/.test(f.lineHeight)) leading = parseFloat(f.lineHeight) / 100;
  else if (f.lineHeight && !/auto/i.test(f.lineHeight) && parseFloat(f.lineHeight) > 0) leading = parseFloat(f.lineHeight) / f.size;
  let tracking = null;
  if (f.letterSpacing && /%$/.test(f.letterSpacing)) tracking = parseFloat(f.letterSpacing) / 100;
  else if (f.letterSpacing && !isNaN(parseFloat(f.letterSpacing))) tracking = parseFloat(f.letterSpacing) / f.size;

  const scored = ROLES.map((r) => {
    let score = Math.abs(r.size - f.size) / r.size;
    if (leading) score += Math.abs(r.leading - leading) / 2;
    if (f.weight) score += Math.abs(r.weight - f.weight) / 1000;
    return { ...r, score };
  }).sort((a, b) => a.score - b.score);
  const best = scored[0];
  const diffs = [];
  if (Math.abs(best.size - f.size) >= 0.5) diffs.push(`size ${f.size}px against ${round(best.size)}px at ${width}px wide`);
  if (leading && Math.abs(best.leading - leading) > 0.03) diffs.push(`line height ${round(leading)} against ${best.leading}`);
  if (f.weight && f.weight !== best.weight) diffs.push(`weight ${f.weight} against ${best.weight}`);
  if (tracking !== null && Math.abs(best.tracking - tracking) > 0.005) diffs.push(`tracking ${round(tracking)}em against ${best.tracking}em`);
  const fam = f.family ? matchFamily(f.family) : null;
  const famNote = fam && fam.verdict === "none" ? ` ${fam.note}` : "";
  const sizeOff = Math.abs(best.size - f.size) / best.size;
  const verdict = diffs.length === 0 ? "exact" : sizeOff > 0.2 ? "none" : "snap";
  const head =
    verdict === "exact"
      ? `The ${best.role} role.`
      : verdict === "snap"
        ? `Closest role is ${best.role}: ${diffs.join(", ")}. Use the role as a set.`
        : `No role is close (${diffs.join(", ")}). Flag it.`;
  return { verdict: fam && fam.verdict === "none" && verdict === "exact" ? "snap" : verdict, token: verdict === "none" ? null : `--ds-type-${best.role}-*`, note: head + famNote };
}

/* ---------- motion, weight, shadow ---------- */

function matchDuration(value) {
  const m = String(value).match(/^([\d.]+)\s*(ms|s)$/);
  const ms = m[2] === "s" ? Number(m[1]) * 1000 : Number(m[1]);
  const list = Object.keys(vars)
    .filter((k) => k.startsWith("--ds-duration-"))
    .map((k) => ({ token: k, ms: parseFloat(vars[k]) }))
    .sort((a, b) => Math.abs(a.ms - ms) - Math.abs(b.ms - ms));
  const best = list[0];
  if (best.ms === ms) return { verdict: "exact", token: best.token, note: "" };
  return { verdict: "snap", token: best.token, note: `${ms}ms isn't a step; ${best.token} is ${best.ms}ms. Tune with transitions-polish if it matters.` };
}

function matchEase(value) {
  const norm = (s) => String(s).replace(/\s+/g, "").toLowerCase();
  const hit = Object.keys(vars).find((k) => k.startsWith("--ds-ease-") && norm(vars[k]) === norm(value));
  if (hit) return { verdict: "exact", token: hit, note: "" };
  return { verdict: "none", token: null, note: "Not one of the house curves. Use --ds-ease-out unless the motion is a settle (--ds-ease-spring). Flag it." };
}

function matchWeight(n) {
  const hit = Object.keys(vars).find((k) => k.startsWith("--ds-weight-") && Number(vars[k]) === n);
  if (hit) return { verdict: "exact", token: hit, note: "" };
  return { verdict: "none", token: null, note: `${n} isn't one of the weights (400, 500, 600, 700). Flag it.` };
}

/* Figma effects read like Effect(type: DROP_SHADOW, color: #0000001A,
   offset: (0, 4), radius: 8, spread: 0). Only the shape is matched: the
   colour of every obvious shadow comes from --ds-color-shadow-color. */
function matchShadow(value) {
  const nums = (key) => {
    const m = value.match(new RegExp(`${key}\\s*:\\s*\\(?\\s*(-?[\\d.]+)(?:\\s*,\\s*(-?[\\d.]+))?`, "i"));
    return m ? [Number(m[1]), m[2] !== undefined ? Number(m[2]) : undefined] : [];
  };
  const [, y = 0] = nums("offset");
  const [blur = 0] = nums("radius");
  const [spread = 0] = nums("spread");
  const shapes = Object.keys(vars)
    .filter((k) => /^--ds-shadow-(sm|md|lg|xl)$/.test(k))
    .map((k) => {
      const n = expand(vars[k]).match(/-?[\d.]+px|\b0\b/g).map(parseFloat);
      return { token: k, y: n[1], blur: n[2], spread: n[3] || 0 };
    })
    .map((s) => ({ ...s, d: Math.abs(s.y - y) + Math.abs(s.blur - blur) + Math.abs(s.spread - spread) }))
    .sort((a, b) => a.d - b.d);
  const best = shapes[0];
  const note = `Shape y ${y}, blur ${blur}, spread ${spread}; ${best.token} is y ${best.y}, blur ${best.blur}, spread ${best.spread}. Its colour comes from --ds-color-shadow-color.`;
  if (best.d === 0) return { verdict: "exact", token: best.token, note };
  if (best.d <= Math.max(4, best.blur * 0.5)) return { verdict: "snap", token: best.token, note };
  return { verdict: "none", token: null, note: `${note} Too far apart. Flag it.` };
}

/* ---------- dispatch ---------- */

function classify(name, value) {
  const v = String(value).trim();
  if (/^Font\(/i.test(v)) return { kind: "text style", ...matchFont(v) };
  if (/^Effect\(/i.test(v) || /shadow/i.test(v)) return { kind: "shadow", ...matchShadow(v) };
  if (parseColour(v)) return { kind: "colour", ...matchColour(v) };
  if (/^[\d.]+\s*(ms|s)$/.test(v)) return { kind: "duration", ...matchDuration(v) };
  if (/^cubic-bezier|^linear\(/i.test(v)) return { kind: "easing", ...matchEase(v) };
  if (/^-?[\d.]+(px)?$/.test(v)) {
    const n = parseFloat(v);
    if (/weight/i.test(name)) return { kind: "weight", ...matchWeight(n) };
    if (/opacity|line.?height|leading|letter|tracking|z.?index|scale/i.test(name)) {
      return { kind: "number", verdict: "none", token: null, note: "Not a length obvious tokenises on its own. Line height and tracking come with the type role." };
    }
    return { kind: "size", ...matchSize(name, n) };
  }
  if (/family|font|face|typeface/i.test(name) || /^['"]?[A-Z][\w ]+['"]?$/.test(v)) return { kind: "font family", ...matchFamily(v) };
  return { kind: "unknown", verdict: "none", token: null, note: "Couldn't tell what this is. Map it by hand." };
}

/* ---------- input ---------- */

let entries = [];
for (const file of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`can't read ${file} as JSON (${e.message}). Save get_variable_defs' output as a .json file.`);
  }
  if (Array.isArray(data)) entries.push(...data.map((v) => ["", v]));
  else if (data && typeof data === "object") entries.push(...Object.entries(data));
  else fail(`${file} should hold an object of name: value pairs or an array of values.`);
}
entries.push(...opts.values.map((v) => ["", v]));
if (!entries.length) fail("nothing to match. Pass a JSON file from get_variable_defs, or --values.");

const rows = entries.map(([name, value]) => ({ name, value: String(value), ...classify(name, value) }));
const counts = rows.reduce((acc, r) => ((acc[r.verdict] = (acc[r.verdict] || 0) + 1), acc), {});

if (opts.json) {
  console.log(JSON.stringify({ tokens: tokensPath, theme: opts.theme, mode, width, counts, rows }, null, 2));
} else {
  console.log(`Theme ${opts.theme} (${mode}), fluid sizes at ${width}px, from ${tokensPath}`);
  console.log(Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(", "));
  const order = { none: 0, snap: 1, near: 2, exact: 3 };
  for (const r of [...rows].sort((a, b) => order[a.verdict] - order[b.verdict])) {
    const label = r.name ? `${r.name} = ${r.value}` : r.value;
    console.log(`\n[${r.verdict}] ${label} (${r.kind})`);
    if (r.token) console.log(`  use ${r.token}`);
    if (r.note) console.log(`  ${r.note}`);
  }
}
