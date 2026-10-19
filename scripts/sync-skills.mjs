#!/usr/bin/env node
/**
 * Copies the shared Claude skills from obvious into an app's .claude/skills/.
 *
 * obvious keeps the master copy of the skills every repo should have: how
 * to work as the engineer on Trev's projects, how to write like him, and the
 * design skills (design system, Figma to code, accessibility, critique, UX
 * writing).
 * Each app keeps a copy of this script at scripts/sync-skills.mjs, the same
 * way it keeps sync-ds.mjs.
 *
 *   node scripts/sync-skills.mjs              # pull main into .claude/skills/
 *   node scripts/sync-skills.mjs --ref <sha>  # a particular commit or tag
 *   node scripts/sync-skills.mjs --check      # fail if any copy is stale
 *   DS_LOCAL=../obvious node scripts/sync-skills.mjs   # from a local checkout
 *
 * Each skill folder is replaced whole, so a file removed in obvious goes
 * from the app too. Skills the app has of its own are left alone.
 */
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, mkdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

export const SKILLS = [
  "engineer",
  "write-like-trev",
  "design-system-guardian",
  "figma-to-code",
  "a11y-review",
  "design-critique",
  "ux-writing",
];

const REPO = process.env.DS_REPO ?? "https://github.com/trev-delivers/obvious.git";

/** Every file under dir, as relative path -> contents. */
function files(dir, base = dir, out = new Map()) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files(full, base, out);
    else out.set(relative(base, full), readFileSync(full));
  }
  return out;
}

/** What differs between the master copy and the app's copy of one skill. */
export function differences(from, to) {
  const a = files(from);
  const b = files(to);
  const out = [];
  for (const [path, body] of a) {
    if (!b.has(path)) out.push(`missing ${path}`);
    else if (!b.get(path).equals(body)) out.push(`changed ${path}`);
  }
  for (const path of b.keys()) if (!a.has(path)) out.push(`extra ${path}`);
  return out;
}

export function run({ source, target, check }) {
  const report = [];
  let stale = false;
  for (const name of SKILLS) {
    const from = join(source, ".claude", "skills", name);
    const to = join(target, ".claude", "skills", name);
    if (!existsSync(from)) throw new Error(`${source} has no .claude/skills/${name}`);
    const diff = differences(from, to);
    if (check) {
      if (diff.length) {
        stale = true;
        report.push(`${name} is out of date:\n    ${diff.join("\n    ")}`);
      } else report.push(`${name} is current`);
      continue;
    }
    rmSync(to, { recursive: true, force: true });
    mkdirSync(join(target, ".claude", "skills"), { recursive: true });
    cpSync(from, to, { recursive: true });
    report.push(diff.length ? `${name}: updated (${diff.length} file${diff.length === 1 ? "" : "s"})` : `${name}: already current`);
  }
  return { stale, report };
}

function main(args) {
  const ref = args.includes("--ref") ? args[args.indexOf("--ref") + 1] : "main";
  const check = args.includes("--check");
  let source;
  let cleanup = () => {};

  if (process.env.DS_LOCAL) {
    source = process.env.DS_LOCAL;
  } else {
    const tmp = mkdtempSync(join(tmpdir(), "obvious-skills-"));
    cleanup = () => rmSync(tmp, { recursive: true, force: true });
    try {
      /* --branch takes a branch or tag. A bare commit needs a fetch. */
      if (/^[0-9a-f]{7,40}$/.test(ref)) {
        execFileSync("git", ["init", "-q", tmp], { stdio: "pipe" });
        execFileSync("git", ["-C", tmp, "fetch", "-q", "--depth", "1", REPO, ref], { stdio: "pipe" });
        execFileSync("git", ["-C", tmp, "checkout", "-q", "FETCH_HEAD"], { stdio: "pipe" });
      } else {
        execFileSync("git", ["clone", "-q", "--depth", "1", "--branch", ref, REPO, tmp], { stdio: "pipe" });
      }
    } catch (err) {
      cleanup();
      console.error(`Couldn't fetch ${REPO} at ${ref}.\n${err.stderr?.toString() ?? err.message}`);
      return 1;
    }
    source = tmp;
  }

  try {
    const { stale, report } = run({ source, target: process.cwd(), check });
    console.log(report.join("\n"));
    if (stale) {
      console.error("Run: node scripts/sync-skills.mjs");
      return 1;
    }
    return 0;
  } catch (err) {
    console.error(err.message);
    return 1;
  } finally {
    cleanup();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
