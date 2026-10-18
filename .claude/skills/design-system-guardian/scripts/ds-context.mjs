#!/usr/bin/env node
/**
 * Where does this app get obvious from, and what is it held to?
 *
 * Reads an app (read only) and prints, in one place, what the guardian skill
 * needs before any styling work starts:
 *
 *   - how the app takes obvious: a vendored ds/ (and the commit in
 *     ds/.version) or an npm pin (and whether node_modules/obvious exists)
 *   - which theme it imports, that theme's dials (radius base, density,
 *     faces) and whether it has a dark set
 *   - which registry items sit in components/obvious/
 *   - its .ds-audit.json (note, ignores, exceptions)
 *   - the audit budget its own checks enforce (--max N), and whether its
 *     copies of audit-ds.mjs and sync-ds.mjs match the obvious checkout
 *   - the exact commands to run next
 *
 *   node ds-context.mjs <app>                    # obvious = the repo this skill lives in
 *   node ds-context.mjs <app> --obvious <path>   # another checkout
 *   OBVIOUS=<path> node ds-context.mjs <app>
 *
 * Node's own modules only, so it runs anywhere the audit runs.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--obvious");
const app = resolve(positional[0] ?? process.cwd());

/* The skill lives at <obvious>/.claude/skills/<name>/scripts/, so the
   checkout it came from is four levels up. */
const HERE = dirname(fileURLToPath(import.meta.url));
const candidates = [flag("--obvious"), process.env.OBVIOUS, join(HERE, "..", "..", "..", ".."), join(app, "..", "obvious")]
  .filter(Boolean)
  .map((p) => resolve(p));
const isObvious = (p) => {
  try {
    return JSON.parse(readFileSync(join(p, "package.json"), "utf8")).name === "obvious";
  } catch {
    return false;
  }
};
const obvious = candidates.find(isObvious) ?? null;

const read = (p) => {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
};
const readJson = (p) => {
  const s = read(p);
  if (s === null) return null;
  try {
    return JSON.parse(s);
  } catch {
    return { __error: `${relative(app, p)} isn't valid JSON` };
  }
};

if (!existsSync(app)) {
  console.error(`No such folder: ${app}`);
  process.exit(2);
}

const lines = [];
const out = (s = "") => lines.push(s);
const rel = (p) => relative(process.cwd(), p) || ".";

/* ---- how the app takes obvious ------------------------------------- */

const pkg = readJson(join(app, "package.json")) ?? {};
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const npmPin = deps.obvious ?? null;
const dsDir = join(app, "ds");
const hasDs = existsSync(dsDir);
const installed = join(app, "node_modules", "obvious", "dist");
const appIsObvious = pkg.name === "obvious";

let systemDir = null;
out(`App: ${app}`);
if (appIsObvious) {
  systemDir = join(app, "dist");
  out("This is obvious itself. Its own dist/ is the system; build it with npm run build.");
} else if (hasDs) {
  systemDir = dsDir;
  const version = (read(join(dsDir, ".version")) ?? "").trim();
  out(`Takes obvious as a vendored copy in ds/: ${version || "no ds/.version, so the copy can't be checked"}`);
} else if (npmPin) {
  out(`Takes obvious from npm: ${npmPin}`);
  const commit = String(npmPin).match(/([0-9a-f]{40})/)?.[1];
  if (commit) out(`  pinned to commit ${commit.slice(0, 7)}`);
  if (existsSync(installed)) systemDir = installed;
  else out("  node_modules/obvious isn't installed, so token names below come from the obvious checkout instead.");
} else {
  out("Doesn't take obvious: no ds/ folder and no obvious dependency. The rest of this skill doesn't apply until it does.");
}
if (!systemDir && obvious) systemDir = join(obvious, "dist");

/* ---- theme ---------------------------------------------------------- */

const SKIP = new Set(["node_modules", ".git", ".next", "dist", "build", "out", "coverage", ".vercel", "ds", ".claude", ".agents", "site", "fixtures", "__fixtures__"]);
const EXT = new Set([".css", ".scss", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".html"]);
function walk(dir, files = []) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
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
    if (st.isDirectory()) walk(full, files);
    else if (EXT.has(extname(e))) files.push(full);
  }
  return files;
}

const themeHits = new Map();
const referenced = new Map();
for (const file of walk(app)) {
  const src = read(file) ?? "";
  for (const m of src.matchAll(/var\(\s*(--ds-[a-z0-9-]+)/g)) {
    if (!referenced.has(m[1])) referenced.set(m[1], `${relative(app, file)}:${src.slice(0, m.index).split("\n").length}`);
  }
  for (const m of src.matchAll(/(?:ds|obvious(?:\/dist)?)\/css\/(?:themes\/([a-z]+)\.css|all-themes\.css)/g)) {
    const name = m[1] ?? "all-themes";
    if (!themeHits.has(name)) themeHits.set(name, relative(app, file));
  }
  for (const m of src.matchAll(/data-ds-theme=["']?([a-z]+)/g)) {
    const name = `${m[1]} (data-ds-theme)`;
    if (!themeHits.has(name)) themeHits.set(name, relative(app, file));
  }
}

const tokens = systemDir ? readJson(join(systemDir, "js", "tokens.json")) : null;
out("");
if (!themeHits.size) out("Theme: none imported that I can find. Look for a stylesheet link or import of css/themes/<name>.css.");
for (const [name, where] of themeHits) {
  out(`Theme: ${name}, imported in ${where}`);
  const t = tokens?.themes?.[name];
  if (t) {
    out(`  radius base ${t["--ds-radius-base"]}, density ${t["--ds-density"]}`);
    out(`  display face ${t["--ds-font-display"]}`);
    out(`  text face    ${t["--ds-font-sans"]}`);
    out(`  dark set: ${tokens.dark?.[name] ? "yes, under prefers-color-scheme and data-ds-mode" : "no"}`);
  }
}

/* A var() that names a token nobody defines resolves to nothing, silently.
   primitives.json records it happening to every shadow (--ds-shadow-color
   instead of --ds-color-shadow-color). */
if (tokens?.primitives) {
  const known = new Set([
    ...Object.keys(tokens.primitives),
    ...Object.values(tokens.themes ?? {}).flatMap((th) => Object.keys(th)),
    ...Object.values(tokens.dark ?? {}).flatMap((th) => Object.keys(th)),
  ]);
  const unknown = [...referenced].filter(([name]) => !name.endsWith("-") && !known.has(name));
  out("");
  out(`Tokens read with var(): ${referenced.size}. Unknown to obvious: ${unknown.length ? "" : "none"}`);
  for (const [name, where] of unknown.slice(0, 20)) out(`  ${name}  first at ${where}`);
  if (unknown.length > 20) out(`  and ${unknown.length - 20} more`);
  if (unknown.length) out("  Each is a typo, a token that was renamed, or one the app defines itself. Check which before trusting the page.");
}

/* ---- registry ------------------------------------------------------- */

const regDir = join(app, "components", "obvious");
if (existsSync(regDir)) {
  const items = readdirSync(regDir).filter((f) => f.endsWith(".tsx"));
  out("");
  out(`Registry items in components/obvious/: ${items.join(", ") || "none"}`);
  out("  These are overwritten by the next shadcn add. Change them through --ob-* custom properties on :root, never by editing the files.");
}

/* ---- exceptions and budget ------------------------------------------ */

out("");
const cfg = readJson(join(app, ".ds-audit.json"));
if (!cfg) out(".ds-audit.json: none");
else if (cfg.__error) out(`.ds-audit.json: ${cfg.__error}`);
else {
  out(`.ds-audit.json: ${(cfg.ignore ?? []).length} ignored path(s), ${Object.keys(cfg.exceptions ?? {}).length} category exception(s)`);
  if (cfg.ignore?.length) out(`  ignore: ${cfg.ignore.join(", ")}`);
  for (const [k, e] of Object.entries(cfg.exceptions ?? {})) out(`  exception ${k}: ${(e.ignore ?? []).join(", ")}`);
}

const budgetSources = [];
for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
  const m = String(cmd).match(/audit-ds\.mjs[^&|;]*--max\s+(\d+)/);
  if (m) budgetSources.push(`${m[1]} (package.json "${name}")`);
}
const scriptsDir = join(app, "scripts");
if (existsSync(scriptsDir)) {
  for (const f of readdirSync(scriptsDir).filter((f) => /\.(sh|mjs|js)$/.test(f) && f !== "audit-ds.mjs")) {
    const src = read(join(scriptsDir, f)) ?? "";
    for (const m of src.matchAll(/audit-ds\.mjs[^\n&|;]*--max\s+(\d+)/g)) budgetSources.push(`${m[1]} (scripts/${f})`);
  }
}
out(`Audit budget: ${budgetSources.length ? budgetSources.join("; ") : "none found in package.json or scripts/"}`);

/* ---- are the app's copies current? ---------------------------------- */

const same = (a, b) => {
  const x = read(a);
  const y = read(b);
  return x !== null && y !== null && x === y;
};
if (obvious && !appIsObvious) {
  for (const s of ["audit-ds.mjs", "sync-ds.mjs"]) {
    const mine = join(app, "scripts", s);
    if (!existsSync(mine)) out(`scripts/${s}: no copy in the app`);
    else out(`scripts/${s}: ${same(mine, join(obvious, "scripts", s)) ? "same as obvious's" : "DIFFERS from obvious's copy, so its numbers may not match"}`);
  }
}

/* ---- next commands -------------------------------------------------- */

out("");
out("Next:");
if (obvious) {
  out(`  node ${rel(join(obvious, "scripts", "audit-ds.mjs"))} ${rel(app)} --detail`);
  out(`  node ${rel(join(HERE, "ds-nearest.mjs"))} ${rel(app)} <value> [more values]`);
} else {
  out("  No obvious checkout found. Pass --obvious <path> or set OBVIOUS, or use the app's own scripts/audit-ds.mjs.");
}
if (hasDs && !appIsObvious) out(`  (cd ${rel(app)} && node scripts/sync-ds.mjs --check)`);
if (appIsObvious) out("  npm run check");

console.log(lines.join("\n"));
