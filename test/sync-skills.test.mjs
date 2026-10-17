import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const script = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "sync-skills.mjs");

function setup() {
  const base = mkdtempSync(join(tmpdir(), "sync-skills-test-"));
  const source = join(base, "obvious");
  const app = join(base, "app");
  for (const name of ["engineer", "write-like-trev"]) {
    mkdirSync(join(source, ".claude", "skills", name, "references"), { recursive: true });
    writeFileSync(join(source, ".claude", "skills", name, "SKILL.md"), `# ${name}\n`);
    writeFileSync(join(source, ".claude", "skills", name, "references", "a.md"), "a\n");
  }
  mkdirSync(join(app, ".claude", "skills", "app-only"), { recursive: true });
  writeFileSync(join(app, ".claude", "skills", "app-only", "SKILL.md"), "mine\n");
  return { base, source, app };
}

const sync = (app, source, ...args) =>
  spawnSync(process.execPath, [script, ...args], { cwd: app, env: { ...process.env, DS_LOCAL: source } });

test("copies both skills and leaves the app's own skills alone", () => {
  const { base, source, app } = setup();
  assert.equal(sync(app, source).status, 0);
  assert.equal(readFileSync(join(app, ".claude/skills/engineer/SKILL.md"), "utf8"), "# engineer\n");
  assert.ok(existsSync(join(app, ".claude/skills/write-like-trev/references/a.md")));
  assert.ok(existsSync(join(app, ".claude/skills/app-only/SKILL.md")));
  rmSync(base, { recursive: true });
});

test("--check passes when current and fails when a copy has drifted", () => {
  const { base, source, app } = setup();
  assert.equal(sync(app, source, "--check").status, 1, "nothing synced yet");
  sync(app, source);
  assert.equal(sync(app, source, "--check").status, 0);

  writeFileSync(join(source, ".claude/skills/write-like-trev/SKILL.md"), "# write-like-trev, newer\n");
  const stale = sync(app, source, "--check");
  assert.equal(stale.status, 1);
  assert.match(stale.stdout.toString(), /changed SKILL\.md/);
  rmSync(base, { recursive: true });
});

test("a file removed from obvious goes from the app on the next sync", () => {
  const { base, source, app } = setup();
  sync(app, source);
  rmSync(join(source, ".claude/skills/engineer/references/a.md"));
  assert.match(sync(app, source, "--check").stdout.toString(), /extra references\/a\.md/);
  sync(app, source);
  assert.ok(!existsSync(join(app, ".claude/skills/engineer/references/a.md")));
  rmSync(base, { recursive: true });
});

test("fails clearly when the source has no skills", () => {
  const { base, app } = setup();
  const r = sync(app, join(base, "nowhere"));
  assert.equal(r.status, 1);
  assert.match(r.stderr.toString(), /has no \.claude\/skills\/engineer/);
  rmSync(base, { recursive: true });
});
