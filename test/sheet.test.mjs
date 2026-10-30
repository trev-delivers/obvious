/* The Sheet registry item is a modal dialog. These read its source, because
   there's no browser in this repo's tests; the behaviour itself (Tab wrapping,
   Escape, focus coming back) is checked by hand in Chromium whenever Sheet.tsx
   changes. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const tsx = read("registry/obvious/Sheet.tsx");
const css = read("registry/obvious/sheet.css").replace(/\/\*[\s\S]*?\*\//g, "");
const props = tsx.slice(tsx.indexOf("}: {", tsx.indexOf("export default function Sheet")), tsx.indexOf("const titleId"));

test("it's a modal dialog with a name", () => {
  assert.match(tsx, /role="dialog"/);
  assert.match(tsx, /aria-modal="true"/);
  assert.match(tsx, /aria-labelledby=\{[^}]*titleId[^}]*\}/);
  assert.match(tsx, /<h2 id=\{titleId\}>\{title\}<\/h2>/);
  assert.match(tsx, /aria-label=\{ariaLabel\}/);
});

test("an aria-label wins over the title, so the two never fight over the name", () => {
  assert.match(tsx, /aria-labelledby=\{ariaLabel === undefined && title !== undefined \? titleId : undefined\}/);
});

test("old callers still type-check: only onClose and children are required", () => {
  const required = [...props.matchAll(/^\s{2}(\w+|"[\w-]+")(\??):/gm)].filter((m) => !m[2]).map((m) => m[1]);
  assert.deepEqual(required, ["onClose", "children"]);
  for (const name of ["title", "tall", "side", '"aria-label"']) assert.match(props, new RegExp(`${name}\\?:`), name);
});

test("focus moves in on open, stays in on Tab and Shift+Tab, and goes back to the opener", () => {
  assert.match(tsx, /tabbables\(p\)\[0\] \?\? p\)\.focus\(\{ preventScroll: true \}\)/);
  assert.match(tsx, /e\.key !== "Tab"/);
  assert.match(tsx, /e\.shiftKey/);
  assert.match(tsx, /const prev = document\.activeElement/);
  assert.match(tsx, /prev\.focus\(\{ preventScroll: true \}\)/);
  assert.match(tsx, /tabIndex=\{-1\}/);
});

test("only the top sheet answers to Escape and Tab", () => {
  const onKey = tsx.slice(tsx.indexOf("const onKey"), tsx.indexOf('document.addEventListener("keydown"'));
  assert.match(onKey, /stack\[stack\.length - 1\] !== mineRef\.current\) return;/);
  assert.ok(onKey.indexOf("stack[stack.length - 1]") < onKey.indexOf('"Escape"'));
  assert.ok(onKey.indexOf("stack[stack.length - 1]") < onKey.indexOf('"Tab"'));
});

test("the rest of the page goes inert, and only what the sheet made inert is put back", () => {
  assert.match(tsx, /setAttribute\("inert", ""\)/);
  assert.match(tsx, /removeAttribute\("inert"\)/);
  assert.match(tsx, /held\.has\(el\)/);
  assert.match(tsx, /el\.hasAttribute\("inert"\)/);
  assert.match(tsx, /aria-live/);
  /* Same lifetime as the scroll lock: set when a sheet opens, released when the last one goes. */
  assert.match(tsx, /classList\.add\("ob-sheet-lock"\)/);
  assert.equal((tsx.match(/\bsync\(\)/g) ?? []).length, 3, "declared once, called on open and on close");
});

test("`side` makes a drawer on bigger screens, on the phone sheet's timing", () => {
  assert.match(tsx, /"ob-sheet" \+ \(side \? " is-side" : ""\)/);
  assert.match(tsx, /phone\(\) \|\| side \? readMs\("--ob-sheet-close-dur", 350\)/);
  assert.match(css, /\.ob-sheet\.is-side \.ob-sheet-panel/);
  assert.match(css, /--ob-sheet-side-width, 420px/);
  /* Outside the 640px query there's no is-side rule, so on a phone it stays a bottom sheet. */
  const outside = css.replace(/@media \(min-width: 640px\) \{(?:[^{}]|\{[^{}]*\})*\}/g, "");
  assert.doesNotMatch(outside, /is-side/);
});

test("reduced motion still stops every sheet transition", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.ob-sheet-shade, \.ob-sheet-panel \{ transition: none !important; \} \}/);
});

test("the built registry item has the current source", () => {
  execFileSync(process.execPath, [new URL("scripts/build-registry.mjs", root).pathname], { stdio: "pipe" });
  const built = JSON.parse(read("dist/r/sheet.json"));
  for (const f of built.files) assert.equal(f.content, read(f.path), f.path);
  assert.match(built.description, /side/);
});
