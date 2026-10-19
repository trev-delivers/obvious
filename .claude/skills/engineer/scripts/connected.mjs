#!/usr/bin/env node
/**
 * Is this repo still connected to obvious, or has it started keeping its own
 * copies of things? Read only: it reports and never writes.
 *
 *   node connected.mjs <repo>                    against the obvious this script sits in
 *   node connected.mjs <repo> --obvious ../obvious
 *   node connected.mjs <repo> --json
 *
 * Exits 1 if anything fails, so it can sit in a check script. A check that
 * can't run (no obvious checkout to compare with) says SKIP, never ok.
 *
 * What it looks for:
 *   - ds/ the same as obvious's dist/, and the copied scripts the same as
 *     obvious's scripts/
 *   - the shared skills the same as obvious's
 *   - the repo's check script running ds:check, skills:check and the audit,
 *     and CI running the check script
 *   - functions in the repo's own code with the same name as one of
 *     obvious's behaviours: a private copy that will never get fixes
 *   - code taken from somewhere else (transitions.dev, "adapted from")
 *   - obvious's old t- class names, and the empty transitions bridge
 *   - runtime dependencies, listed so they're seen
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const repo = resolve(args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--obvious") ?? ".");
const JSON_OUT = args.includes("--json");

/* This script lives at <repo>/.claude/skills/engineer/scripts/. When that
   repo is obvious itself, it's the master copy to compare against. */
const here = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const isObvious = (dir) => dir && existsSync(join(dir, "src", "primitives.json")) && existsSync(join(dir, "dist"));
const obvious = [flag("--obvious"), process.env.OBVIOUS, here, join(repo, "..", "obvious")]
  .filter(Boolean)
  .map((d) => resolve(d))
  .find(isObvious);

const results = [];
const add = (status, area, what, detail = []) => results.push({ status, area, what, detail });

const read = (p) => readFileSync(p);
function files(dir, base = dir, out = new Map()) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files(full, base, out);
    else out.set(relative(base, full), read(full));
  }
  return out;
}
function differences(from, to) {
  const a = files(from);
  const b = files(to);
  const out = [];
  for (const [p, body] of a) {
    if (!b.has(p)) out.push(`missing ${p}`);
    else if (!b.get(p).equals(body)) out.push(`changed ${p}`);
  }
  for (const p of b.keys()) if (!a.has(p)) out.push(`extra ${p}`);
  return out;
}

const self = isObvious(repo);
const pkg = existsSync(join(repo, "package.json")) ? JSON.parse(readFileSync(join(repo, "package.json"), "utf8")) : null;
const usesObvious = self || existsSync(join(repo, "ds")) || Boolean(pkg?.dependencies?.obvious || pkg?.devDependencies?.obvious);

/* ---- the synced copies -------------------------------------------------- */

if (self) {
  add("ok", "copies", "This is obvious, the master copy");
} else if (!usesObvious) {
  add("info", "copies", "Doesn't use obvious (no ds/, no obvious dependency)");
} else if (!obvious) {
  add("SKIP", "copies", "No obvious checkout to compare with. Pass --obvious <path> or set OBVIOUS");
} else {
  if (existsSync(join(repo, "ds"))) {
    const diff = differences(join(obvious, "dist"), join(repo, "ds")).filter((d) => !/\.version$|^extra \.version/.test(d));
    add(diff.length ? "FAIL" : "ok", "copies", diff.length ? "ds/ differs from obvious's dist/. Run node scripts/sync-ds.mjs" : "ds/ matches obvious", diff.slice(0, 12));
  }
  for (const script of ["audit-ds.mjs", "sync-ds.mjs", "sync-skills.mjs"]) {
    const mine = join(repo, "scripts", script);
    if (!existsSync(mine)) {
      add(script === "sync-skills.mjs" || script === "sync-ds.mjs" ? "FAIL" : "info", "copies", `No scripts/${script}. Copy it from obvious`);
    } else if (!read(mine).equals(read(join(obvious, "scripts", script)))) {
      add("FAIL", "copies", `scripts/${script} differs from obvious's. Copy it over again`);
    } else add("ok", "copies", `scripts/${script} matches obvious`);
  }
  const src = readFileSync(join(obvious, "scripts", "sync-skills.mjs"), "utf8");
  const names = [...(src.match(/SKILLS = \[([\s\S]*?)\]/)?.[1] ?? "").matchAll(/"([\w-]+)"/g)].map((m) => m[1]);
  const stale = [];
  for (const name of names) {
    const diff = differences(join(obvious, ".claude", "skills", name), join(repo, ".claude", "skills", name));
    if (diff.length) stale.push(`${name}: ${diff.length === 1 ? diff[0] : `${diff.length} files differ`}`);
  }
  add(stale.length ? "FAIL" : "ok", "copies", stale.length ? "Shared skills are out of date. Run node scripts/sync-skills.mjs" : `All ${names.length} shared skills match obvious`, stale);
}

/* ---- wired into the checks ------------------------------------------------ */

if (pkg && usesObvious && !self) {
  const scripts = pkg.scripts ?? {};
  const all = Object.values(scripts).join(" ");
  const check = scripts.check ?? "";
  const runs = (name, re) => re.test(all) && (re.test(check) || check.includes(name));
  const missing = [];
  if (existsSync(join(repo, "ds")) && !runs("ds:check", /sync-ds\.mjs --check/)) missing.push("the ds/ check (sync-ds.mjs --check)");
  if (!runs("skills:check", /sync-skills\.mjs --check/)) missing.push("the skills check (sync-skills.mjs --check)");
  if (!runs("ds:audit", /audit-ds\.mjs[^&|]*--max/)) missing.push("the audit with a --max budget (audit-ds.mjs --max N)");
  add(missing.length ? "FAIL" : "ok", "checks", missing.length ? "npm run check doesn't run everything that keeps it connected" : "npm run check runs the ds/, skills and audit checks", missing.map((m) => `missing ${m}`));
}
if (pkg) {
  const wf = join(repo, ".github", "workflows");
  const ci = existsSync(wf) ? readdirSync(wf).map((f) => readFileSync(join(wf, f), "utf8")).join("\n") : "";
  add(/npm run check/.test(ci) ? "ok" : "FAIL", "checks", /npm run check/.test(ci) ? "CI runs npm run check" : "No CI workflow runs npm run check");
}

/* ---- the repo's own code -------------------------------------------------- */

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "out", "coverage", ".vercel", "ds", ".claude", ".agents", "vendor", "site", "test", "tests", "fixtures", "registry-smoke"]);
const CODE = new Set([".css", ".scss", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".html", ".astro", ".svelte", ".vue"]);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walk(full, out); }
    else if (CODE.has(extname(name)) && st.size < 600_000 && !/\.min\./.test(name)) out.push(full);
  }
  return out;
}
const sources = walk(repo).map((f) => ({ rel: relative(repo, f), lines: readFileSync(f, "utf8").split("\n") }));
const grep = (re, { skip = () => false } = {}) => {
  const out = [];
  for (const { rel, lines } of sources) {
    if (skip(rel)) continue;
    lines.forEach((l, i) => { if (re.test(l)) out.push(`${rel}:${i + 1}  ${l.trim().slice(0, 110)}`); });
  }
  return out;
};

if (obvious && !self) {
  const behaviours = readFileSync(join(obvious, "src", "js", "behaviours.js"), "utf8");
  const exported = [...behaviours.matchAll(/^export function (\w+)/gm)].map((m) => m[1]).filter((n) => n !== "shuffle");
  const re = new RegExp(`(?:function\\s+|(?:const|let|var)\\s+)(${exported.join("|")})\\b\\s*(?:=|\\()`);
  const copies = grep(re);
  add(copies.length ? "FAIL" : "ok", "own code", copies.length ? "Private copies of obvious's behaviours. Import them from ds/js/behaviours.js instead" : "No private copies of obvious's behaviours", copies);
}

/* Only in comments, where people say where code came from. Page copy says
   "taken from" for other reasons. */
const COMMENT = /^\s*(\/\/|\/\*|\*|<!--|#)/;
const borrowed = grep(/transitions[.-]dev|adapted from|copied from|lifted from|borrowed from|based on .*https?:|codepen\.io|stackoverflow\.com\/(a|questions)\//i, { skip: (rel) => self && /transitions-bridge\.css$/.test(rel) })
  .filter((hit) => COMMENT.test(hit.split("  ").slice(1).join("  ")) || /transitions[.-]dev/i.test(hit));
add(borrowed.length ? "FAIL" : "ok", "own code", borrowed.length ? "Code that says it came from somewhere else. Rewrite it as our own" : "Nothing marked as taken from elsewhere", borrowed);

const OLD = /(?<![\w-])t-(input|input-wrap|error-msg|pro-btn|check-badge|check-blur-wrap|boot-ring|think|think-text|think-sizer|chip|link|gradient-text|reveal|stagger|stagger-line|badge|badge-dot|tt|tt-wrap|tt-trigger|word)(?![\w-])/;
const old = grep(OLD);
add(old.length ? "FAIL" : "ok", "own code", old.length ? "obvious's old t- class names. The obvious README maps them to the ob- ones" : "No old t- class names", old);

const bridge = grep(/transitions-bridge\.css/, { skip: () => self });
add(bridge.length ? "FAIL" : "ok", "own code", bridge.length ? "Imports the empty transitions bridge. Remove the import and the transitions.dev CSS" : "No transitions bridge import", bridge);

if (pkg) {
  const deps = Object.keys(pkg.dependencies ?? {});
  const banned = deps.filter((d) => /transitions/i.test(d));
  if (banned.length) add("FAIL", "dependencies", "Depends on transitions.dev", banned);
  add("info", "dependencies", deps.length ? `Runtime dependencies: ${deps.join(", ")}` : "No runtime dependencies");
}

/* ---- report --------------------------------------------------------------- */

const failed = results.filter((r) => r.status === "FAIL").length;
if (JSON_OUT) {
  console.log(JSON.stringify({ repo, obvious: obvious ?? null, failed, results }, null, 2));
} else {
  console.log(`${relative(process.cwd(), repo) || "."}: connected to obvious${obvious && !self ? ` (${relative(process.cwd(), obvious) || "."})` : ""}\n`);
  for (const r of results) {
    console.log(`${r.status.padEnd(5)} ${r.what}`);
    for (const d of r.detail.slice(0, 10)) console.log(`        ${d}`);
    if (r.detail.length > 10) console.log(`        and ${r.detail.length - 10} more`);
  }
  console.log(failed ? `\n${failed} to fix.` : "\nAll connected.");
}
process.exitCode = failed ? 1 : 0;
