#!/usr/bin/env node
/**
 * Builds the obvious website into site/ from src/ and dist/.
 *
 * Pages link the real stylesheets from dist/, copied to site/assets/, so the
 * site is painted by the same files an app imports. Token tables and theme
 * pages are generated from the JSON in src/, so they change when it does.
 *
 *   npm run site          build
 *   npm run site:serve    build, then serve on http://localhost:4321
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pages } from "./pages.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "site");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const json = (...p) => JSON.parse(read(...p));

/* The apps each theme is for. Not in the theme JSON because a theme is a set
   of values rather than a deployment, but a reader wants to know which site
   they're looking at. */
const APPS = {
  core: "Reference",
  condimental: "Condiment Gallery",
  dissonance: "Time Dissonance",
  routine: "Ritual",
  parchment: "Brookwood Hunt",
  morris: "Household app",
  specimen: "Eye for Type",
};

/* next/font hands the real apps these variables. The site declares them
   against the matching Google Fonts family so the specimen shows the face an
   app ships. */
const FONT_VARS = {
  "var(--font-fell)": "IM Fell English",
  "var(--font-instrument)": "Instrument Sans",
  "var(--font-caveat)": "Caveat",
};

/* One request for every theme's pair. Google's CSS only declares the faces,
   so a browser downloads just the ones a page uses. */
const GOOGLE_FONTS =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IM+Fell+English&family=Instrument+Sans:wght@400;500;600&family=Caveat:wght@500&family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Hanken+Grotesk:wght@400;500;600&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Libre+Franklin:wght@400;500;600&family=Young+Serif&family=Figtree:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Source+Sans+3:wght@400;500;600&display=swap";

/* System stacks open with keywords like ui-rounded. The first quoted name is
   the face people will recognise. */
const familyName = (stack) => {
  const parts = stack.split(",").map((s) => s.trim());
  const first = parts[0].startsWith("ui-") || parts[0].startsWith("-apple") ? parts.find((s) => /^['"]/.test(s)) ?? parts[0] : parts[0];
  return FONT_VARS[first] ?? first.replace(/^['"]|['"]$/g, "");
};

const strip = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => k !== "$comment"));

const pkg = json("package.json");
const primitives = json("src", "primitives.json");
const registry = json("registry.json");

const themes = readdirSync(join(root, "src", "themes"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => json("src", "themes", f))
  .map((t) => ({
    name: t.name,
    label: t.label ?? t.name[0].toUpperCase() + t.name.slice(1),
    description: t.description,
    family: t.family !== false,
    app: APPS[t.name] ?? "",
    dial: strip(t.dial),
    font: strip(t.font),
    fontName: Object.fromEntries(Object.entries(strip(t.font)).map(([k, v]) => [k, familyName(v)])),
    color: strip(t.color),
    dark: t.dark ? strip(t.dark) : null,
    icon: existsSync(join(root, "icons", `${t.name}.svg`)) ? read("icons", `${t.name}.svg`) : "",
  }))
  /* Reference first, then the family, then whoever sits outside it. */
  .sort((a, b) => {
    if (a.name === "core") return -1;
    if (b.name === "core") return 1;
    if (a.family !== b.family) return a.family ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

/** The knobs a component exposes: the custom properties set on its root rule. */
function knobs(file) {
  const css = read("src", "components", `${file}.css`).replace(/\/\*[\s\S]*?\*\//g, "");
  const found = [];
  for (const m of css.matchAll(/(?:^|[{;\s])(--[a-z][\w-]*)\s*:\s*([^;{}]+)[;}]/g)) {
    if (m[1].startsWith("--ds-") || ["--x", "--y", "--i"].includes(m[1])) continue;
    if (!found.some(([k]) => k === m[1])) found.push([m[1], m[2].trim()]);
  }
  return found;
}

const data = { pkg, primitives, registry, themes, knobs, read };

/* ---- layout --------------------------------------------------------- */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function nav(current) {
  const groups = [];
  for (const p of pages(data)) {
    if (!p.nav) continue;
    let g = groups.find((x) => x.name === p.group);
    if (!g) groups.push((g = { name: p.group, items: [] }));
    g.items.push(p);
  }
  return groups
    .map(
      (g) =>
        `<div class="nav-group">` +
        (g.name ? `<p class="nav-head">${esc(g.name)}</p>` : "") +
        `<ul>` +
        g.items
          .map(
            (p) =>
              `<li><a href="${p.path}"${p.path === current ? ' aria-current="page"' : ""}>${esc(p.nav)}</a></li>`,
          )
          .join("") +
        `</ul></div>`,
    )
    .join("");
}

const themeOptions = themes
  .map((t) => `<option value="${t.name}">${esc(t.label)}${t.family ? "" : " (outside the family)"}</option>`)
  .join("");

/* Runs before first paint, so a stored theme never flashes core first. */
const boot = `
(function(){
  var d=document.documentElement, dark=${JSON.stringify(themes.filter((t) => t.dark).map((t) => t.name))};
  var names=${JSON.stringify(themes.map((t) => t.name))};
  try{var t=localStorage.getItem("obvious-theme"); if(t&&names.indexOf(t)>-1) d.setAttribute("data-ds-theme",t);}catch(e){}
  var m=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)");
  window.__obMode=function(){ if(dark.indexOf(d.getAttribute("data-ds-theme"))>-1&&m&&m.matches) d.setAttribute("data-ds-mode","dark"); else d.removeAttribute("data-ds-mode"); };
  __obMode(); if(m&&m.addEventListener) m.addEventListener("change",__obMode);
})();`.trim();

function layout(page) {
  const title = page.path === "/" ? "Obvious" : `${page.title} | Obvious`;
  return `<!doctype html>
<html lang="en-GB" data-ds-theme="core">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.description ?? "The design system behind Trev's apps: tokens, themes and a shared interaction layer.")}">
<link rel="icon" href="/icons/core.svg" type="image/svg+xml">
<script>${boot}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${GOOGLE_FONTS}">
<link rel="stylesheet" href="/assets/obvious/css/primitives.css">
<link rel="stylesheet" href="/assets/obvious/css/all-themes.css">
<link rel="stylesheet" href="/assets/obvious/css/base.css">
<link rel="stylesheet" href="/assets/obvious/css/components.css">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<a class="skip" href="#content">Skip to content</a>
<header class="bar">
  <a class="wordmark" href="/">obvious</a>
  <span class="version">v${esc(pkg.version)}</span>
  <div class="bar-end">
    <label class="theme-pick">
      <span class="theme-pick-label">Theme</span>
      <select id="theme-select" aria-label="Theme for this site">${themeOptions}</select>
    </label>
    <button class="menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="nav">Menu</button>
  </div>
</header>
<div class="shell">
  <nav class="nav" id="nav" aria-label="Site">${nav(page.path)}</nav>
  <main id="content" class="content">
${page.body}
  </main>
</div>
<footer class="foot">
  <p>Built from <code>src/</code> and <code>dist/</code> at v${esc(pkg.version)}, so it shows what's in there right now.</p>
</footer>
<script type="module" src="/assets/site.js"></script>
</body>
</html>
`;
}

/* ---- write ---------------------------------------------------------- */

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "assets"), { recursive: true });

cpSync(join(root, "dist", "css"), join(out, "assets", "obvious", "css"), { recursive: true });
cpSync(join(root, "dist", "js"), join(out, "assets", "obvious", "js"), { recursive: true });
cpSync(join(root, "dist", "r"), join(out, "r"), { recursive: true });
cpSync(join(root, "icons"), join(out, "icons"), { recursive: true });
cpSync(join(root, "web", "img"), join(out, "img"), { recursive: true });

/* site.js imports the behaviours module by URL, so the copy in assets is the
   one that runs. The theme list rides along for the switcher. */
writeFileSync(
  join(out, "assets", "site.js"),
  `const THEMES = ${JSON.stringify(themes.map(({ name, label, family, app }) => ({ name, label, family, app })))};\n` +
    read("web", "site.js"),
);

/* parchment's faces arrive through next/font variables in the real app. */
writeFileSync(
  join(out, "assets", "site.css"),
  `:root{${Object.entries(FONT_VARS)
    .map(([v, f]) => `${v.slice(4, -1)}:'${f}'`)
    .join(";")}}\n` + read("web", "site.css"),
);

let count = 0;
for (const page of pages(data)) {
  const file = page.path === "/" ? "index.html" : `${page.path.slice(1)}.html`;
  mkdirSync(dirname(join(out, file)), { recursive: true });
  writeFileSync(join(out, file), layout(page));
  count++;
}

console.log(`site/: ${count} pages, ${themes.length} themes`);
