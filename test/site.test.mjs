/* A smoke test for the docs site without a browser: build it, then check
   every page has a title and a heading, and every link and asset on it
   points at something that was built. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
execFileSync(process.execPath, [join(root, "web", "build.mjs")], { stdio: "pipe" });

const pages = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry.endsWith(".html")) pages.push(full);
  }
})(site);

/* The same lookups as web/serve.mjs and Vercel's clean URLs. */
const resolves = (path) => {
  const clean = path.split(/[?#]/)[0];
  if (!clean || clean === "/") return existsSync(join(site, "index.html"));
  return [clean, `${clean}.html`, join(clean, "index.html")].some((p) => existsSync(join(site, p)));
};

test("builds every page", () => {
  assert.ok(pages.length >= 20, `only ${pages.length} pages`);
});

test("every page has a title and one h1", () => {
  for (const page of pages) {
    const html = readFileSync(page, "utf8");
    assert.match(html, /<title>[^<]+<\/title>/, page);
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, page);
  }
});

test("every internal link and asset exists", () => {
  const broken = [];
  for (const page of pages) {
    const html = readFileSync(page, "utf8");
    for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      if (!resolves(m[1])) broken.push(`${page.slice(site.length)} -> ${m[1]}`);
    }
  }
  assert.deepEqual(broken, []);
});

test("no em or en dashes in the copy", () => {
  for (const page of pages) assert.doesNotMatch(readFileSync(page, "utf8"), /[–—]/, page);
});

/* The skills page shows what each skill is for. Their text names the family
   and each app's open gaps, so none of it, and nothing to download, may
   reach the site. */
test("skills page is locked and carries no skill text", () => {
  const html = readFileSync(join(site, "skills.html"), "utf8");
  const locks = html.match(/class="skill-lock"[^>]*aria-disabled="true"/g) ?? [];
  assert.ok(locks.length >= 6, `only ${locks.length} locked buttons`);
  assert.doesNotMatch(html, /href="[^"]*\.(md|zip)"|\bdownload=/);
  const all = pages.map((p) => readFileSync(p, "utf8")).join("\n");
  const skillText = readFileSync(join(root, ".claude", "skills", "engineer", "references", "repos.md"), "utf8");
  for (const secret of ["Darcy", "hvyvtgshinhrwtkewgly", skillText.split("\n").find((l) => l.length > 60)]) {
    assert.ok(!all.includes(secret), `site contains ${secret}`);
  }
});
