#!/usr/bin/env node
/**
 * Assembles docs/index.html from dist/ and src/themes/.
 *
 * The page inlines the generated stylesheets verbatim rather than restating
 * them, which is the only way a reference page can be trusted: it cannot
 * describe a version of the system that does not exist, and a token that
 * changes in src/ changes on the page the next time this runs.
 *
 *   npm run docs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");

/** Strips the generated banner; the page has its own, once, at the top. */
const bare = (css) => css.replace(/^\/\*[\s\S]*?\*\/\n+/, "");

/* The apps each theme is for. Not in the theme JSON because a theme is a set
   of values, not a deployment — but on a reference page the reader wants to
   know which site they are looking at. */
const APPS = {
  core: "designedbytrev",
  condimental: "condiment-gallery",
  dissonance: "time-dissonance",
  routine: "daily-routine",
  parchment: "brookwood-hunt",
};

/* next/font hands the real apps these variables. The docs page declares them
   against the matching Google Fonts family, so the specimen shows the face an
   app actually ships rather than a silent fallback. */
const FONT_VARS = {
  "var(--font-fell)": "IM Fell English",
  "var(--font-instrument)": "Instrument Serif",
  "var(--font-plex-mono)": "IBM Plex Mono",
  "var(--font-caveat)": "Caveat",
  "var(--font-geist-sans)": "Geist",
  "var(--font-geist-mono)": "Geist Mono",
};

/** The human name at the head of a font stack, for the dials panel. */
function familyName(stack) {
  const first = stack.split(",")[0].trim();
  return FONT_VARS[first] ?? first.replace(/^['"]|['"]$/g, "");
}

const pkg = JSON.parse(read("package.json"));

const themes = readdirSync(join(root, "src", "themes"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(read("src", "themes", f)))
  .map((t) => ({
    name: t.name,
    label: t.label ?? t.name,
    description: t.description,
    family: t.family !== false,
    app: APPS[t.name] ?? "",
    dial: t.dial,
    color: t.color,
    fontName: Object.fromEntries(Object.entries(t.font).map(([k, v]) => [k, familyName(v)])),
  }))
  /* Reference theme first, then the rest of the family, then whoever sits
     outside it — which is the order the page explains them in. */
  .sort((a, b) => {
    if (a.name === "core") return -1;
    if (b.name === "core") return 1;
    if (a.family !== b.family) return a.family ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

const html = read("docs", "template.html")
  .replace("{{CSS_PRIMITIVES}}", bare(read("dist", "css", "primitives.css")))
  .replace("{{CSS_THEMES}}", bare(read("dist", "css", "all-themes.css")))
  .replace("{{CSS_BASE}}", bare(read("dist", "css", "base.css")))
  .replace("{{CSS_COMPONENTS}}", bare(read("dist", "css", "components.css")))
  /* The behaviours module inlined into the page's own module scope. The
     export keywords go; nothing is importing this copy. */
  .replace("{{JS_BEHAVIOURS}}", read("dist", "js", "behaviours.js").replace(/^export /gm, ""))
  .replace("{{THEME_DATA}}", JSON.stringify(themes, null, 2))
  .replaceAll("{{VERSION}}", pkg.version);

writeFileSync(join(root, "docs", "index.html"), html);
console.log(`docs/index.html: ${(html.length / 1024).toFixed(0)} KB, ${themes.length} themes`);
