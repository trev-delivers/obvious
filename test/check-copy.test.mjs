// node --test check-copy.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkText } from "../.claude/skills/write-like-trev/scripts/check-copy.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const rules = (text, opts) => checkText(text, opts).map((f) => f.rule);
const tells = (text, opts) => checkText(text, opts).filter((f) => f.level === "tell").map((f) => f.rule);

test("Trev's own lines come back clean", () => {
  for (const line of [
    "No sign-up. Finds save to this phone as you go.",
    "Nobody's written a word on this one yet.",
    "Built for sensitive skin. Product names link out to where to buy.",
    "Couldn't copy it. Press and hold the link instead.",
    "Nothing needs buying. Nice.",
  ]) assert.deepEqual(checkText(line), [], line);
});

test("em and en dashes, spaced hyphens and entities", () => {
  assert.ok(rules("It works — mostly.").includes("em-dash"));
  assert.ok(rules("2009–2013").includes("en-dash"));
  assert.ok(rules("No leaderboard - it's just for fun.").includes("spaced-hyphen"));
  assert.ok(rules("<p>It works &mdash; mostly.</p>", { type: "html" }).includes("em-dash"));
  assert.deepEqual(rules("A well-made sign-up form."), []);
});

test("negative parallelism in its usual shapes", () => {
  assert.ok(tells("Roles, not sizes.").includes("x-not-y"));
  assert.ok(tells("It's not a list app. It's a memory.").includes("phrase"));
  assert.ok(tells("It isn't a tool, it's a habit.").includes("phrase"));
  assert.ok(tells("It's not just a review site but a community.").includes("phrase"));
  assert.ok(tells("No accounts, no tracking, just your data.").includes("phrase"));
  assert.ok(rules("It's a bridge rather than a replacement.").includes("rather-than"));
  assert.deepEqual(tells("Whether or not it rains, we go."), []);
});

test("words, openers, closers and US spelling", () => {
  assert.ok(tells("Let's delve into the data.").includes("word"));
  assert.ok(tells("So, here's how it works.").includes("opener"));
  assert.ok(tells("Ultimately, it was worth it.").includes("opener"));
  assert.ok(tells("In short, it saves time.").includes("phrase"));
  assert.ok(tells("Pick a color.").includes("us-spelling"));
  assert.deepEqual(tells("Pick a colour."), []);
  assert.deepEqual(checkText("Pick a color.", { allow: ["color"] }), []);
});

test("rule of three, fragment stacks and exclamation marks", () => {
  assert.ok(rules("It's fast, simple and secure.").includes("rule-of-three"));
  assert.ok(tells("Fast. Simple. Yours.").includes("fragments"));
  assert.ok(tells("Saved!").includes("exclamation"));
  assert.deepEqual(rules("![A screenshot](a.png)", { type: "md" }), []);
});

test("headings: title case and all caps", () => {
  assert.ok(tells("## How Saving Works", { type: "md" }).includes("title-case"));
  assert.deepEqual(tells("## How saving works", { type: "md" }), []);
  assert.deepEqual(tells("# Smuggle Brawlers Case Study", { type: "md" }), [], "h1 is usually a name");
  assert.ok(tells("<h2>Our Approach To Design</h2>", { type: "html" }).includes("title-case"));
  assert.ok(tells("CASE STUDY", { type: "md" }).includes("all-caps"));
  assert.ok(tells("- **Speed**: it's quick", { type: "md" }).includes("bold-label-bullet"));
});

test("code, URLs and markers are skipped", () => {
  const md = [
    "Run `color --delve` first.",
    "```",
    "const x = 'seamless — robust';",
    "```",
    "See https://example.com/leverage-the-landscape",
    "Before: ~~It's not a list app. It's a memory.~~",
    "<!-- copy-check: off -->",
    "Welcome! Let's dive in — it's seamless.",
    "<!-- copy-check: on -->",
    "Unlock robust synergy. <!-- copy-ok -->",
  ].join("\n");
  assert.deepEqual(checkText(md, { type: "md" }), []);
  const html = "<script>let a = 'delve!'</script><pre>seamless</pre><p>Plain words.</p>";
  assert.deepEqual(checkText(html, { type: "html" }), []);
});

test("HTML alt text and meta descriptions are copy", () => {
  assert.ok(tells('<img src="a.png" alt="A vibrant, seamless dashboard">', { type: "html" }).includes("word"));
  assert.ok(tells('<meta name="description" content="Elevate your sauce game!">', { type: "html" }).includes("word"));
  assert.deepEqual(tells('<meta charset="utf-8"><meta name="viewport" content="width=device-width">', { type: "html" }), []);
});

test("line numbers survive HTML tags that span lines", () => {
  const html = '<p\n  class="a">\nThis is seamless.</p>';
  const [f] = checkText(html, { type: "html" });
  assert.equal(f.line, 3);
});

test("--soft keeps tells only", () => {
  const all = checkText("It's really fast — and very simple.");
  const soft = checkText("It's really fast — and very simple.", { soft: true });
  assert.ok(all.some((f) => f.level === "check"));
  assert.ok(soft.every((f) => f.level === "tell") && soft.length > 0);
});

test("the CLI exits 1 on findings, 0 when clean, 2 with nothing to do", () => {
  const dir = mkdtempSync(join(tmpdir(), "check-copy-"));
  writeFileSync(join(dir, "bad.md"), "## Our Amazing Features\n\nIt's seamless — truly!\n");
  writeFileSync(join(dir, "good.md"), "## How saving works\n\nFinds save to this phone as you go.\n");
  const run = (...a) => spawnSync(process.execPath, [join(here, "../.claude/skills/write-like-trev/scripts/check-copy.mjs"), ...a], { encoding: "utf8" });
  const bad = run(join(dir, "bad.md"));
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /bad\.md:3:\d+ +tell +em-dash/);
  assert.equal(run(join(dir, "good.md")).status, 0);
  assert.equal(run().status, 2);
  const stdin = spawnSync(process.execPath, [join(here, "../.claude/skills/write-like-trev/scripts/check-copy.mjs"), "-"], { input: "Leverage the synergy\n", encoding: "utf8" });
  assert.equal(stdin.status, 1);
  const json = JSON.parse(run("--json", join(dir, "bad.md")).stdout);
  assert.equal(json[0].findings[0].rule, "title-case");
});
