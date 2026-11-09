import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";
import http from "node:http";
import {
  scanRepo,
  scanLive,
  checkDns,
  splitSql,
  analyseSql,
  taintedNames,
  blankComments,
  parseSetCookie,
  jwtRole,
  cmpVersion,
  siteOf,
  failing,
} from "../.claude/skills/site-review/scripts/site-scan.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "..", ".claude", "skills", "site-review", "scripts", "site-scan.mjs");
const fixtures = join(here, "fixtures", "site-scan");
const ids = (list) => new Set(list.map((f) => f.id));

/* The fake secrets are put together here at run time, never written into a
   committed file, so GitHub's secret scanning has nothing to trip on. */
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const FAKE = {
  supabase: "sb_" + "secret_" + "Ab3d".repeat(8),
  stripe: "sk_" + "live_" + "Z9y8".repeat(6),
  serviceRole: `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ iss: "supabase", role: "service_role" })}.${"s1gnature".repeat(3)}`,
  pem: "-----BEGIN " + "PRIVATE KEY-----",
};

/* package.json and the lockfile are written at run time too, so GitHub's
   dependency graph doesn't raise alerts for the fixture's old Next.js. */
function withPackage(dir, next) {
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fixture", private: true, dependencies: { next } }));
  writeFileSync(join(dir, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: { "": {}, "node_modules/next": { version: next } } }));
}

function cleanCopy() {
  const dir = mkdtempSync(join(tmpdir(), "site-scan-clean-"));
  cpSync(join(fixtures, "clean"), dir, { recursive: true });
  withPackage(dir, "15.5.9");
  return dir;
}

function vulnerableCopy() {
  const dir = mkdtempSync(join(tmpdir(), "site-scan-vuln-"));
  cpSync(join(fixtures, "vulnerable"), dir, { recursive: true });
  withPackage(dir, "15.2.0");
  mkdirSync(join(dir, "public"), { recursive: true });
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "public", "config.js"), `window.SUPABASE_KEY = "${FAKE.supabase}";\n`);
  writeFileSync(join(dir, "src", "pay.ts"), `export const stripe = "${FAKE.stripe}";\n`);
  writeFileSync(join(dir, "lib", "admin.ts"), `"use client";\nexport const admin = "${FAKE.serviceRole}";\nexport const pem = "${FAKE.pem}";\n`);
  writeFileSync(join(dir, ".env.local"), "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=not-a-real-value\nNEXT_PUBLIC_SUPABASE_ANON_KEY=fine\n");
  return dir;
}

test("the vulnerable fixture sets off every repo check", async () => {
  const dir = vulnerableCopy();
  try {
    const r = await scanRepo(dir, { audit: false });
    const all = ids([...r.findings, ...r.checks]);
    const expected = [
      "next-advisory",
      "middleware-only-auth",
      "google-fonts",
      "compromised-script-host",
      "third-party-script",
      "source-maps",
      "secret-in-client",
      "public-env-secret",
      "table-without-rls",
      "policy-true",
      "public-bucket",
      "definer-search-path",
      "definer-rpc",
      "view-bypasses-rls",
      "html-injection",
      "open-redirect",
      "ssrf",
      "path-traversal",
      "client-price",
      "form-no-rate-limit",
      "login-no-rate-limit",
      "secret-fallback",
      "session-replay",
      "replay-unmasked",
      "tracking-without-consent",
      "clickjacking",
      "no-csp",
      "user-enumeration",
      "age-check",
    ];
    const missing = expected.filter((id) => !all.has(id));
    assert.deepEqual(missing, [], `not found: ${missing.join(", ")}`);
    const cve = r.findings.find((f) => f.title.includes("CVE-2025-29927"));
    assert.equal(cve.severity, "Critical", "middleware exists, so the header bypass is Critical");
    assert.ok(r.findings.find((f) => f.id === "table-without-rls").where[0].startsWith("supabase/migrations/20260101000000_init.sql:"));
    assert.ok(r.findings.filter((f) => f.id === "secret-in-client").length >= 4, "supabase, stripe, service_role and private key");
    assert.ok(failing(r));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("secrets are never printed in full", () => {
  const dir = vulnerableCopy();
  try {
    const out = spawnSync(process.execPath, [script, dir, "--json", "--no-audit"], { encoding: "utf8" });
    assert.equal(out.status, 1, "High and Critical findings exit 1");
    for (const value of Object.values(FAKE).filter((v) => v.length > 20)) assert.ok(!out.stdout.includes(value), "a secret leaked into the output");
    assert.ok(!out.stdout.includes("not-a-real-value"), "an env value leaked into the output");
    assert.ok(JSON.parse(out.stdout).findings.length > 10);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the clean fixture sets off nothing", async () => {
  const dir = cleanCopy();
  try {
    const r = await scanRepo(dir, { audit: false });
    assert.deepEqual(r.findings.map((f) => `${f.id}: ${f.title}`), []);
    assert.deepEqual(r.checks.map((f) => `${f.id}: ${f.title}`), []);
    assert.ok(r.fine.some((f) => f.includes("next/font")));
    assert.ok(r.fine.some((f) => f.startsWith("Next.js 15.5.9")));
    const out = spawnSync(process.execPath, [script, dir, "--no-audit"], { encoding: "utf8" });
    assert.equal(out.status, 0, out.stdout);
    assert.match(out.stdout, /0 findings, 0 to check by hand/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a key removed from the code is still found in git history", async () => {
  const dir = mkdtempSync(join(tmpdir(), "site-scan-git-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
  try {
    git("init", "-q");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");
    git("config", "commit.gpgsign", "false");
    writeFileSync(join(dir, "server.js"), `const key = "${FAKE.stripe}";\n`);
    writeFileSync(join(dir, ".env"), "SECRET=1\n");
    git("add", "-A");
    git("commit", "-qm", "first");
    unlinkSync(join(dir, "server.js"));
    git("add", "-A");
    git("commit", "-qm", "second");
    const r = await scanRepo(dir, { audit: false });
    const hist = r.findings.find((f) => f.id === "secret-in-history");
    assert.ok(hist, "history finding");
    assert.match(hist.where[0], /server\.js in commit [0-9a-f]{12}/);
    assert.ok(!JSON.stringify(r).includes(FAKE.stripe));
    assert.ok(ids(r.findings).has("env-committed"), "a tracked .env with values");
    const off = await scanRepo(dir, { audit: false, history: false });
    assert.ok(!ids(off.findings).has("secret-in-history"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("splitSql keeps function bodies and quoted semicolons in one statement", () => {
  const sql = `-- a; comment\ncreate function public.f() returns int language plpgsql security definer as $fn$ begin perform 1; return 2; end $fn$;\ninsert into t values ('a;b');\n/* x; */ select 1;`;
  const st = splitSql(sql);
  assert.equal(st.length, 3);
  assert.match(st[0].skel, /security definer/);
  assert.doesNotMatch(st[0].skel, /perform/);
  assert.equal(st[1].line, 3);
  assert.equal(st[2].skel, "select 1");
});

test("analyseSql follows later migrations", () => {
  const a = analyseSql([
    { file: "a.sql", text: `create table "public"."t" (id int); create policy "p" on public.t for all to anon using (true); create or replace function public.f() returns int language sql security definer as $$ select 1 $$;` },
    { file: "b.sql", text: `alter table public.t enable row level security; drop policy if exists "p" on public.t; alter function public.f() set search_path = ''; revoke execute on function public.g(), public.f() from public, anon;` },
  ]);
  assert.ok(a.rls.has("public.t"));
  assert.equal(a.policies.size, 0);
  assert.equal(a.funcs.get("public.f").searchPath, true);
  assert.equal(a.funcs.get("public.f").revoked, true);
});

test("request taint and comment blanking", () => {
  const t = taintedNames(`const { searchParams } = new URL(req.url);\nconst next = searchParams.get("next");\nconst fixed = "/home";`);
  assert.ok(t.names.has("next") && !t.names.has("fixed"));
  const b = blankComments(`const a = "https://x.test"; // fonts.googleapis.com\n/* src/**/x */ const b = 1;`);
  assert.ok(b.includes("https://x.test") && !b.includes("googleapis") && b.includes("const b = 1") && b.split("\n").length === 2);
});

test("small helpers", () => {
  assert.equal(jwtRole(FAKE.serviceRole), "service_role");
  assert.equal(cmpVersion("15.2.3", "15.2.10"), -1);
  assert.equal(siteOf("www.example.co.uk"), "example.co.uk");
  assert.deepEqual(parseSetCookie("sid=1; Path=/; HttpOnly; Secure; SameSite=Lax"), { name: "sid", secure: true, httpOnly: true, sameSite: "lax" });
});

function serve(routes) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const r = routes[req.url.split("?")[0]];
      if (!r) {
        res.writeHead(404, { "content-type": "text/plain" });
        return res.end("not found");
      }
      res.writeHead(r.status ?? 200, r.headers ?? {});
      res.end(r.body ?? "");
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}

test("live checks on a site with the usual holes", async () => {
  const { server, url } = await serve({
    "/": {
      headers: { "content-type": "text/html", "x-powered-by": "Express", "set-cookie": "session=abc; Path=/" },
      body: `<!doctype html><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter"><script src="https://cdn.polyfill.io/v3/polyfill.min.js"></script><script src="/app.js"></script><form><input name="q"></form>`,
    },
    "/app.js": { headers: { "content-type": "text/javascript" }, body: "console.log(1);\n//# sourceMappingURL=app.js.map\n" },
    "/app.js.map": { headers: { "content-type": "application/json" }, body: `{"version":3,"sources":["src/app.ts"],"mappings":"AAAA"}` },
    "/.git/HEAD": { body: "ref: refs/heads/main\n" },
    "/.env": { body: "SECRET_KEY=abc\n" },
    "/robots.txt": { body: "User-agent: *\nDisallow: /admin\n" },
  });
  try {
    const r = await scanLive(url, { pause: 0 });
    const found = ids(r.findings);
    for (const id of ["live-clickjacking", "live-no-csp", "live-no-nosniff", "live-no-referrer-policy", "live-powered-by", "live-cookie-httponly", "git-exposed", "env-exposed", "live-compromised-script-host", "live-google-fonts", "live-source-map"])
      assert.ok(found.has(id), `missing ${id}`);
    assert.ok(ids(r.checks).has("robots-paths"));
    assert.ok(ids(r.checks).has("live-cookie-samesite"));
    assert.equal(r.findings.find((f) => f.id === "git-exposed").severity, "Critical");
    assert.equal(r.findings.find((f) => f.id === "live-clickjacking").severity, "Medium", "the page has a form");
  } finally {
    server.close();
  }
});

test("live checks on a well set up site find nothing, and an HTML fallback isn't an exposed file", async () => {
  const headers = {
    "content-type": "text/html",
    "content-security-policy": "default-src 'self'; frame-ancestors 'none'; object-src 'none'",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=()",
    "set-cookie": "theme=dark; Path=/; Secure; SameSite=Lax",
  };
  const page = `<!doctype html><script src="/app.js"></script>`;
  const { server, url } = await serve({
    "/": { headers, body: page },
    "/app.js": { headers: { "content-type": "text/javascript" }, body: "console.log(1);\n" },
    /* SPA hosts answer every path with the app's HTML. */
    "/.git/HEAD": { headers, body: page },
    "/.env": { headers, body: page },
  });
  try {
    const r = await scanLive(url, { pause: 0 });
    assert.deepEqual(r.findings.map((f) => `${f.id}: ${f.title}`), []);
    assert.deepEqual(r.checks.map((f) => `${f.id}: ${f.title}`), []);
    assert.ok(r.fine.some((f) => f.includes(".git and .env")));
  } finally {
    server.close();
  }
});

test("DNS: a CNAME to a provider name that no longer exists is a takeover risk", async () => {
  const nx = Object.assign(new Error("nx"), { code: "ENOTFOUND" });
  const nodata = Object.assign(new Error("nodata"), { code: "ENODATA" });
  const resolver = {
    resolveCname: async (h) => {
      if (h === "www.example.test") return ["old-site.herokuapp.com"];
      if (h === "example.test") throw nodata;
      if (h === "blog.example.test") return ["someone.github.io"];
      if (h === "www.blog.example.test") throw nx;
      throw nodata;
    },
    lookup: async (h) => {
      if (h === "old-site.herokuapp.com") throw nx;
      return [{ address: "192.0.2.1", family: 4 }];
    },
  };
  const a = await checkDns("example.test", resolver, async () => ({ status: 200, body: "" }));
  assert.equal(a.findings.length, 1);
  assert.equal(a.findings[0].id, "dangling-dns");
  assert.match(a.findings[0].where[0], /www\.example\.test -> old-site\.herokuapp\.com/);
  const b = await checkDns("blog.example.test", resolver, async () => ({ status: 404, body: "There isn't a GitHub Pages site here." }));
  assert.equal(b.findings.length, 1, "the provider's nothing-here page counts");
  const c = await checkDns("blog.example.test", resolver, async () => ({ status: 200, body: "<h1>My blog</h1>" }));
  assert.equal(c.findings.length, 0);
  assert.ok(c.fine.some((f) => f.includes("GitHub Pages")));
});

test("bad arguments exit 2", () => {
  assert.equal(spawnSync(process.execPath, [script, "--url", "ftp://x"]).status, 2);
  assert.equal(spawnSync(process.execPath, [script, join(fixtures, "does-not-exist")]).status, 2);
  assert.equal(spawnSync(process.execPath, [script, "--nope"]).status, 2);
});
