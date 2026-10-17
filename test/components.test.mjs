import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../src/components/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".css"));
/* Variables the behaviours module sets on elements at runtime. */
const runtime = new Set(
  [...readFileSync(new URL("../src/js/behaviours.js", import.meta.url), "utf8").matchAll(/setProperty\(\s*["'`](--[\w-]+)/g)].map((m) => m[1]),
);
const read = (f) => readFileSync(new URL(f, dir), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/* tooltip.css and badge.css used to read the portfolio's own --line2, --dim,
   --mono and --bg, which nothing else defines, so outside the portfolio the
   tooltip had no border or colour and the badge lost its ring. */
test("components only read --ds-* tokens, their own knobs, runtime variables, or variables with a fallback", () => {
  const strays = [];
  for (const f of files) {
    const css = read(f);
    const own = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
    for (const m of css.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
      const [, name, fallback] = m;
      if (name.startsWith("--ds-") || own.has(name) || runtime.has(name) || fallback) continue;
      strays.push(`${f}: ${name}`);
    }
  }
  assert.deepEqual(strays, []);
});

test("the tooltip shows itself on hover and focus", () => {
  const css = read("tooltip.css");
  assert.match(css, /\.t-tt-wrap:hover \.t-tt/);
  assert.match(css, /\.t-tt-trigger:focus-visible \+ \.t-tt/);
});

test("no component sets monospace or letter-spacing", () => {
  for (const f of files) {
    const css = read(f);
    assert.doesNotMatch(css, /monospace|--ds-font-mono/, f);
    assert.doesNotMatch(css, /letter-spacing/, f);
  }
});
