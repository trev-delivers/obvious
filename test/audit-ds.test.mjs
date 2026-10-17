import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { audit, totalBypass } from "../scripts/audit-ds.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => join(here, "fixtures", "audit", name);
const script = join(here, "..", "scripts", "audit-ds.mjs");
const where = (r, key) => r.bypass[key].map((f) => `${f.file}:${f.line}`);

test("skips vendored .claude and .agents folders", () => {
  const r = audit(fixture("skip"));
  assert.equal(r.files, 1);
  assert.equal(totalBypass(r), 0);
});

test("flags monospace in every form", () => {
  const r = audit(fixture("rules"));
  assert.deepEqual(where(r, "mono"), [
    "src/Label.tsx:8", // font-mono
    "src/styles.css:1", // var(--mono)
    "src/styles.css:2", // a mono stack, counted once for the line
    "src/styles.css:3", // --ds-font-mono
  ]);
});

test("flags eyebrows in CSS, style objects and Tailwind, and leaves acronyms alone", () => {
  const r = audit(fixture("rules"));
  assert.deepEqual(where(r, "eyebrow"), [
    "src/Label.tsx:5", // uppercase tracking-wide
    "src/Label.tsx:6", // cn("uppercase", "tracking-widest")
    "src/Label.tsx:10", // textTransform + letterSpacing
    "src/styles.css:4",
  ]);
});

test("flags gradient text once per line", () => {
  const r = audit(fixture("rules"));
  assert.deepEqual(where(r, "gradient-text"), ["src/Label.tsx:8", "src/styles.css:7"]);
});

test("flags literal px radii but not 0, percentages or token fallbacks", () => {
  const r = audit(fixture("rules"));
  assert.deepEqual(where(r, "radius"), [
    "src/Label.tsx:8", // rounded-[6px]
    "src/Label.tsx:9", // borderRadius: 8
    "src/styles.css:8",
    "src/styles.css:9",
  ]);
});

test("flags px font sizes, including the font shorthand, but not tokens or unit conversions", () => {
  const r = audit(fixture("rules"));
  assert.deepEqual(where(r, "font-size"), [
    "src/Label.tsx:8", // text-[10px]
    "src/Label.tsx:9", // fontSize: 14
    "src/styles.css:13",
    "src/styles.css:14",
  ]);
});

test("reads an npm consumer's theme and components from node_modules", () => {
  const r = audit(fixture("npm-app"));
  assert.deepEqual(r.themes, ["core"]);
  assert.equal(r.catalogue, 2);
  assert.deepEqual(r.components, ["link"]);
  assert.match(r.version, /^npm /);
});

test("flags fonts the theme doesn't name, and allows the ones it does", () => {
  const r = audit(fixture("npm-app"));
  const loads = r.bypass["font-loading"].map((f) => f.text);
  assert.equal(loads.length, 3);
  assert.ok(loads.some((t) => t.includes("Comic Neue")));
  assert.ok(loads.some((t) => t.includes("Lobster")));
  /* Inter is flagged; Caveat alone would pass, because the theme reads it
     through --font-hand. */
  assert.ok(loads.some((t) => t.includes("Inter")));
  assert.ok(!loads.some((t) => t.includes("Bricolage")));
});

test("an exception with a note excuses one category in its paths", () => {
  const r = audit(fixture("exceptions"));
  assert.equal(r.excused["gradient-text"].count, 1);
  assert.deepEqual(where(r, "gradient-text"), ["src/other.css:1"]);
  /* Only gradient text is excused in hero.css; its colour still counts. */
  assert.deepEqual(where(r, "colour"), ["src/hero.css:1"]);
});

test("an exception without a note doesn't count, and says so", () => {
  const r = audit(fixture("exceptions"));
  assert.deepEqual(where(r, "radius"), ["src/card.css:1"]);
  assert.ok(r.problems.some((p) => p.startsWith("exceptions.radius")));
  assert.ok(r.problems.some((p) => p.startsWith("exceptions.sparkle")));
});

test("the top-level ignore still excuses every category", () => {
  const r = audit(fixture("exceptions"));
  assert.ok(!Object.values(r.bypass).flat().some((f) => f.file.startsWith("vendor")));
});

test("counts registry items and ob-* classes, and leaves the copied registry files out of bypass", () => {
  const r = audit(fixture("registry-app"));
  assert.equal(r.registryCatalogue, 2);
  assert.deepEqual(r.registry, ["sheet"]);
  assert.equal(r.obClasses, 1);
  assert.equal(totalBypass(r), 0);
});

test("names the app after its folder when given a relative path", () => {
  const out = execFileSync(process.execPath, [script, "--json"], { cwd: fixture("skip") }).toString();
  assert.equal(JSON.parse(out)[0].app, "skip");
});

/* The old argument parsing treated the number after --max as an app path,
   and the first path as the number when there was no --max. */
test("--max reads its number and still audits the path given", () => {
  const under = spawnSync(process.execPath, [script, "--max", "100", fixture("rules")]);
  assert.equal(under.status, 0, under.stderr.toString());
  assert.match(under.stdout.toString(), /^rules\s/m);
  assert.doesNotMatch(under.stdout.toString(), /^100\s/m);

  const over = spawnSync(process.execPath, [script, fixture("rules"), "--max", "1"]);
  assert.equal(over.status, 1);
  assert.match(over.stderr.toString(), /Over budget/);
});
