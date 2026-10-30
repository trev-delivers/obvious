/* The effects registry item: the seal is pure and the same everywhere, the
   item's files exist and build, and the CSS keeps to the rules that still
   apply to effects (see "Effects" in CLAUDE.md). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { seal, waveField, maskSvg, fnv, sin, cos } from "../registry/obvious/fx.ts";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const css = read("registry/obvious/effects.css").replace(/\/\*[\s\S]*?\*\//g, "");
const tsx = read("registry/obvious/effects.tsx");
const fx = read("registry/obvious/fx.ts");

test("the same seed draws the same seal, and another seed doesn't", () => {
  assert.deepEqual(seal("alex morgan|2026-11-02"), seal("alex morgan|2026-11-02"));
  assert.notDeepEqual(seal("alex morgan").rings, seal("sam taylor").rings);
  assert.equal(waveField("alex"), waveField("alex"));
  assert.notEqual(waveField("alex"), waveField("sam"));
});

/* Pinned, so a change to the drawing is a decision rather than an accident:
   every guest's seal would change with it. */
test("the seal hasn't changed shape", () => {
  const s = seal("alex morgan|2026-11-02");
  assert.equal(fnv(s.rings.join("|") + s.border), 201364735);
  assert.equal(s.viewBox, "-170 -170 340 340");
  assert.equal(fnv(waveField("alex morgan")), 2198478601);
});

test("the seal draws with its own sine, so Node and Safari agree", () => {
  const body = fx.slice(fx.indexOf("export function seal"), fx.indexOf("/* ---------- the phone's tilt"));
  assert.doesNotMatch(body, /Math\.(sin|cos|tan|atan|exp|log|pow|hypot)\b/);
  for (let x = -40; x < 40; x += 0.0173) {
    assert.ok(Math.abs(sin(x) - Math.sin(x)) < 1e-8, `sin(${x})`);
    assert.ok(Math.abs(cos(x) - Math.cos(x)) < 1e-8, `cos(${x})`);
  }
});

test("seal options do what they say", () => {
  assert.equal(seal("x", { rings: 5 }).rings.length, 5);
  assert.equal(seal("x", { rings: 40 }).rings.length, 12);
  assert.equal(seal("x", { rings: 0 }).rings.length, 1);
  assert.equal(seal("x", { border: false }).border, "");
  assert.ok(seal("x", { points: 60 }).rings[0].length < seal("x").rings[0].length);
  assert.match(maskSvg("0 0 10 10", ["M0,0L10,10"], 2), /^<svg[^>]*viewBox="0 0 10 10"><path d="M0,0L10,10" fill="none" stroke="black" stroke-width="2"\/><\/svg>$/);
});

test("the effects item is in the registry, and its files exist and build", () => {
  const item = JSON.parse(read("registry.json")).items.find((i) => i.name === "effects");
  assert.ok(item, "no effects item");
  for (const f of item.files) assert.ok(existsSync(new URL(f.path, root)), f.path);
  assert.deepEqual(item.files.map((f) => f.target), ["components/obvious/effects.tsx", "components/obvious/fx.ts", "components/obvious/effects.css"]);
  execFileSync(process.execPath, [new URL("scripts/build-registry.mjs", root).pathname], { stdio: "pipe" });
  const built = JSON.parse(read("dist/r/effects.json"));
  for (const f of built.files) assert.equal(f.content, read(f.path), f.path);
});

test("it needs nothing beyond React", () => {
  const imports = (src) => [...src.matchAll(/(?:^|\n)\s*(?:import|export)[^;]*?from\s+["']([^"']+)["']|(?:^|\n)import\s+["']([^"']+)["']/g)].map((m) => m[1] ?? m[2]);
  assert.deepEqual([...new Set(imports(tsx))].sort(), ["./effects.css", "./fx", "react"]);
  assert.deepEqual(imports(fx), []);
  assert.match(tsx, /^"use client";/);
});

test("every piece is exported", () => {
  for (const name of ["HoloSurface", "useGyroPermission", "Holo", "Guilloche", "EncryptedText", "GlowText", "BorderLight", "GlowCursor"])
    assert.match(tsx, new RegExp(`export function ${name}\\b`), name);
  assert.match(tsx, /export \{ seal, waveField/);
});

test("EncryptedText never touches the DOM itself", () => {
  const body = tsx.slice(tsx.indexOf("export function EncryptedText"), tsx.indexOf("/* ---------- GlowText"));
  assert.doesNotMatch(body, /setAttribute|textContent|innerHTML|\.current/);
});

test("colours are fixed only on :root, and everything else comes from tokens", () => {
  const rootBlock = css.match(/:where\(:root\)\s*\{[^}]*\}/)[0];
  const rest = css.replace(rootBlock, "");
  assert.doesNotMatch(rest, /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i);
  assert.doesNotMatch(tsx + fx, /#[0-9a-f]{6}\b|\b(?:rgba?|hsla?)\(/i);
  const declared = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const runtime = new Set(["--fx-x", "--fx-y", "--fx-m", "--fx-a", "--fx-rx", "--fx-ry", "--fx-ro", "--fx-mask", "--fx-depth", "--fx-spin", "--fx-holo-strength", "--fx-holo-base", "--fx-tilt", "--fx-perspective", "--fx-radius"]);
  const strays = [];
  for (const m of css.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
    const [, name, fallback] = m;
    if (name.startsWith("--ds-") || declared.has(name) || runtime.has(name) || fallback) continue;
    strays.push(name);
  }
  assert.deepEqual(strays, []);
});

test("the rules effects don't bend still hold", () => {
  assert.doesNotMatch(css, /monospace|--ds-font-mono|letter-spacing|text-transform|background-clip\s*:\s*text/);
  assert.doesNotMatch(css, /cubic-bezier\(|(?<![-\w])linear\(/);
  const classes = [...css.matchAll(/\.([a-z][\w-]*)/g)].map((m) => m[1]).filter((c) => !c.startsWith("is-"));
  assert.deepEqual(classes.filter((c) => !c.startsWith("ob-fx-")), []);
});

test("everything that animates stops when less motion is asked for", () => {
  const reduce = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.ok(reduce.length > 30, "no reduced-motion block");
  for (const m of css.slice(0, css.length - reduce.length).matchAll(/([^{}]+)\{[^}]*\banimation\s*:/g)) {
    const first = m[1].trim().match(/\.(ob-fx-[\w-]+)/)[1];
    const covered = reduce.includes(`.${first}`) || (first.startsWith("ob-fx-sheen") && reduce.includes(".ob-fx-sheen {"));
    assert.ok(covered, `${m[1].trim()} keeps animating`);
  }
  assert.match(fx, /export function tilt[\s\S]*?if \(reduced\(\)\)/);
  assert.match(fx, /export function scramble[\s\S]*?if \(reduced\(\)\)/);
  assert.match(fx, /export function glowCursor[\s\S]*?reduced\(\)/);
});
