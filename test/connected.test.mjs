/* The engineer skill's connected.mjs: obvious passes, and an app with its
   own copies of obvious's code fails with each one named. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, ".claude", "skills", "engineer", "scripts", "connected.mjs");
const run = (repo) => {
  try {
    return { code: 0, out: execFileSync(process.execPath, [script, repo, "--obvious", root, "--json"], { encoding: "utf8" }) };
  } catch (err) {
    return { code: err.status, out: err.stdout };
  }
};
const failed = (out) => JSON.parse(out).results.filter((r) => r.status === "FAIL").map((r) => r.what);

test("obvious is connected to itself", () => {
  const { code, out } = run(root);
  assert.equal(code, 0, failed(out).join("\n"));
});

test("an app with its own copies fails, naming each", () => {
  const app = mkdtempSync(join(tmpdir(), "connected-"));
  try {
    cpSync(join(root, "dist"), join(app, "ds"), { recursive: true });
    mkdirSync(join(app, "scripts"));
    for (const s of ["audit-ds.mjs", "sync-ds.mjs", "sync-skills.mjs"]) cpSync(join(root, "scripts", s), join(app, "scripts", s));
    mkdirSync(join(app, "src"));
    writeFileSync(join(app, "src", "site.js"), "function cssMs(v, f){ return f }\n/* transitions.dev's confetti */\n");
    writeFileSync(join(app, "src", "site.css"), ".t-chip{color:red}\n");
    writeFileSync(join(app, "package.json"), JSON.stringify({ scripts: { check: "node --test" } }));
    const { code, out } = run(app);
    assert.equal(code, 1);
    const f = failed(out).join("\n");
    assert.match(f, /Private copies of obvious's behaviours/);
    assert.match(f, /came from somewhere else/);
    assert.match(f, /old t- class names/);
    assert.match(f, /Shared skills are out of date/);
    assert.match(f, /doesn't run everything/);
    assert.match(f, /No CI workflow/);
    assert.doesNotMatch(f, /ds\/ differs/);
  } finally {
    rmSync(app, { recursive: true, force: true });
  }
});
