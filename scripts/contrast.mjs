#!/usr/bin/env node
/**
 * WCAG contrast for every theme, and for every dark set.
 *
 * The build runs this. A pair that fails and isn't in
 * src/contrast-exceptions.json fails the build, and so does an exception
 * that has got worse than the ratio recorded for it. The pairs that already
 * failed when the check went in are recorded there with their measured
 * ratio, so nothing changes colour until Trev decides; docs/contrast.md
 * lists them with the nearest value that would pass.
 *
 *   node scripts/contrast.mjs            # report, exit 1 on a regression
 *   node scripts/contrast.mjs --record   # rewrite the exceptions file from today's values
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXCEPTIONS = join(root, "src", "contrast-exceptions.json");
const DOC = join(root, "docs", "contrast.md");

/* Text needs 4.5:1. Things that aren't text (the accent as a control colour
   and focus ring, status colours as dots and icons) need 3:1. */
export const PAIRS = [
  ...["text", "text-dim", "text-muted"].flatMap((fg) =>
    ["bg", "surface"].map((bg) => ({ fg, bg, min: 4.5, what: "text" })),
  ),
  { fg: "accent", bg: "bg", min: 3, what: "accent and focus ring", adjust: "fg" },
  { fg: "accent-contrast", bg: "accent", min: 4.5, what: "text on the accent", adjust: "bg" },
  ...["success", "warning", "danger", "info"].map((fg) => ({ fg, bg: "bg", min: 3, what: "status colour" })),
];

/* ---- colour maths --------------------------------------------------- */

export function parse(colour) {
  const c = String(colour).trim();
  let m = c.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join("");
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

/** Lays a translucent colour over an opaque one. */
export const over = (top, under) => ({
  r: top.r * top.a + under.r * (1 - top.a),
  g: top.g * top.a + under.g * (1 - top.a),
  b: top.b * top.a + under.b * (1 - top.a),
  a: 1,
});

const channel = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export const luminance = ({ r, g, b }) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const hex = ({ r, g, b }) =>
  "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase();

function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h / 6, s, l };
}

function fromHsl({ h, s, l }) {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255, a: 1 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: f(h + 1 / 3) * 255, g: f(h) * 255, b: f(h - 1 / 3) * 255, a: 1 };
}

/** The nearest colour to `start`, same hue and saturation, that reaches
 *  `min` against `against`. Walks lightness both ways and keeps the
 *  shorter walk. */
export function nearestPassing(start, against, min) {
  const hsl = toHsl(start);
  let best = null;
  for (const dir of [-1, 1]) {
    for (let step = 1; step <= 1000; step++) {
      const l = hsl.l + (dir * step) / 1000;
      if (l < 0 || l > 1) break;
      const candidate = parse(hex(fromHsl({ ...hsl, l })));
      if (ratio(candidate, against) >= min) {
        if (!best || step < best.step) best = { step, colour: hex(candidate), ratio: ratio(candidate, against) };
        break;
      }
    }
  }
  return best;
}

/* ---- themes --------------------------------------------------------- */

export function loadThemes(dir = join(root, "src", "themes")) {
  const sets = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const t = JSON.parse(readFileSync(join(dir, file), "utf8"));
    sets.push({ id: t.name, colours: t.color });
    if (t.dark) sets.push({ id: `${t.name} dark`, colours: { ...t.color, ...t.dark } });
  }
  return sets;
}

const round = (n) => Math.floor(n * 100) / 100;

/** Every pair in every set, measured. */
export function measure(sets) {
  const rows = [];
  for (const { id, colours } of sets) {
    const page = parse(colours.bg);
    const solid = (name, under) => {
      const c = parse(colours[name]);
      if (!c) throw new Error(`${id}: can't read ${name} (${colours[name]})`);
      return c.a < 1 ? over(c, under) : c;
    };
    for (const pair of PAIRS) {
      const bg = solid(pair.bg, page);
      const fg = solid(pair.fg, bg);
      const r = ratio(fg, bg);
      const row = { set: id, pair: `${pair.fg} on ${pair.bg}`, fg: pair.fg, bg: pair.bg, what: pair.what, min: pair.min, ratio: round(r), passes: r >= pair.min };
      if (!row.passes) {
        if (pair.adjust === "bg") {
          const s = nearestPassing(bg, fg, pair.min);
          row.suggest = s && { change: pair.bg, from: colours[pair.bg], to: s.colour, ratio: round(s.ratio) };
        } else {
          const s = nearestPassing(fg, bg, pair.min);
          row.suggest = s && { change: pair.fg, from: colours[pair.fg], to: s.colour, ratio: round(s.ratio) };
        }
      }
      rows.push(row);
    }
  }
  return rows;
}

/** Compares today's failures with the recorded ones. */
export function compare(rows, exceptions) {
  const regressions = [];
  const better = [];
  for (const row of rows) {
    const recorded = exceptions[row.set]?.[row.pair];
    if (row.passes) {
      if (recorded !== undefined) better.push(`${row.set}: ${row.pair} passes now (${row.ratio}:1), so it can come out of the exceptions file`);
      continue;
    }
    if (recorded === undefined) regressions.push(`${row.set}: ${row.pair} is ${row.ratio}:1, needs ${row.min}:1`);
    else if (row.ratio < recorded) regressions.push(`${row.set}: ${row.pair} has dropped from ${recorded}:1 to ${row.ratio}:1`);
  }
  return { regressions, better };
}

export function record(rows) {
  const out = { $comment: "Pairs that failed WCAG contrast when the check went in, with the ratio measured then. The build fails if one gets worse or a new one appears. See docs/contrast.md. Rewrite with node scripts/contrast.mjs --record." };
  for (const row of rows.filter((r) => !r.passes)) (out[row.set] ??= {})[row.pair] = row.ratio;
  return out;
}

export function markdown(rows) {
  const failing = rows.filter((r) => !r.passes);
  const lines = [
    "# Contrast",
    "",
    "Generated by `scripts/contrast.mjs` on every build, so don't edit it by hand.",
    "",
    "These pairs fail WCAG AA. Text needs 4.5:1. The accent, which is also the focus ring, and the status colours need 3:1 against the page, because they're used for controls, dots and icons.",
    "",
    "I haven't changed any colours. Each row has the nearest colour with the same hue that would pass. The build fails if any of these gets worse or a new one appears.",
    "",
    `${failing.length} of ${rows.length} pairs fail.`,
    "",
    "| Theme | Pair | Now | Needs | Change | To | Then |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const r of failing) {
    const s = r.suggest;
    lines.push(
      `| ${r.set} | ${r.pair} | ${r.ratio.toFixed(2)} | ${r.min} | ${s ? `${s.change} \`${s.from}\`` : "n/a"} | ${s ? `\`${s.to}\`` : "none found"} | ${s ? s.ratio.toFixed(2) : ""} |`,
    );
  }
  lines.push(
    "",
    "Changing one colour can move another pair. The accent, for instance, sits under the accent-contrast text and on the page, so check the whole row for a theme before taking a suggestion.",
    "",
  );
  return lines.join("\n");
}

/** What the build calls. Returns the problems; writes docs/contrast.md. */
export function check({ write = true } = {}) {
  const rows = measure(loadThemes());
  const exceptions = JSON.parse(readFileSync(EXCEPTIONS, "utf8"));
  const result = compare(rows, exceptions);
  if (write) {
    mkdirSync(dirname(DOC), { recursive: true });
    writeFileSync(DOC, markdown(rows));
  }
  return { rows, ...result };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes("--record")) {
    const rows = measure(loadThemes());
    writeFileSync(EXCEPTIONS, JSON.stringify(record(rows), null, 2) + "\n");
    mkdirSync(dirname(DOC), { recursive: true });
    writeFileSync(DOC, markdown(rows));
    console.log(`Recorded ${rows.filter((r) => !r.passes).length} failing pairs.`);
  } else {
    const { rows, regressions, better } = check();
    for (const b of better) console.log(b);
    if (regressions.length) {
      console.error("Contrast has got worse:\n  " + regressions.join("\n  "));
      process.exitCode = 1;
    } else {
      console.log(`contrast: ${rows.filter((r) => r.passes).length}/${rows.length} pairs pass, no new failures.`);
    }
  }
}
