import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, over, ratio, nearestPassing, measure, compare, record, loadThemes } from "../scripts/contrast.mjs";
import { readFileSync } from "node:fs";

const theme = (colours) => [{ id: "t", colours }];
const base = {
  bg: "#FFFFFF", surface: "#FFFFFF", text: "#000000", "text-dim": "#333333", "text-muted": "#595959",
  accent: "#0055CC", "accent-contrast": "#FFFFFF",
  success: "#1E7A3C", warning: "#8A5A00", danger: "#B3261E", info: "#0055CC",
};

test("measures WCAG ratios", () => {
  assert.equal(ratio(parse("#FFFFFF"), parse("#000000")), 21);
  assert.equal(Math.round(ratio(parse("#777777"), parse("#FFFFFF")) * 100) / 100, 4.48);
});

test("reads short hex, alpha hex and rgba, and lays alpha over the page", () => {
  assert.deepEqual(parse("#fff"), { r: 255, g: 255, b: 255, a: 1 });
  assert.equal(parse("#00000080").a, 128 / 255);
  assert.deepEqual(parse("rgba(255, 255, 255, 0.5)"), { r: 255, g: 255, b: 255, a: 0.5 });
  assert.deepEqual(over(parse("rgba(255, 255, 255, 0.5)"), parse("#000000")), { r: 127.5, g: 127.5, b: 127.5, a: 1 });
});

test("suggests the nearest passing colour, and it does pass", () => {
  const s = nearestPassing(parse("#999999"), parse("#FFFFFF"), 4.5);
  assert.ok(s.ratio >= 4.5);
  assert.ok(ratio(parse(s.colour), parse("#FFFFFF")) >= 4.5);
});

test("a theme that passes everything has no failures", () => {
  assert.equal(measure(theme(base)).filter((r) => !r.passes).length, 0);
});

test("a new failure is a regression", () => {
  const rows = measure(theme({ ...base, "text-muted": "#AAAAAA" }));
  const { regressions } = compare(rows, {});
  assert.equal(regressions.length, 2); // on bg and on surface
  assert.match(regressions[0], /text-muted on bg/);
});

test("a recorded failure is allowed until it gets worse", () => {
  const before = measure(theme({ ...base, "text-muted": "#999999" }));
  const recorded = record(before);
  assert.deepEqual(compare(before, recorded).regressions, []);
  const worse = measure(theme({ ...base, "text-muted": "#BBBBBB" }));
  assert.match(compare(worse, recorded).regressions[0], /has dropped from/);
});

test("a recorded failure that now passes is reported", () => {
  const recorded = { t: { "text-muted on bg": 2.0 } };
  assert.match(compare(measure(theme(base)), recorded).better[0], /passes now/);
});

test("checks dark sets as well as the light ones", () => {
  const ids = loadThemes().map((s) => s.id);
  assert.ok(ids.includes("morris dark"));
});

test("the themes in src/ have no failures beyond the recorded ones", () => {
  const exceptions = JSON.parse(readFileSync(new URL("../src/contrast-exceptions.json", import.meta.url), "utf8"));
  assert.deepEqual(compare(measure(loadThemes()), exceptions).regressions, []);
});
