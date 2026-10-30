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
/* The golds are declared once, in gradient-text.css, and read by confetti
   too, so a variable declared by any component counts as the system's. */
const shared = new Set(files.flatMap((f) => [...read(f).matchAll(/(--ob-[\w-]+)\s*:/g)].map((m) => m[1])));

test("components only read --ds-* tokens, their own knobs, runtime variables, or variables with a fallback", () => {
  const strays = [];
  for (const f of files) {
    const css = read(f);
    const own = new Set([...[...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]), ...shared]);
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
  assert.match(css, /\.ob-tooltip-host:hover > \.ob-tooltip/);
  assert.match(css, /\.ob-tooltip-host:focus-within > \.ob-tooltip/);
});

/* On 18 Oct 2026 the components were rewritten as our own code with ob-
   names. These keep the old transitions.dev code and names from coming back. */
const shipped = [
  ...files.map((f) => new URL(f, dir)),
  ...readdirSync(new URL("../registry/obvious/", import.meta.url)).map((f) => new URL(`../registry/obvious/${f}`, import.meta.url)),
  new URL("../src/js/behaviours.js", import.meta.url),
];

test("nothing shipped mentions or needs transitions.dev", () => {
  for (const url of shipped) assert.doesNotMatch(readFileSync(url, "utf8"), /transitions[.-]dev|\bpro[- ]?b(utto)?n\b/i, url.pathname);
  assert.doesNotMatch(readFileSync(new URL("../registry.json", import.meta.url), "utf8"), /"transitions"/);
});

test("every component and registry class is ob-", () => {
  for (const url of shipped.filter((u) => u.pathname.endsWith(".css"))) {
    const css = readFileSync(url, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const old = [...css.matchAll(/\.(t-[a-z0-9-]+)/g)].map((m) => m[1]);
    assert.deepEqual(old, [], url.pathname);
  }
  for (const url of shipped.filter((u) => u.pathname.endsWith(".tsx"))) {
    assert.doesNotMatch(readFileSync(url, "utf8"), /className=\{?["`'][^"`']*\bt-[a-z]/, url.pathname);
  }
});

test("each component file is named after its class", () => {
  for (const f of files) assert.match(read(f), new RegExp(`\\.ob-${f.replace(".css", "")}\\b`), f);
});

test("no component sets monospace or letter-spacing", () => {
  for (const f of files) {
    const css = read(f);
    assert.doesNotMatch(css, /monospace|--ds-font-mono/, f);
    assert.doesNotMatch(css, /letter-spacing/, f);
  }
});

/* gradual-blur is a stack of backdrop-filter layers. These pin the parts that
   are easy to lose: the cap, the fallbacks, and the opacity trap. */
test("gradual blur caps its layers, falls back, and never fades its container", () => {
  const css = read("gradual-blur.css");
  assert.match(css, /:nth-child\(n\+9\)\s*\{\s*display:\s*none/);
  assert.match(css, /prefers-reduced-transparency:\s*reduce/);
  assert.match(css, /@supports not \(\(backdrop-filter/);
  assert.match(css, /-webkit-backdrop-filter/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /animation-timeline:\s*scroll\(/);
  /* An opacity on the container would stop the layers seeing the page. */
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*animation:[^{}]*)\}/g)) {
    assert.match(m[1], />\s*\*|::after/, `animation on ${m[1].trim()}`);
  }
  for (const edge of ["top", "bottom", "left", "right"]) assert.match(css, new RegExp(`\\.ob-gradual-blur--${edge}\\b`));
});

test("gradual blur is a registry item that ships the same CSS", () => {
  const reg = JSON.parse(readFileSync(new URL("../registry.json", import.meta.url), "utf8"));
  const item = reg.items.find((i) => i.name === "gradual-blur");
  assert.ok(item);
  assert.ok(item.files.some((f) => f.path === "src/components/gradual-blur.css" && f.target.endsWith("gradual-blur.css")));
  const tsx = readFileSync(new URL("../registry/obvious/GradualBlur.tsx", import.meta.url), "utf8");
  assert.match(tsx, /aria-hidden="true"/);
  assert.match(tsx, /Math\.min\(8/);
  const smoke = readFileSync(new URL("../scripts/registry-smoke/app/page.tsx", import.meta.url), "utf8");
  assert.match(smoke, /GradualBlur/);
});

test("the blur steps are tokens", () => {
  const p = JSON.parse(readFileSync(new URL("../src/primitives.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(p.blur).filter((k) => k !== "$comment"), ["sm", "md", "lg"]);
});
