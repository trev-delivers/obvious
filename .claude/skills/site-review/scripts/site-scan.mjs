#!/usr/bin/env node
/**
 * site-scan: the mechanical half of a security and legal review.
 *
 *   node site-scan.mjs <repo> [--url https://example.com] [--json]
 *                      [--no-audit] [--no-history] [--no-dns]
 *
 * It reads a repo (code, config, migrations, lockfile, git history) and,
 * if given a URL, makes a handful of polite GET requests and DNS lookups
 * against that live site. It never sends a form, never logs in, never
 * guesses a password and never tries to get round a check.
 *
 * Everything it prints is a lead. "Findings" are things the pattern proves
 * on its own (a table with no RLS, a header that isn't there). "Check by
 * hand" are things a pattern can only point at (innerHTML fed from a
 * variable): a person or the reviewing agent reads the code before calling
 * it a problem. The site-review skill says how.
 *
 * Exit code 1 when there's a Critical or High finding, 2 on bad arguments.
 *
 * Single file, Node's own modules only, so it can be copied into any repo.
 */
import { readFileSync, existsSync, readdirSync, statSync, realpathSync } from "node:fs";
import { join, relative, resolve, extname, basename, dirname, sep } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import tls from "node:tls";

export const SEVERITIES = ["Critical", "High", "Medium", "Low", "Fine"];
const rank = (s) => SEVERITIES.indexOf(s);

/* ------------------------------------------------------------------ */
/* Collecting results                                                  */
/* ------------------------------------------------------------------ */

function newReport() {
  return { findings: [], checks: [], fine: [], skipped: [] };
}

/** kind "finding" = proved by the pattern; "check" = a person has to look. */
function add(report, kind, item) {
  const entry = {
    id: item.id,
    severity: item.severity,
    title: item.title,
    where: [].concat(item.where ?? []).filter(Boolean).slice(0, 12),
    proof: item.proof ?? "",
    who: item.who ?? "",
    fix: item.fix ?? "",
  };
  (kind === "finding" ? report.findings : report.checks).push(entry);
}

/** Never print a secret. Enough to find it, not enough to use it. */
export function redact(s) {
  return `${s.slice(0, 6)}... (${s.length} characters)`;
}

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

/* Folders that are built output, installed packages or vendored copies of
   someone else's code. Agent skills (.claude, .agents) are prose and
   examples about the rules, this script included, so scanning them would
   only find the patterns they describe. */
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "coverage", ".vercel",
  ".turbo", ".svelte-kit", ".astro", ".output", ".nuxt", "ds", "vendor", ".claude",
  ".agents", "playwright-report", "test-results", ".venv", "__pycache__",
]);

const CODE_EXT = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".mts", ".cts", ".vue", ".svelte", ".astro"]);
const MARKUP_EXT = new Set([".html", ".htm"]);
const STYLE_EXT = new Set([".css", ".scss", ".sass", ".less"]);
const TEXT_EXT = new Set([...CODE_EXT, ...MARKUP_EXT, ...STYLE_EXT, ".json", ".sql", ".toml", ".yml", ".yaml", ".md", ".txt", ".py", ".sh"]);
const MAX_BYTES = 1_500_000;

const isEnvFile = (rel) => /^\.env(\.|$)/.test(basename(rel));
const isEnvExample = (rel) => /\.(example|sample|template|dist|defaults)$/i.test(basename(rel));
export const isTestPath = (rel) =>
  /(^|\/)(tests?|__tests__|__mocks__|e2e|fixtures?|spec|cypress|playwright)\//i.test(rel) ||
  /\.(test|spec|stories)\.[cm]?[jt]sx?$/.test(rel);

function walk(root, dir = root, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(root, full, out);
    else out.push(relative(root, full).split(sep).join("/"));
  }
  return out;
}

/** The repo's own files: git's list when root is a repo's top level (so
 *  ignored build output stays out), otherwise a walk of the folder. */
export function listFiles(root) {
  let viaGit = false;
  let files = [];
  try {
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    if (realpathSync(top) === realpathSync(root)) {
      files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { cwd: root, maxBuffer: 64 << 20 })
        .toString()
        .split("\0")
        .filter(Boolean)
        .filter((f) => !f.split("/").some((part) => SKIP_DIRS.has(part)));
      viaGit = true;
    }
  } catch {
    /* not a git repo, or git isn't installed: walk instead */
  }
  if (!viaGit) files = walk(root);
  /* .env files are usually git-ignored; read their names (never print values). */
  for (const f of readdirSafe(root)) if (isEnvFile(f) && !files.includes(f)) files.push(f);
  return { files: files.filter((f) => existsSync(join(root, f))), viaGit };
}

function readdirSafe(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/** Comment-free text of code and markup files; other files as they are. */
function makeCodeReader(read) {
  const cache = new Map();
  return (rel) => {
    if (cache.has(rel)) return cache.get(rel);
    const t = read(rel);
    const ext = extname(rel).toLowerCase();
    const out = t == null ? null : CODE_EXT.has(ext) || STYLE_EXT.has(ext) ? blankComments(t) : MARKUP_EXT.has(ext) ? blankComments(t, true) : t;
    cache.set(rel, out);
    return out;
  };
}

function makeReader(root) {
  const cache = new Map();
  return (rel) => {
    if (cache.has(rel)) return cache.get(rel);
    let text = null;
    try {
      const full = join(root, rel);
      const st = statSync(full);
      if (st.isFile() && st.size <= MAX_BYTES && (TEXT_EXT.has(extname(rel).toLowerCase()) || isEnvFile(rel))) {
        text = readFileSync(full, "utf8");
        if (text.includes("\u0000")) text = null;
      }
    } catch {
      text = null;
    }
    cache.set(rel, text);
    return text;
  };
}

const lineAt = (text, index) => text.slice(0, index).split("\n").length;

/** The text with comments blanked out (newlines kept, so line numbers still
 *  match). Strings are skipped over so "https://" and "src/**" survive. */
export function blankComments(text, html = false) {
  let out = "";
  let i = 0;
  const n = text.length;
  const blank = (s) => s.replace(/[^\n]/g, " ");
  while (i < n) {
    const c = text[i];
    if (html && text.startsWith("<!--", i)) {
      const end = text.indexOf("-->", i + 4);
      const stop = end < 0 ? n : end + 3;
      out += blank(text.slice(i, stop));
      i = stop;
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end < 0 ? n : end + 2;
      out += blank(text.slice(i, stop));
      i = stop;
    } else if (c === "/" && text[i + 1] === "/" && (i === 0 || /[\s;,(){}]/.test(text[i - 1]))) {
      let j = i;
      while (j < n && text[j] !== "\n") j++;
      out += blank(text.slice(i, j));
      i = j;
    } else if (!html && (c === "'" || c === '"' || c === "`")) {
      let j = i + 1;
      while (j < n && text[j] !== c) {
        if (text[j] === "\\") j++;
        else if (c !== "`" && text[j] === "\n") break;
        j++;
      }
      out += text.slice(i, j + 1);
      i = j + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Lines that are comments, so a comment naming a pattern isn't a hit. */
function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("<!--") || t.startsWith("#") || t.startsWith("--");
}

/** Every match of re in text that isn't on a comment line, with its line. */
function hits(text, re) {
  const out = [];
  const lines = text.split("\n");
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  for (const m of text.matchAll(g)) {
    const line = lineAt(text, m.index);
    if (isCommentLine(lines[line - 1] ?? "")) continue;
    out.push({ m, line, text: (lines[line - 1] ?? "").trim() });
  }
  return out;
}

/* Where code runs. A file that may end up in the browser is the one that
   matters for secrets and personal data. */
function isServerPath(rel) {
  return (
    /(^|\/)(api|server|scripts|supabase|migrations|functions|netlify|edge-functions|tools)\//.test(rel) ||
    /(^|\/)route\.[cm]?[jt]sx?$/.test(rel) ||
    /(^|\/)(middleware|proxy|instrumentation)\.[cm]?[jt]s$/.test(rel) ||
    /\.(server|config)\.[cm]?[jt]sx?$/.test(rel) ||
    /(^|\/)next\.config\./.test(rel) ||
    /(^|\/)(vite|astro|svelte|nuxt|tailwind|postcss|eslint|playwright|vitest)\.config\./.test(rel)
  );
}

function isClientPath(rel, text) {
  if (isTestPath(rel) || isServerPath(rel)) return false;
  if (/(^|\/)(public|static)\//.test(rel)) return true;
  if (MARKUP_EXT.has(extname(rel))) return true;
  if (text && /^\s*["']use client["']/m.test(text)) return true;
  if (text && /^\s*import\s+["']server-only["']/m.test(text)) return false;
  if (/(^|\/)(src|components|app|pages|lib|hooks|js)\//.test(rel) && CODE_EXT.has(extname(rel))) return true;
  return CODE_EXT.has(extname(rel)) && !rel.includes("/");
}

/* Resolve the repo's own imports (./x, ../x, @/x, ~/x) so a check done in a
   helper the route imports is seen. Two levels deep is enough for the
   "route -> lib/auth -> lib/supabase" shape these apps use. */
function localImports(root, rel, text) {
  const out = [];
  for (const m of text.matchAll(/(?:from\s+|import\s*\(\s*|require\(\s*)["']((?:\.{1,2}|@|~)\/[^"']+)["']/g)) {
    let spec = m[1];
    let base;
    if (spec.startsWith("@/") || spec.startsWith("~/")) {
      const stem = spec.slice(2);
      base = existsSync(join(root, "src", stem.split("/")[0])) ? join("src", stem) : stem;
    } else base = join(dirname(rel), spec);
    for (const cand of [base, ...[".ts", ".tsx", ".js", ".mjs", ".jsx", ".cjs"].map((e) => base + e), ...["index.ts", "index.js", "index.tsx"].map((i) => join(base, i))]) {
      const norm = cand.split(sep).join("/");
      try {
        if (statSync(join(root, norm)).isFile()) {
          out.push(norm);
          break;
        }
      } catch {
        /* try the next extension */
      }
    }
  }
  return out;
}

function withImports(root, read, rel, depth = 2) {
  const seen = new Set([rel]);
  let frontier = [rel];
  for (let d = 0; d < depth; d++) {
    const next = [];
    for (const f of frontier) {
      const t = read(f);
      if (!t) continue;
      for (const i of localImports(root, f, t)) if (!seen.has(i)) {
        seen.add(i);
        next.push(i);
      }
    }
    frontier = next;
  }
  return [...seen].map((f) => read(f) ?? "").join("\n");
}

/* ------------------------------------------------------------------ */
/* Versions                                                            */
/* ------------------------------------------------------------------ */

export function parseVersion(v) {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(String(v ?? ""));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
export function cmpVersion(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}
const inRange = (v, [lo, hi]) => cmpVersion(v, lo) >= 0 && cmpVersion(v, hi) < 0;

/* Next.js advisories this script knows about, as of Nov 2026. Each range is
   [first affected, first fixed). npm audit (below) is the up-to-date list;
   this table is here so the worst ones are caught with no network. */
export const NEXT_ADVISORIES = [
  {
    id: "CVE-2025-29927",
    title: "Middleware can be skipped with one request header (x-middleware-subrequest)",
    severity: "Critical",
    needs: "middleware",
    ranges: [["11.1.4", "12.3.5"], ["13.0.0", "13.5.9"], ["14.0.0", "14.2.25"], ["15.0.0", "15.2.3"]],
    who: "Anyone. Sending the header makes Next skip middleware, so whatever the middleware guards (sign-in, roles, redirects) is open.",
  },
  {
    id: "CVE-2025-66478 (React2Shell, CVE-2025-55182)",
    title: "Server Components can be made to run code on the server",
    severity: "Critical",
    needs: "app",
    ranges: [["15.0.0", "15.0.5"], ["15.1.0", "15.1.9"], ["15.2.0", "15.2.6"], ["15.3.0", "15.3.6"], ["15.4.0", "15.4.8"], ["15.5.0", "15.5.7"], ["16.0.0", "16.0.7"]],
    who: "Anyone who can reach the site. One crafted request runs their code on the server, with its environment variables.",
  },
  {
    id: "CVE-2025-55184 / CVE-2025-55183 / CVE-2025-67779",
    title: "Server Components can be made to hang, or to send back server function source",
    severity: "High",
    needs: "app",
    ranges: [["13.3.0", "14.2.35"], ["15.0.0", "15.0.7"], ["15.1.0", "15.1.11"], ["15.2.0", "15.2.8"], ["15.3.0", "15.3.8"], ["15.4.0", "15.4.10"], ["15.5.0", "15.5.9"], ["16.0.0", "16.0.10"]],
    who: "Anyone. A crafted request ties up the server or returns the code of a server action.",
  },
  {
    id: "CVE-2024-51479",
    title: "Middleware sign-in can be skipped for pages at the top of a base path",
    severity: "High",
    needs: "middleware",
    ranges: [["9.5.5", "14.2.15"]],
    who: "Anyone, on apps that use basePath and check sign-in in middleware.",
  },
  {
    id: "CVE-2024-34351",
    title: "Server Actions can be made to fetch other addresses (SSRF through the Host header)",
    severity: "High",
    needs: "app",
    ranges: [["13.4.0", "14.1.1"]],
    who: "Anyone, on self-hosted apps with a Server Action that redirects to a relative path.",
  },
  {
    id: "CVE-2024-46982",
    title: "Pages can be cached with the wrong content (cache poisoning)",
    severity: "High",
    needs: null,
    ranges: [["13.5.1", "13.5.7"], ["14.0.0", "14.2.10"]],
    who: "Anyone, on Pages Router routes that aren't dynamic.",
  },
  {
    id: "CVE-2025-57822",
    title: "Middleware that passes request headers to next() can be made to fetch other addresses",
    severity: "Medium",
    needs: "middleware",
    ranges: [["0.9.9", "14.2.32"], ["15.0.0", "15.4.7"]],
    who: "Anyone, on self-hosted apps whose middleware calls next() with the request's headers.",
  },
];

function installedVersion(root, read, name) {
  try {
    const pkg = JSON.parse(readFileSync(join(root, "node_modules", name, "package.json"), "utf8"));
    if (pkg.version) return { version: pkg.version, from: `node_modules/${name}` };
  } catch {
    /* not installed */
  }
  const lock = read("package-lock.json");
  if (lock) {
    try {
      const v = JSON.parse(lock).packages?.[`node_modules/${name}`]?.version;
      if (v) return { version: v, from: "package-lock.json" };
    } catch {
      /* unreadable lockfile */
    }
  }
  const pnpm = read("pnpm-lock.yaml");
  if (pnpm) {
    const m = new RegExp(`\\n\\s+['"]?${name.replace("/", "\\/")}['"]?:\\s*\\n\\s+specifier:[^\\n]*\\n\\s+version:\\s*([\\d.]+)`).exec(pnpm);
    if (m) return { version: m[1], from: "pnpm-lock.yaml" };
  }
  const pkg = read("package.json");
  if (pkg) {
    try {
      const j = JSON.parse(pkg);
      const spec = j.dependencies?.[name] ?? j.devDependencies?.[name];
      if (spec && parseVersion(spec)) return { version: parseVersion(spec).join("."), from: "package.json (a range, so the installed version may be newer)" };
    } catch {
      /* unreadable package.json */
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Repo checks                                                         */
/* ------------------------------------------------------------------ */

const AUTH_SIGNAL =
  /\b(getUser|getSession|getServerSession|getToken|currentUser|requireUser|requireAuth|requireRole|requireAdmin|requireFamily|isAdmin|my_role|is_family|is_household|jwtVerify|timingSafeEqual|tokenIsValid|verifySession|verifyToken|CRON_SECRET|createServerClient|exchangeCodeForSession)\b|\bauth\(\)|jwt\.verify\(|supabase\.auth\.|headers\.get\(\s*["']authorization["']|headers\.authorization|\.cookies\.get\(|cookies\(\)\.get\(|readCookie\(/;
const RATE_SIGNAL = /rate.?limit|ratelimit|limiter|throttle|too.?many|\b429\b|attempts|blockedFor|PER_ADDRESS|@upstash\/ratelimit/i;
const EMAIL_SIGNAL = /api\.resend\.com|from\s+["']resend["']|new\s+Resend\(|nodemailer|@sendgrid|postmark|mailgun|api\.brevo|sendEmail\(|sendMail\(|emails\.send\(/;
const SMS_SIGNAL = /twilio|api\.twilio\.com|vonage|nexmo|messagebird|sendSms\(|sendSMS\(|textlocal|plivo/i;
const WRITE_SIGNAL = /\.insert\(|\.upsert\(|\bput\(|INSERT\s+INTO|(?:prisma|db)\.\w+\.create(?:Many)?\(/;

function routeFiles(files, hasNext) {
  return files.filter((f) => {
    if (isTestPath(f) || !CODE_EXT.has(extname(f))) return false;
    if (/(^|\/)app\/(.+\/)?route\.[cm]?[jt]s$/.test(f)) return true;
    if (/(^|\/)pages\/api\//.test(f)) return true;
    /* Vercel functions: api/*.js at the root. Files starting _ are helpers. */
    if (!hasNext && /^api\//.test(f) && !basename(f).startsWith("_")) return true;
    return false;
  });
}

const routePath = (f) =>
  "/" +
  f
    .replace(/^src\//, "")
    .replace(/^app\//, "")
    .replace(/^pages\//, "")
    .replace(/\/route\.[cm]?[jt]s$/, "")
    .replace(/\.[cm]?[jt]s$/, "")
    .replace(/\/index$/, "")
    .replace(/\([^)]*\)\//g, "");

function checkNext(ctx) {
  const { root, read, files, report } = ctx;
  const v = installedVersion(root, read, "next");
  if (!v) return;
  ctx.hasNext = true;
  const hasMiddleware = !!ctx.middleware;
  const hasApp = files.some((f) => /^(src\/)?app\/(.+\/)?(page|layout|route)\.[cm]?[jt]sx?$/.test(f));
  let any = false;
  for (const adv of NEXT_ADVISORIES) {
    if (!adv.ranges.some((r) => inRange(v.version, r))) continue;
    if (adv.needs === "app" && !hasApp) continue;
    const applies = adv.needs !== "middleware" || hasMiddleware;
    any = true;
    add(report, "finding", {
      id: "next-advisory",
      severity: applies ? adv.severity : "Low",
      title: `Next.js ${v.version}: ${adv.title} (${adv.id})`,
      where: [v.from, adv.needs === "middleware" && ctx.middleware ? ctx.middleware : null],
      proof: `Next.js ${v.version} is in an affected range (${adv.ranges.map((r) => `${r[0]} to before ${r[1]}`).join(", ")}).${applies ? "" : " This app has no middleware, so it doesn't apply today."}`,
      who: adv.who,
      fix: `Update Next.js to the newest release of its line (npm install next@${parseVersion(v.version)[0]}) and redeploy.`,
    });
  }
  if (!any) report.fine.push(`Next.js ${v.version} (${v.from}) isn't in any range this script knows about. npm audit has the full list.`);
}

function checkMiddlewareOnlyAuth(ctx) {
  const { root, read, files, report } = ctx;
  const mw = ctx.middleware;
  if (!mw) return;
  const mwText = read(mw) ?? "";
  if (!AUTH_SIGNAL.test(mwText) && !/password|login|sign.?in/i.test(mwText)) return;
  const routes = routeFiles(files, ctx.hasNext);
  if (!routes.length) return;
  const bare = routes.filter((f) => !AUTH_SIGNAL.test(withImports(root, read, f)));
  /* Middleware that names particular paths guards those; middleware that
     names none guards everything its matcher covers. */
  const mwPlain = mwText.replace(/\\/g, "");
  const named = (f) => {
    const p = routePath(f);
    return mwPlain.includes(p) || mwPlain.includes(p.slice(1));
  };
  const namesAny = routes.some(named);
  if (!namesAny && bare.length === routes.length) {
    add(report, "finding", {
      id: "middleware-only-auth",
      severity: "High",
      title: "Sign-in is only checked in middleware",
      where: [mw, ...bare],
      proof: `${mw} checks who's signed in, but none of the ${routes.length} API routes checks again, in its own code or in anything it imports.`,
      who: "Anyone, if the middleware is ever skipped: a Next.js bug like CVE-2025-29927, a matcher that misses a path, or a route that's moved.",
      fix: "Have each route check who's asking itself (getUser and the role) as well as the middleware, and let the database's policies be the last check.",
    });
    return;
  }
  for (const f of bare) {
    const p = routePath(f);
    if (named(f))
      add(report, "finding", {
        id: "middleware-only-auth",
        severity: "Medium",
        title: `Only the middleware guards ${p}`,
        where: [f, mw],
        proof: `${mw} names ${p} and checks access for it, but ${f} has no check of its own, in its code or in anything it imports.`,
        who: "Anyone, if the middleware is skipped or its path pattern changes.",
        fix: `Repeat the check inside ${f}, so it refuses a request that hasn't been through the middleware.`,
      });
    else if (!namesAny)
      add(report, "check", {
        id: "route-without-auth",
        severity: "Low",
        title: `${p} has no sign-in check of its own`,
        where: [f],
        proof: "No getUser, session, role, secret or cookie check in the file or what it imports.",
        who: "Anyone, if it's meant to be private and the middleware misses it.",
        fix: "Confirm it's meant to be public. If not, add a check in the route.",
      });
  }
}

function checkGoogleFonts(ctx) {
  const { files, read, report } = ctx;
  const where = [];
  for (const f of files) {
    const ext = extname(f).toLowerCase();
    if (isTestPath(f) || !(CODE_EXT.has(ext) || MARKUP_EXT.has(ext) || STYLE_EXT.has(ext))) continue;
    const t = read(f);
    if (!t || !t.includes("fonts.g")) continue;
    for (const h of hits(t, /fonts\.(googleapis|gstatic)\.com/)) {
      /* A Content-Security-Policy that allows the host isn't a load. */
      if (/-src\b/.test(h.text)) continue;
      where.push(`${f}:${h.line}`);
    }
  }
  if (where.length)
    add(report, "finding", {
      id: "google-fonts",
      severity: "Medium",
      title: "Fonts load from Google's servers",
      where,
      proof: "The page asks fonts.googleapis.com or fonts.gstatic.com for its fonts, which sends every visitor's IP address to Google before they've agreed to anything.",
      who: "Legal risk, not a hacker. A Munich court fined a site owner EUR 100 for this under GDPR (LG Munchen I, 3 O 17493/20, 20 Jan 2022), and letters demanding payment followed.",
      fix: "Serve the font files from the site itself (next/font does this at build time, or download the files into the repo) and drop the Google URLs from the CSP.",
    });
  else if (files.some((f) => /next\/font\/google/.test(read(f) ?? ""))) report.fine.push("Fonts come through next/font, which serves them from the site itself.");
}

/* Script hosts that have been taken over and used to serve malware. Any
   other outside host is listed for a person to check. */
export const BAD_SCRIPT_HOSTS = /(^|\.)(polyfill\.io|polyfill\.com|polyfillcache\.com|bootcss\.com|bootcdn\.net|staticfile\.org|staticfile\.net|unionadjs\.com|xhsbpza\.com|union\.macoms\.la|newcrbpc\.com)$/i;

function scriptHosts(text) {
  const out = [];
  for (const m of text.matchAll(/<script\b[^>]*?\bsrc\s*=\s*\{?\s*["'`]((?:https?:)?\/\/[^"'`\s>]+)["'`][^>]*>/gi)) out.push({ url: m[1], tag: m[0], index: m.index });
  for (const m of text.matchAll(/<Script\b[^>]*?\bsrc\s*=\s*\{?\s*["'`]((?:https?:)?\/\/[^"'`\s>]+)["'`]/g)) out.push({ url: m[1], tag: m[0], index: m.index });
  if (/createElement\(\s*["']script["']\s*\)/.test(text))
    for (const m of text.matchAll(/\.src\s*=\s*["'`]((?:https?:)?\/\/[^"'`\s]+)["'`]/g)) out.push({ url: m[1], tag: m[0], index: m.index });
  return out
    .map((s) => {
      try {
        return { ...s, host: new URL(s.url.startsWith("//") ? "https:" + s.url : s.url).hostname };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function checkThirdPartyScripts(ctx) {
  const { files, read, report } = ctx;
  const bad = [];
  const other = new Map();
  for (const f of files) {
    const ext = extname(f).toLowerCase();
    if (isTestPath(f) || !(CODE_EXT.has(ext) || MARKUP_EXT.has(ext))) continue;
    const t = read(f);
    if (!t || !/script/i.test(t)) continue;
    for (const s of scriptHosts(t)) {
      const where = `${f}:${lineAt(t, s.index)}`;
      if (BAD_SCRIPT_HOSTS.test(s.host)) bad.push({ where, host: s.host });
      else {
        const e = other.get(s.host) ?? { where: [], sri: true };
        e.where.push(where);
        if (!/\bintegrity\s*=/.test(s.tag)) e.sri = false;
        other.set(s.host, e);
      }
    }
  }
  if (bad.length)
    add(report, "finding", {
      id: "compromised-script-host",
      severity: "Critical",
      title: `Loads a script from ${[...new Set(bad.map((b) => b.host))].join(", ")}`,
      where: bad.map((b) => b.where),
      proof: "That host was taken over in 2024 and served malware to the sites that used it (the polyfill.io attack).",
      who: "Whoever controls that host now. Their script runs on every page with full access to what visitors see and type.",
      fix: "Remove the script. Modern browsers don't need polyfill.io; if something does, install it from npm and bundle it.",
    });
  for (const [host, e] of other)
    add(report, "check", {
      id: "third-party-script",
      severity: "Low",
      title: `Runs a script from ${host}`,
      where: e.where,
      proof: `A script from another company runs with the page's full access${e.sri ? " (it has an integrity hash, so a changed file won't run)" : ", with no integrity hash"}.`,
      who: "Whoever runs or takes over that host.",
      fix: "Keep it only if it's needed. Pin a version with an integrity hash, or serve a copy from the site.",
    });
}

function checkSourceMaps(ctx) {
  const { files, read, report } = ctx;
  for (const f of files) {
    const b = basename(f);
    const t = read(f);
    if (!t) continue;
    if (/^next\.config\./.test(b))
      for (const h of hits(t, /productionBrowserSourceMaps\s*:\s*true/))
        add(report, "finding", {
          id: "source-maps",
          severity: "Medium",
          title: "The production build publishes source maps",
          where: `${f}:${h.line}`,
          proof: "productionBrowserSourceMaps is true, so the original source of every client file is served next to it.",
          who: "Anyone with browser dev tools. It makes finding the next bug much easier and shows comments and internal names.",
          fix: "Remove productionBrowserSourceMaps, or upload maps to the error tracker and don't deploy them.",
        });
    if (/^(vite|astro|svelte|nuxt)\.config\./.test(b)) {
      for (const h of hits(t, /sourcemap\s*:\s*(true|["']inline["'])/))
        add(report, "finding", {
          id: "source-maps",
          severity: "Medium",
          title: "The production build publishes source maps",
          where: `${f}:${h.line}`,
          proof: `build.sourcemap is ${h.m[1]}, so the original source is deployed with the site.`,
          who: "Anyone with browser dev tools.",
          fix: "Set build.sourcemap to false (or remove it) for production.",
        });
      for (const h of hits(t, /sourcemap\s*:\s*["']hidden["']/))
        add(report, "check", {
          id: "source-maps-hidden",
          severity: "Low",
          title: "Hidden source maps are still deployed",
          where: `${f}:${h.line}`,
          proof: "'hidden' drops the comment pointing at the map but still writes the .map files into the build, and they're served if someone guesses the name.",
          who: "Anyone who tries <file>.js.map.",
          fix: "Upload the maps to the error tracker and delete them from the build before it's deployed.",
        });
    }
  }
  const maps = files.filter((f) => /(^|\/)(public|static)\/.*\.js\.map$/.test(f));
  if (maps.length)
    add(report, "check", {
      id: "source-maps-public",
      severity: "Low",
      title: "Source maps in the public folder",
      where: maps,
      proof: "Everything in public/ is served as it is.",
      who: "Anyone who opens the URL.",
      fix: "Delete them unless they're meant to be public.",
    });
}

/* Secret patterns. Each is specific enough that a match is very likely a
   real key; anything vaguer would bury the real ones. */
export const SECRET_PATTERNS = [
  { name: "Supabase secret key", re: /\bsb_secret_[A-Za-z0-9_-]{20,}/g, severity: "Critical" },
  { name: "Stripe live secret key", re: /\b[sr]k_live_[0-9A-Za-z]{20,}/g, severity: "Critical" },
  { name: "private key", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY( BLOCK)?-----/g, severity: "Critical" },
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/g, severity: "High" },
  { name: "GitHub token", re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})/g, severity: "High" },
  { name: "Anthropic API key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g, severity: "High" },
  { name: "OpenAI API key", re: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/g, severity: "High" },
  { name: "Resend API key", re: /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/g, severity: "High" },
  { name: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{20,}/g, severity: "High" },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g, severity: "Medium" },
];
const PUBLIC_ENV_PREFIX = /^(NEXT_PUBLIC_|VITE_|PUBLIC_|REACT_APP_|EXPO_PUBLIC_|NUXT_PUBLIC_|GATSBY_)/;
const SECRET_NAME = /(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|PASSWD|TOKEN|WEBHOOK|SIGNING)/;

/** A Supabase service_role key is a JWT whose payload says so. */
export function jwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return payload?.role ?? null;
  } catch {
    return null;
  }
}

function checkSecrets(ctx) {
  const { files, raw: read, report } = ctx;
  ctx.secretsSeen = new Set();
  for (const f of files) {
    const t = read(f);
    if (!t) continue;
    const test = isTestPath(f);
    const env = isEnvFile(f);
    const client = !env && isClientPath(f, t);
    const tracked = !ctx.untracked?.has(f);
    const found = [];
    for (const p of SECRET_PATTERNS) for (const m of t.matchAll(p.re)) found.push({ name: p.name, value: m[0], index: m.index, severity: p.severity });
    for (const m of t.matchAll(/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g))
      if (jwtRole(m[0]) === "service_role") found.push({ name: "Supabase service_role key", value: m[0], index: m.index, severity: "Critical" });
    /* Long hex strings assigned to something called a secret, token or key.
       Names with public, publishable, anon or site in them are meant to be
       seen (Supabase's anon key, a reCAPTCHA site key). */
    for (const m of t.matchAll(/\b(\w*(?:secret|token|api_?key|apikey|password|passwd|private_?key)\w*)["']?\s*[:=]\s*["'`]([a-f0-9]{32,})["'`]/gi))
      if (!/public|publishable|anon|site_?key|hash|sha|integrity|commit/i.test(m[1])) found.push({ name: `long hex value in ${m[1]}`, value: m[2], index: m.index, severity: "High" });
    for (const s of found) {
      if (env && !tracked) continue; /* a local .env.local is where secrets belong */
      ctx.secretsSeen.add(s.value);
      const where = `${f}:${lineAt(t, s.index)}`;
      if (test || isEnvExample(f)) {
        add(report, "check", {
          id: "secret-in-test",
          severity: "Low",
          title: `Something shaped like a ${s.name} in a test or example file`,
          where,
          proof: `${redact(s.value)}. Probably made up for the test; check it isn't a real one.`,
          who: "Anyone who can read the repo, if it's real.",
          fix: "If it's real, revoke it and use an obviously fake value.",
        });
        continue;
      }
      add(report, "finding", {
        id: client ? "secret-in-client" : "secret-in-repo",
        severity: client ? (s.severity === "Medium" ? "Medium" : "Critical") : s.severity === "Critical" ? "High" : s.severity,
        title: client ? `A ${s.name} in code that reaches the browser` : `A ${s.name} committed to the repo`,
        where,
        proof: `${redact(s.value)}${client ? ". The file is served to, or bundled for, the browser." : "."}`,
        who: client
          ? "Anyone who opens the site and looks at its JavaScript. With a server key they can do whatever the server can."
          : "Anyone who can read the repo now or later (collaborators, a leak, a future public repo).",
        fix: "Revoke the key at the provider first, then move the new one into an environment variable on the server. Removing it from the code doesn't un-leak it.",
      });
    }
    /* Variables named as secrets but given a prefix that bundles them for
       the browser. The name alone proves it; values are never printed. */
    if (env) {
      for (const h of hits(t, /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/m)) {
        const name = h.m[1];
        if (PUBLIC_ENV_PREFIX.test(name) && SECRET_NAME.test(name.replace(PUBLIC_ENV_PREFIX, "")))
          add(report, "finding", {
            id: "public-env-secret",
            severity: "High",
            title: `${name} would be bundled into the browser`,
            where: `${f}:${h.line}`,
            proof: `Its prefix tells the build to put the value in the client JavaScript, and its name says it's secret.`,
            who: "Anyone who opens the site's JavaScript.",
            fix: "Rename it without the public prefix, read it only in server code, and rotate the value if it's been deployed.",
          });
      }
      if (tracked && !isEnvExample(f) && /^\s*[A-Z][A-Z0-9_]*\s*=\s*\S+/m.test(t) && ctx.viaGit)
        add(report, "finding", {
          id: "env-committed",
          severity: "High",
          title: `${f} is committed to git`,
          where: f,
          proof: "An environment file with values in it is tracked by git.",
          who: "Anyone who can read the repo, now or from its history.",
          fix: "git rm --cached it, add it to .gitignore, and rotate every value in it.",
        });
    } else if (CODE_EXT.has(extname(f)) && !test) {
      for (const h of hits(t, /(?:process\.env|import\.meta\.env)\.((?:NEXT_PUBLIC_|VITE_|PUBLIC_|REACT_APP_|EXPO_PUBLIC_)[A-Z0-9_]+)/)) {
        if (SECRET_NAME.test(h.m[1].replace(PUBLIC_ENV_PREFIX, "")))
          add(report, "finding", {
            id: "public-env-secret",
            severity: "High",
            title: `${h.m[1]} is read in code and would be bundled into the browser`,
            where: `${f}:${h.line}`,
            proof: "The public prefix puts the value into the client JavaScript, and the name says it's secret.",
            who: "Anyone who opens the site's JavaScript.",
            fix: "Rename it without the public prefix and read it only in server code.",
          });
      }
    }
  }
}

/** Secrets that were committed once and taken out later. Git keeps them. */
function checkHistory(ctx) {
  const { root, report } = ctx;
  if (!ctx.viaGit || ctx.opts.history === false) {
    report.skipped.push(ctx.viaGit ? "git history: turned off with --no-history" : "git history: the folder isn't the top of a git repo");
    return;
  }
  const strong = SECRET_PATTERNS.filter((p) => p.severity !== "Medium");
  const posix = "sb_secret_[A-Za-z0-9_-]{20}|[sr]k_live_[0-9A-Za-z]{20}|-----BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40}|sk-ant-[A-Za-z0-9_-]{20}|re_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16}|xox[baprs]-[A-Za-z0-9-]{20}";
  const r = spawnSync("git", ["log", "--all", "-p", "--no-color", "--unified=0", "--format=commit %H", "-G", posix, "--", ".", ":(exclude).claude", ":(exclude).agents", ":(exclude)node_modules"], {
    cwd: root,
    maxBuffer: 256 << 20,
    timeout: 120_000,
  });
  if (r.status !== 0) {
    report.skipped.push(`git history: git log failed (${(r.stderr?.toString() || r.error?.message || "").trim().slice(0, 120)})`);
    return;
  }
  let commit = "";
  let file = "";
  const seen = new Map();
  for (const line of r.stdout.toString().split("\n")) {
    if (line.startsWith("commit ")) commit = line.slice(7, 19);
    else if (line.startsWith("+++ b/")) file = line.slice(6);
    else if (line.startsWith("--- a/") && file === "") file = line.slice(6);
    else if (line.startsWith("+") && !line.startsWith("+++")) {
      if (isTestPath(file)) continue;
      for (const p of strong)
        for (const m of line.matchAll(new RegExp(p.re.source, "g"))) {
          if (ctx.secretsSeen?.has(m[0]) || seen.has(m[0])) continue;
          seen.set(m[0], { name: p.name, commit, file });
        }
    }
    if (line.startsWith("diff --git")) file = "";
  }
  for (const [value, s] of seen)
    add(report, "finding", {
      id: "secret-in-history",
      severity: "High",
      title: `A ${s.name} is still in the git history`,
      where: `${s.file} in commit ${s.commit}`,
      proof: `${redact(value)} was committed and later removed. Every clone still has it.`,
      who: "Anyone who can read the repo or any copy of it.",
      fix: "Revoke the key at the provider. Rewriting history is optional once the key is dead.",
    });
  if (!seen.size) report.fine.push("No known key shapes in the git history.");
}

/* ---- SQL ---------------------------------------------------------- */

/** Splits SQL into statements, respecting strings, quoted names, comments
 *  and dollar-quoted bodies. skel is the statement with comments taken out
 *  and function bodies replaced, so patterns only see the declarations. */
export function splitSql(text) {
  const out = [];
  let i = 0;
  let start = 0;
  let skel = "";
  let startLine = 1;
  let line = 1;
  const n = text.length;
  const push = () => {
    const raw = text.slice(start, i).trim();
    if (raw) out.push({ sql: raw, skel: skel.trim(), line: startLine });
    skel = "";
  };
  while (i < n) {
    const c = text[i];
    if (c === "\n") line++;
    if (c === "-" && text[i + 1] === "-") {
      while (i < n && text[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end < 0 ? n : end + 2;
      line += (text.slice(i, stop).match(/\n/g) ?? []).length;
      i = stop;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < n) {
        if (text[j] === c && text[j + 1] === c) j += 2;
        else if (text[j] === c) break;
        else j++;
      }
      skel += text.slice(i, j + 1);
      line += (text.slice(i, j + 1).match(/\n/g) ?? []).length;
      i = j + 1;
      continue;
    }
    if (c === "$") {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(text.slice(i, i + 64));
      if (m) {
        const end = text.indexOf(m[0], i + m[0].length);
        const stop = end < 0 ? n : end + m[0].length;
        skel += " $body$ ";
        line += (text.slice(i, stop).match(/\n/g) ?? []).length;
        i = stop;
        continue;
      }
    }
    if (c === ";") {
      push();
      i++;
      start = i;
      startLine = line;
      continue;
    }
    if (!skel.trim() && /\s/.test(c)) startLine = line + (c === "\n" ? 0 : 0);
    skel += c;
    i++;
  }
  push();
  return out;
}

const NAME = String.raw`((?:"[^"]+"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"[^"]+"|[A-Za-z_][\w$]*))?)`;
function qualify(name) {
  const parts = name.split(/\s*\.\s*/).map((p) => p.replace(/^"|"$/g, "").toLowerCase());
  return parts.length === 1 ? `public.${parts[0]}` : parts.join(".");
}

/** The text inside the parentheses that open at or after index. */
function balanced(s, index) {
  const open = s.indexOf("(", index);
  if (open < 0) return null;
  let depth = 0;
  for (let j = open; j < s.length; j++) {
    if (s[j] === "(") depth++;
    else if (s[j] === ")" && --depth === 0) return s.slice(open + 1, j);
  }
  return null;
}
const bareTrue = (expr) => expr != null && /^\(*\s*true\s*\)*$/i.test(expr.trim());

/** The top-level comma-separated values of a VALUES (...) tuple. */
function tupleValues(s) {
  const out = [];
  let depth = 0;
  let cur = "";
  let q = null;
  for (const ch of s) {
    if (q) {
      cur += ch;
      if (ch === q) q = null;
      continue;
    }
    if (ch === "'" || ch === '"') q = ch;
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function analyseSql(sources) {
  const tables = new Map();
  const rls = new Set();
  const revoked = new Set();
  const policies = new Map();
  const funcs = new Map();
  const views = new Map();
  const buckets = [];
  for (const { file, text } of sources) {
    for (const st of splitSql(text)) {
      const s = st.skel.replace(/\s+/g, " ");
      const where = `${file}:${st.line}`;
      let m;
      if ((m = new RegExp(String.raw`^create (?:unlogged |temp(?:orary)? )?table (?:if not exists )?${NAME}`, "i").exec(s))) {
        const t = qualify(m[1]);
        if (t.startsWith("public.") && !/^create temp/i.test(s)) tables.set(t, where);
      } else if ((m = new RegExp(String.raw`^alter table (?:if exists )?(?:only )?${NAME} .*\benable row level security`, "i").exec(s))) rls.add(qualify(m[1]));
      else if ((m = new RegExp(String.raw`^drop table (?:if exists )?${NAME}`, "i").exec(s))) tables.delete(qualify(m[1]));
      else if ((m = new RegExp(String.raw`^alter table (?:if exists )?${NAME} rename to ${NAME}`, "i").exec(s))) {
        const from = qualify(m[1]);
        const to = qualify(m[1].includes(".") ? m[1].split(".")[0] + "." + m[2] : m[2]);
        if (tables.has(from)) {
          tables.set(to, tables.get(from));
          tables.delete(from);
        }
        if (rls.has(from)) rls.add(to);
      } else if ((m = new RegExp(String.raw`^revoke (?:all|select)[\w, ]* on (?:table )?${NAME} from (.+)$`, "i").exec(s))) {
        if (/\banon\b/i.test(m[2]) && /\bauthenticated\b/i.test(m[2])) revoked.add(qualify(m[1]));
      } else if ((m = new RegExp(String.raw`^create policy ("[^"]+"|\w+) on ${NAME}(.*)$`, "i").exec(s))) {
        const rest = m[3];
        const cmd = (/\bfor (all|select|insert|update|delete)\b/i.exec(rest)?.[1] ?? "all").toLowerCase();
        const roles = (/\bto ([\w", ]+?)(?= using| with check|$)/i.exec(rest)?.[1] ?? "public").replace(/"/g, "").toLowerCase();
        const ui = rest.search(/\busing\s*\(/i);
        const wi = rest.search(/\bwith check\s*\(/i);
        policies.set(`${qualify(m[2])}|${m[1].replace(/"/g, "")}`, {
          table: qualify(m[2]),
          name: m[1].replace(/"/g, ""),
          cmd,
          roles,
          using: ui >= 0 ? balanced(rest, ui) : null,
          check: wi >= 0 ? balanced(rest, wi) : null,
          restrictive: /\bas restrictive\b/i.test(rest),
          where,
        });
      } else if ((m = new RegExp(String.raw`^drop policy (?:if exists )?("[^"]+"|\w+) on ${NAME}`, "i").exec(s))) policies.delete(`${qualify(m[2])}|${m[1].replace(/"/g, "")}`);
      else if ((m = new RegExp(String.raw`^create (?:or replace )?function ${NAME}\s*\(`, "i").exec(s))) {
        const name = qualify(m[1]);
        const prev = funcs.get(name);
        funcs.set(name, {
          where,
          definer: /\bsecurity definer\b/i.test(s),
          searchPath: /\bset search_path\b/i.test(s),
          revoked: prev?.revoked ?? false,
        });
      } else if ((m = new RegExp(String.raw`^alter function ${NAME}.*\bset search_path\b`, "i").exec(s))) {
        const f = funcs.get(qualify(m[1]));
        if (f) f.searchPath = true;
      } else if ((m = new RegExp(String.raw`^alter function ${NAME}.*\bsecurity invoker\b`, "i").exec(s))) {
        const f = funcs.get(qualify(m[1]));
        if (f) f.definer = false;
      } else if ((m = /^revoke (?:all|execute)[\w, ]* on functions? (.+) from (.+)$/i.exec(s))) {
        /* One revoke can name several functions: f(), g(text), h(). */
        if (/\b(public|anon)\b/i.test(m[2]))
          for (const n of m[1].matchAll(new RegExp(String.raw`${NAME}\s*\(`, "g"))) {
            const f = funcs.get(qualify(n[1]));
            if (f) f.revoked = true;
          }
      } else if ((m = new RegExp(String.raw`^create (?:or replace )?(?:temp(?:orary)? )?(materialized )?view (?:if not exists )?${NAME}(.*?) as `, "i").exec(s))) {
        const v = qualify(m[2]);
        if (v.startsWith("public.")) views.set(v, { where, materialized: !!m[1], invoker: /security_invoker\s*=?\s*(true|on|1)/i.test(m[3]) });
      } else if ((m = new RegExp(String.raw`^alter view ${NAME} set \(.*security_invoker\s*=?\s*(true|on|1)`, "i").exec(s))) {
        const v = views.get(qualify(m[1]));
        if (v) v.invoker = true;
      } else if ((m = new RegExp(String.raw`^drop (?:materialized )?view (?:if exists )?${NAME}`, "i").exec(s))) views.delete(qualify(m[1]));
      else if (/^insert into storage\.buckets\s*\(/i.test(s)) {
        const cols = tupleValues(balanced(s, 0) ?? "").map((c) => c.replace(/"/g, "").toLowerCase());
        const pi = cols.indexOf("public");
        const vi = s.search(/\bvalues\b/i);
        if (pi >= 0 && vi >= 0) {
          let rest = s.slice(vi);
          let k = 0;
          while (k < rest.length) {
            const tuple = balanced(rest, k);
            if (tuple == null) break;
            const vals = tupleValues(tuple);
            if (/^true$/i.test(vals[pi] ?? "")) buckets.push({ id: (vals[0] ?? "").replace(/'/g, ""), where });
            k = rest.indexOf("(", k) + tuple.length + 2;
            if (!/^\s*,/.test(rest.slice(k))) break;
          }
        }
      } else if (/^update storage\.buckets set .*\bpublic\s*=\s*true/i.test(s)) buckets.push({ id: /id\s*=\s*'([^']+)'/i.exec(s)?.[1] ?? "?", where });
    }
  }
  return { tables, rls, revoked, policies, funcs, views, buckets };
}

function sqlSources(ctx) {
  const { files, raw: read } = ctx;
  const sql = files
    .filter((f) => f.endsWith(".sql") && !isTestPath(f) && !/(^|\/)(history|archive|old|seeds?)\//.test(f))
    .filter((f) => /(^|\/)(supabase|migrations|db|database|sql)\//.test(f) || !f.includes("/"))
    .sort((a, b) => basename(a).localeCompare(basename(b)) || a.localeCompare(b));
  return sql.map((file) => ({ file, text: read(file) ?? "" }));
}

function checkSql(ctx) {
  const { report } = ctx;
  const sources = sqlSources(ctx);
  if (!sources.length) return;
  const a = analyseSql(sources);
  let open = 0;
  for (const [t, where] of a.tables) {
    if (a.rls.has(t)) continue;
    open++;
    add(report, a.revoked.has(t) ? "check" : "finding", {
      id: "table-without-rls",
      severity: a.revoked.has(t) ? "Low" : "Critical",
      title: `${t} has no row level security`,
      where,
      proof: `It's created in the public schema and no migration turns RLS on for it${a.revoked.has(t) ? " (access is revoked from anon and authenticated, which helps, but a later grant would undo it)" : ""}.`,
      who: "Anyone with the site's public Supabase key, which is in its JavaScript. They can read, change and delete every row through the REST API.",
      fix: `alter table ${t} enable row level security; then add named policies for exactly who needs it.`,
    });
  }
  const writes = new Set(["all", "insert", "update", "delete"]);
  for (const p of a.policies.values()) {
    if (p.restrictive) continue;
    const opens = (p.using != null && bareTrue(p.using)) || (p.check != null && bareTrue(p.check)) || (p.using == null && p.check == null);
    if (!opens) continue;
    const anyone = /\b(public|anon)\b/.test(p.roles);
    const signedIn = /\bauthenticated\b/.test(p.roles);
    if (!anyone && !signedIn) continue;
    const who = anyone ? "Anyone with the public key, signed in or not" : "Anyone who can sign in (with Google sign-in that's anyone with a Google account, unless sign-up is limited)";
    if (writes.has(p.cmd))
      add(report, "finding", {
        id: "policy-true",
        severity: anyone ? "High" : "Medium",
        title: `Policy "${p.name}" lets ${anyone ? "anyone" : "any signed-in account"} ${p.cmd === "all" ? "do anything to" : p.cmd} ${p.table}`,
        where: p.where,
        proof: `for ${p.cmd} to ${p.roles}, with the condition true.`,
        who: `${who}.`,
        fix: "Replace true with the real rule, such as auth.uid() = user_id or is_family(). If public inserts are the point (a contact form), keep insert-only and add a rate limit in front.",
      });
    else
      add(report, "check", {
        id: "policy-true-read",
        severity: anyone ? "Medium" : "Low",
        title: `Everyone ${anyone ? "" : "signed in "}can read ${p.table}`,
        where: p.where,
        proof: `Policy "${p.name}" is for select to ${p.roles}, with the condition true.`,
        who: `${who}. Fine for content that's meant to be public.`,
        fix: "Confirm every column in the table is meant to be public. If not, narrow the policy or move the private columns.",
      });
  }
  for (const b of a.buckets)
    add(report, "finding", {
      id: "public-bucket",
      severity: "Medium",
      title: `Storage bucket "${b.id}" is public`,
      where: b.where,
      proof: "public is true, so any file in it can be downloaded by anyone who has or guesses its URL, with no sign-in.",
      who: "Anyone with a link. If a select policy on storage.objects is also open, they can list every file too.",
      fix: "Make it private and hand out signed URLs, unless everything in it is meant for the public (product photos, say).",
    });
  for (const [name, f] of a.funcs) {
    if (!f.definer) continue;
    if (!f.searchPath)
      add(report, "finding", {
        id: "definer-search-path",
        severity: "Low",
        title: `${name} runs with its owner's rights but no fixed search_path`,
        where: f.where,
        proof: "security definer with no set search_path, so the names inside it are looked up wherever the caller's search_path points.",
        who: "Only someone who can create objects in the database, which on Supabase is you and the admin roles. It's the rule Supabase's own advisor flags.",
        fix: "Add set search_path = '' to the function and write every name with its schema (public.table).",
      });
    if (name.startsWith("public.") && !f.revoked)
      add(report, "check", {
        id: "definer-rpc",
        severity: "Low",
        title: `${name} can be called by anyone through the API`,
        where: f.where,
        proof: "A security definer function in public skips RLS and is callable at /rest/v1/rpc/ with the public key, unless execute is revoked.",
        who: "Anyone with the public key, if the function returns or changes data it shouldn't.",
        fix: "Read what it returns. If callers shouldn't use it directly, revoke execute from anon (and public), or move it out of the public schema.",
      });
  }
  for (const [v, info] of a.views)
    if (info.materialized)
      add(report, "check", {
        id: "materialized-view",
        severity: "Medium",
        title: `${v} is a materialized view in the public schema`,
        where: info.where,
        proof: "Materialized views have no RLS at all.",
        who: "Anyone with the public key, if select isn't revoked from anon and authenticated.",
        fix: "Revoke select from anon and authenticated, or move it to a private schema.",
      });
    else if (!info.invoker)
      add(report, "finding", {
        id: "view-bypasses-rls",
        severity: "High",
        title: `${v} reads its tables with its owner's rights`,
        where: info.where,
        proof: "A view without security_invoker = true ignores the RLS of the tables it reads from.",
        who: "Anyone with the public key, through the REST API, unless select on the view is revoked.",
        fix: `alter view ${v} set (security_invoker = true);`,
      });
  if (a.tables.size && !open) report.fine.push(`All ${a.tables.size} public tables in the migrations have RLS turned on.`);
}

function checkSupabaseConfig(ctx) {
  const t = ctx.read("supabase/config.toml");
  if (!t) return;
  for (const h of hits(t, /^\s*enable_confirmations\s*=\s*false/m))
    add(ctx.report, "check", {
      id: "email-unconfirmed",
      severity: "Low",
      title: "Email sign-ups don't need confirming (local config)",
      where: `supabase/config.toml:${h.line}`,
      proof: "enable_confirmations = false in the local config. Check the live project's setting too.",
      who: "Someone who signs up with another person's email before they do (account pre-hijacking), if accounts are linked by email.",
      fix: "Turn email confirmation on in the live project.",
    });
  for (const h of hits(t, /^\s*\[storage\.buckets\.([\w-]+)\][\s\S]*?^\s*public\s*=\s*true/m))
    add(ctx.report, "finding", {
      id: "public-bucket",
      severity: "Medium",
      title: `Storage bucket "${h.m[1]}" is public (local config)`,
      where: `supabase/config.toml:${h.line}`,
      proof: "public = true.",
      who: "Anyone with a file's URL.",
      fix: "Make it private and use signed URLs, unless everything in it is public.",
    });
}

/* ---- Code patterns ----------------------------------------------- */

const isConstant = (expr) => {
  const e = expr.trim().replace(/[;)}\s]+$/, "");
  return /^(["'])[^"']*\1$/.test(e) || (/^`[^`]*`$/.test(e) && !e.includes("${")) || e === "" || e === "null";
};

function codeFiles(ctx) {
  return ctx.files.filter((f) => !isTestPath(f) && (CODE_EXT.has(extname(f)) || MARKUP_EXT.has(extname(f))));
}

function checkHtmlInjection(ctx) {
  const { read, report } = ctx;
  for (const f of codeFiles(ctx)) {
    const t = read(f);
    if (!t || !/innerHTML|outerHTML|insertAdjacentHTML|document\.write/i.test(t)) continue;
    const where = [];
    for (const h of hits(t, /dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*([^\n]*)/)) {
      const v = h.m[1].replace(/\}\}.*$/, "");
      /* JSON.stringify for JSON-LD is the usual safe use. */
      if (isConstant(v) || /^\s*JSON\.stringify\(/.test(v)) continue;
      where.push(`${f}:${h.line}`);
    }
    for (const h of hits(t, /\.(?:innerHTML|outerHTML)\s*\+?=\s*([^\n]*)/)) if (!isConstant(h.m[1])) where.push(`${f}:${h.line}`);
    for (const h of hits(t, /insertAdjacentHTML\(\s*["'`]\w+["'`]\s*,\s*([^\n]*)/)) if (!isConstant(h.m[1])) where.push(`${f}:${h.line}`);
    for (const h of hits(t, /document\.write\(\s*([^\n]*)/)) if (!isConstant(h.m[1])) where.push(`${f}:${h.line}`);
    if (where.length)
      add(report, "check", {
        id: "html-injection",
        severity: "Medium",
        title: `HTML built from a variable in ${f}`,
        where,
        proof: "innerHTML (or the React equivalent) is given something that isn't a fixed string.",
        who: "Anyone who can get text into that variable (a form, a URL, a database row, another site's response). Their script would run on the page.",
        fix: "Follow each one back to where the value comes from. If any part comes from a person or another site, set textContent instead, or escape it, or build elements.",
      });
  }
}

/** Variables in a file that hold something from the request. */
export function taintedNames(text) {
  const src = /searchParams\.get\(|searchParams\b|req\.query|request\.query|\.query\[|\.query\.|params\.get\(|\.json\(\)|\.formData\(\)|req\.body|request\.body|\.nextUrl\.search/;
  const names = new Set();
  for (const m of text.matchAll(/(?:const|let|var)\s+(\{[^}]*\}|\[[^\]]*\]|[A-Za-z_$][\w$]*)\s*=\s*([^;\n]*)/g)) {
    if (!src.test(m[2]) && ![...names].some((n) => new RegExp(`\\b${n.replace(/\$/g, "\\$")}\\b`).test(m[2]))) continue;
    for (const n of m[1].replace(/[{}[\]]/g, "").split(",")) {
      const name = n.split(":").pop().split("=")[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  return { names, src };
}

/** Whether the start of a call's argument is something from the request,
 *  so the whole address (not just a path on a fixed host) is the caller's. */
function leadsWithTaint(arg, { names, src }) {
  const a = arg.trim();
  if (/^["'`]\//.test(a) || /^`\$\{\s*(origin|base|BASE|HOME|SITE|url\.origin|req\.nextUrl\.origin|new URL)/.test(a)) return false;
  const lead = a.replace(/^`\$\{\s*/, "").replace(/^new URL\(\s*/, "").replace(/^String\(\s*/, "");
  if (src.test(lead.slice(0, 60)) && /^[\w$.]*(searchParams|query|params|body)/.test(lead)) return true;
  const word = /^[A-Za-z_$][\w$]*/.exec(lead)?.[0];
  return !!word && names.has(word);
}

const REDIRECT_GUARD = /startsWith\(\s*["']\/["']\s*\)|allow(?:ed)?_?list|ALLOWED|SAFE_|isSafe\w*\(|safe\w*Path|isRelative|\.origin\s*[!=]==|new Set\(\[/i;
const FETCH_GUARD = /allow(?:ed)?_?list|ALLOWED|\.hostname\s*[!=]==|\.host\s*[!=]==|\.origin\s*[!=]==|startsWith\(\s*["'`]https:\/\/[\w.-]+/i;
const PATH_GUARD = /basename\(|normalize\(|startsWith\(|allow(?:ed)?_?list|ALLOWED|\/\^\[\\w|\.\.\//;

function checkRequestSinks(ctx) {
  const { read, report } = ctx;
  for (const f of codeFiles(ctx)) {
    if (isClientPath(f, read(f)) && !/(^|\/)(app|pages)\/.*(route|api)/.test(f)) continue;
    const t = read(f);
    if (!t) continue;
    const taint = taintedNames(t);
    if (!taint.names.size && !taint.src.test(t)) continue;
    for (const h of hits(t, /\b(?:NextResponse\.redirect|Response\.redirect|res\.redirect|redirect|permanentRedirect)\(\s*([^\n]*)/)) {
      if (!leadsWithTaint(h.m[1], taint)) continue;
      const guarded = REDIRECT_GUARD.test(t);
      add(report, guarded ? "check" : "finding", {
        id: "open-redirect",
        severity: guarded ? "Low" : "Medium",
        title: `Redirects to an address taken from the request`,
        where: `${f}:${h.line}`,
        proof: guarded ? "The target comes from the request. The file has something that looks like an allowlist; check it covers this line." : `The redirect target comes straight from the request: ${h.text.slice(0, 120)}`,
        who: "Anyone who sends a link to your site that bounces to theirs, which makes a phishing page look like it came from you.",
        fix: "Only redirect to paths that start with a single / (and not //), or to a list of known addresses.",
      });
    }
    for (const h of hits(t, /\b(?:fetch|axios(?:\.(?:get|post|request))?|got|ky|https?\.get|https?\.request)\(\s*([^\n]*)/)) {
      if (!leadsWithTaint(h.m[1], taint)) continue;
      const guarded = FETCH_GUARD.test(t);
      add(report, guarded ? "check" : "finding", {
        id: "ssrf",
        severity: guarded ? "Low" : "Medium",
        title: "The server fetches an address taken from the request",
        where: `${f}:${h.line}`,
        proof: guarded ? "The address comes from the request; the file checks the host somewhere. Check it covers this call." : `The whole address comes from the request: ${h.text.slice(0, 120)}`,
        who: "Anyone. They can make your server fetch any address for them, including private ones it can reach and they can't.",
        fix: "Build the address yourself from a fixed host, and take only an id or path from the request, checked against a pattern.",
      });
    }
    for (const h of hits(t, /\b(?:readFile|readFileSync|createReadStream|sendFile|readdir|readdirSync|unlink|writeFile)\(\s*([^\n]*)/)) {
      const arg = h.m[1];
      if (![...taint.names].some((n) => new RegExp(`\\b${n.replace(/\$/g, "\\$")}\\b`).test(arg)) && !taint.src.test(arg)) continue;
      add(report, PATH_GUARD.test(t) ? "check" : "finding", {
        id: "path-traversal",
        severity: PATH_GUARD.test(t) ? "Low" : "High",
        title: "Reads or writes a file named by the request",
        where: `${f}:${h.line}`,
        proof: h.text.slice(0, 140),
        who: "Anyone who puts ../ in the name, to read files outside the folder (env files, source).",
        fix: "Take only a bare name, check it against a pattern like /^[\\w-]+$/, and look it up in a list.",
      });
    }
    /* Prices and amounts the browser sent. */
    if (/checkout\.sessions\.create|paymentIntents\.create|price_data|unit_amount/.test(t))
      for (const h of hits(t, /\b(unit_amount|amount|price)\s*:\s*([^\n,}]*)/)) {
        const v = h.m[2];
        if (![...taint.names].some((n) => new RegExp(`\\b${n.replace(/\$/g, "\\$")}\\b`).test(v)) && !taint.src.test(v)) continue;
        const money = h.m[1] !== "price";
        add(report, money ? "finding" : "check", {
          id: "client-price",
          severity: money ? "High" : "Medium",
          title: money ? "The amount charged comes from the browser" : "The price id comes from the browser",
          where: `${f}:${h.line}`,
          proof: h.text.slice(0, 140),
          who: "Anyone who edits the request before it's sent. They choose what they pay.",
          fix: money ? "Look the price up on the server from the product id." : "Check the price id against the list of products you sell.",
        });
      }
  }
}

function checkFormsAndLogins(ctx) {
  const { root, read, files, report } = ctx;
  const routes = routeFiles(files, ctx.hasNext);
  const inMemoryNote = new Set();
  for (const f of routes) {
    const own = read(f) ?? "";
    const all = withImports(root, read, f);
    const posts = /export\s+(?:async\s+)?function\s+(POST|PUT|PATCH)\b|export\s+const\s+(POST|PUT|PATCH)\b|method\s*[!=]==?\s*["'](POST|PUT)["']|req\.method|request\.method|export\s+default/.test(own);
    if (!posts) continue;
    const sends = EMAIL_SIGNAL.test(all) ? "email" : SMS_SIGNAL.test(all) ? "sms" : WRITE_SIGNAL.test(own) ? "write" : null;
    const login = /password/i.test(own) && /\.json\(\)|formData\(\)|req\.body/.test(own);
    if (!sends && !login) continue;
    const limited = RATE_SIGNAL.test(all);
    const authed = AUTH_SIGNAL.test(all) && !login;
    /* Signed-in-only routes are skipped: a stranger can't reach them, and
       the reviewer still reads them by hand. */
    if (authed && sends !== "sms") continue;
    if (!limited) {
      add(report, "finding", {
        id: login ? "login-no-rate-limit" : "form-no-rate-limit",
        severity: sends === "sms" ? "High" : "Medium",
        title: login
          ? `${routePath(f)} checks a password with no limit on tries`
          : `${routePath(f)} ${sends === "email" ? "sends email" : sends === "sms" ? "sends texts" : "saves to the database"} with no rate limit`,
        where: f,
        proof: `It takes a POST from anyone and nothing in it or its imports counts requests.`,
        who: login
          ? "Anyone running a list of leaked passwords or guessing (credential stuffing)."
          : sends === "sms"
            ? "Anyone with a script. Each text costs money, and SMS pumping fraud runs up bills of thousands."
            : "Anyone with a script, sending thousands of requests: a full inbox, a spam relay or a database full of junk.",
        fix: "Add a Vercel Firewall rate-limit rule on this path (the real limit), and a per-address count in the route as a backstop.",
      });
    } else if (/new Map\(/.test(own) && !/upstash|redis|\bkv\b|@vercel\/kv|firewall/i.test(all) && !inMemoryNote.has(f)) {
      inMemoryNote.add(f);
      add(report, "check", {
        id: "rate-limit-in-memory",
        severity: "Low",
        title: `${routePath(f)} counts requests in memory`,
        where: f,
        proof: "The count lives in a Map in one running copy of the function. Vercel runs several and restarts them, so it slows a script down without stopping it.",
        who: "A determined script.",
        fix: "Check the Vercel Firewall has a rate-limit rule for this path. The repo can't show it.",
      });
    }
  }
  /* A password form handled in middleware (designedbytrev's stats page). */
  const mw = ctx.middleware && read(ctx.middleware);
  if (mw && /password/i.test(mw) && /formData\(\)|\.json\(\)|method\s*===?\s*["']POST/.test(mw) && !RATE_SIGNAL.test(mw))
    add(report, "finding", {
      id: "login-no-rate-limit",
      severity: "Medium",
      title: "The middleware checks a password with no limit on tries",
      where: ctx.middleware,
      proof: "It reads a posted password and nothing counts wrong attempts.",
      who: "Anyone guessing or running a list of leaked passwords.",
      fix: "Add a Vercel Firewall rate-limit rule on the sign-in path.",
    });
}

function checkHostHeaderLinks(ctx) {
  const { read, report } = ctx;
  for (const f of codeFiles(ctx)) {
    const t = read(f);
    if (!t || !/resetPassword|reset.?link|magic.?link|invite|signInWithOtp|emailRedirectTo|redirectTo|verify.?email|confirm.?email/i.test(t)) continue;
    const seenLines = new Set();
    for (const h of hits(t, /headers\.get\(\s*["'](?:x-forwarded-host|host)["']\s*\)|headers\.host\b|headers\[["']host["']\]|x-forwarded-host/i))
      if (!seenLines.has(h.line) && seenLines.add(h.line))
      add(report, "check", {
        id: "host-header-link",
        severity: "Medium",
        title: "A link in an email may be built from the Host header",
        where: `${f}:${h.line}`,
        proof: "This file sends email or reset links and reads the Host header.",
        who: "Anyone who triggers a reset for someone else's email with a forged Host header. The link in the email then points at their site (password reset poisoning).",
        fix: "Build links from a fixed setting (NEXT_PUBLIC_SITE_URL), never from the request.",
      });
  }
}

function checkCors(ctx) {
  const { read, report } = ctx;
  for (const f of [...codeFiles(ctx), ...ctx.files.filter((x) => basename(x) === "vercel.json")]) {
    const t = read(f);
    if (!t || !/Access-Control-Allow-Origin/i.test(t)) continue;
    const creds = /Access-Control-Allow-Credentials["']?\s*[:,]\s*["']?true/i.test(t);
    const reflect = /Access-Control-Allow-Origin["']?\s*[:,]\s*(?:req|request)\.headers(?:\.get\(\s*["']origin["']\)|\.origin|\[["']origin["']\])/i.test(t) || /Allow-Origin["']?\s*[:,]\s*origin\b/i.test(t);
    const star = /Access-Control-Allow-Origin["']?\s*[:,]\s*["']\*["']/i.test(t);
    if ((reflect || star) && creds)
      add(report, "finding", {
        id: "cors-credentials",
        severity: "High",
        title: "Any site can make signed-in requests here and read the answer",
        where: f,
        proof: `Access-Control-Allow-Origin is ${reflect ? "copied from the request" : "*"} together with Allow-Credentials: true.`,
        who: "Any website a signed-in user visits. It can read their data from your API.",
        fix: "Allow only your own origins, by name.",
      });
    else if (reflect)
      add(report, "check", {
        id: "cors-reflect",
        severity: "Low",
        title: "CORS echoes back whichever origin asks",
        where: f,
        proof: "Allow-Origin is copied from the request.",
        who: "Other sites, for anything that isn't meant to be public.",
        fix: "Use a list of allowed origins.",
      });
  }
}

function checkWeakSecrets(ctx) {
  const { read, report } = ctx;
  for (const f of codeFiles(ctx)) {
    const t = read(f);
    if (!t) continue;
    for (const h of hits(t, /process\.env\.(\w*(?:SECRET|TOKEN|KEY|PASSWORD|SALT)\w*)\s*(?:\|\||\?\?)\s*(["'`])([^"'`]+)\2/)) {
      add(report, "finding", {
        id: "secret-fallback",
        severity: "Medium",
        title: `${h.m[1]} falls back to a value written in the code`,
        where: `${f}:${h.line}`,
        proof: `If the variable is ever missing, the code uses "${h.m[3].length > 12 ? redact(h.m[3]) : h.m[3]}".`,
        who: "Anyone who reads the code (or guesses a default), on any deploy where the variable isn't set. They can sign their own cookies or tokens.",
        fix: "Fail closed: if the variable isn't set, refuse the request.",
      });
    }
    for (const h of hits(t, /(?:jwt\.sign|jwt\.verify|createHmac)\(\s*(?:[^,]+,\s*)?["'`]([^"'`]{1,64})["'`]/)) {
      if (/^(sha\d+|md5)$/i.test(h.m[1])) continue;
      add(report, "finding", {
        id: "hardcoded-signing-key",
        severity: "High",
        title: "Tokens are signed with a key written in the code",
        where: `${f}:${h.line}`,
        proof: h.text.slice(0, 120),
        who: "Anyone who reads the code. They can make a valid token for any account.",
        fix: "Use a long random value from an environment variable, and rotate it.",
      });
    }
    for (const h of hits(t, /createHmac\(\s*["'`]sha\d+["'`]\s*,\s*["'`]([^"'`]+)["'`]/))
      add(report, "finding", {
        id: "hardcoded-signing-key",
        severity: "High",
        title: "An HMAC key is written in the code",
        where: `${f}:${h.line}`,
        proof: h.text.slice(0, 120),
        who: "Anyone who reads the code.",
        fix: "Use a long random value from an environment variable.",
      });
  }
}

function checkCookiesInCode(ctx) {
  const { read, report } = ctx;
  for (const f of codeFiles(ctx)) {
    const t = read(f);
    if (!t || !/cookies|Set-Cookie|setCookie|serialize\(/i.test(t)) continue;
    const lines = t.split("\n");
    for (const h of hits(t, /(?:\.cookies\.set|cookies\(\)\.set|cookieStore\.set|setCookie)\(\s*["'`]([\w-]+)["'`]/)) {
      const name = h.m[1];
      if (!/sess|auth|token|sid|login|jwt|admin|stats|remember/i.test(name)) continue;
      const window = lines.slice(h.line - 1, h.line + 5).join(" ");
      if (/\boptions\b|\.\.\.\w+/.test(window.split(")")[0])) continue;
      if (/httpOnly\s*:\s*true/i.test(window)) continue;
      add(report, "finding", {
        id: "cookie-flags",
        severity: "Medium",
        title: `The ${name} cookie can be read by the page's scripts`,
        where: `${f}:${h.line}`,
        proof: "It's set without httpOnly: true.",
        who: "Any script that gets onto the page (an injected one, a bad third-party script) can copy the session.",
        fix: "Set it with httpOnly: true, secure: true, sameSite: 'lax'.",
      });
    }
    for (const h of hits(t, /["']Set-Cookie["']\s*[:,]\s*([^\n]*)/i)) {
      const v = h.m[1];
      if (!/sess|auth|token|sid|login|jwt|admin|stats/i.test(v)) continue;
      if (/HttpOnly/i.test(lines.slice(h.line - 3, h.line + 3).join(" "))) continue;
      add(report, "finding", {
        id: "cookie-flags",
        severity: "Medium",
        title: "A session cookie is set without HttpOnly",
        where: `${f}:${h.line}`,
        proof: h.text.slice(0, 120),
        who: "Any script that gets onto the page.",
        fix: "Add HttpOnly; Secure; SameSite=Lax.",
      });
    }
  }
}

function checkPrivateCaching(ctx) {
  const { root, read, files, report } = ctx;
  for (const f of routeFiles(files, ctx.hasNext)) {
    const own = read(f) ?? "";
    if (!/s-maxage|public,\s*max-age=[1-9]|stale-while-revalidate/i.test(own)) continue;
    if (!AUTH_SIGNAL.test(withImports(root, read, f))) continue;
    add(report, "finding", {
      id: "private-cached",
      severity: "Medium",
      title: `${routePath(f)} checks who's asking but lets the answer be cached publicly`,
      where: f,
      proof: "The response has a shared cache header (s-maxage or public) and the route depends on who's signed in.",
      who: "The next person to ask, who may be served the last person's private answer from the CDN.",
      fix: "Send Cache-Control: private, no-store on anything that depends on who's signed in.",
    });
  }
}

function checkLeakyErrors(ctx) {
  const { files, read, report } = ctx;
  const where = [];
  for (const f of routeFiles(files, ctx.hasNext)) {
    const t = read(f) ?? "";
    for (const h of hits(t, /(?:json|send|Response)\([^\n]*\b(?:err|error|e|ex)\.(?:message|stack|details|hint)\b/)) where.push(`${f}:${h.line}`);
  }
  if (where.length)
    add(report, "check", {
      id: "error-leak",
      severity: "Low",
      title: "Raw error messages are sent back to the browser",
      where,
      proof: "error.message (or the stack) goes into the response.",
      who: "Anyone. Database and library errors name tables, columns and versions, which helps someone looking for a way in.",
      fix: "Log the detail on the server and send a plain message.",
    });
}

function checkEnumeration(ctx) {
  const { files, read, report } = ctx;
  const where = [];
  for (const f of [...routeFiles(files, ctx.hasNext), ctx.middleware].filter(Boolean)) {
    const t = read(f) ?? "";
    for (const h of hits(t, /["'`][^"'`]*(?:no (?:user|account) (?:found|with)|user not found|account not found|(?:email|user|account) (?:does not|doesn't) exist|(?:is )?not registered|already registered)[^"'`]*["'`]/i)) where.push(`${f}:${h.line}`);
  }
  if (where.length)
    add(report, "check", {
      id: "user-enumeration",
      severity: "Low",
      title: "Sign-in or reset says whether an account exists",
      where,
      proof: "A message tells the person there's no account with that email.",
      who: "Anyone with a list of emails, finding out who uses the app before trying passwords.",
      fix: "Give the same answer either way: \"If there's an account, we've sent a link.\"",
    });
}

function checkOAuth(ctx) {
  const { read, report } = ctx;
  for (const f of codeFiles(ctx)) {
    const t = read(f);
    if (!t || !/client_id/.test(t) || !/response_type=code|response_type["']?\s*[:,]\s*["']code|\/authorize\b|\/oauth2?\/auth/.test(t)) continue;
    if (/\bstate\b/.test(t) || /code_challenge/.test(t)) continue;
    add(report, "finding", {
      id: "oauth-no-state",
      severity: "Medium",
      title: "OAuth sign-in starts without a state value",
      where: f,
      proof: "It builds an authorize URL with client_id but never sets state (or a PKCE code_challenge).",
      who: "Another site, which can finish a sign-in it started so your app links their account (login CSRF).",
      fix: "Generate a random state, keep it in an httpOnly cookie, and check it in the callback.",
    });
  }
}

function checkUploads(ctx) {
  const { read, report } = ctx;
  for (const f of codeFiles(ctx)) {
    const t = read(f);
    if (!t) continue;
    const clientUpload = /storage\s*\.from\([^)]*\)\s*\.upload\(/.test(t) || (/\bupload\(/.test(t) && /@vercel\/blob\/client/.test(t));
    const serverUpload = /formData\(\)/.test(t) && /\b(put|upload)\(/.test(t);
    if (!clientUpload && !serverUpload) continue;
    const sized = /\.size\b/.test(t) && /\.type\b|content-?type|mime|allowedContentTypes/i.test(t);
    add(report, "check", {
      id: "uploads",
      severity: sized ? "Low" : "Medium",
      title: `People can upload files (${f})`,
      where: f,
      proof: sized ? "It checks size and type in this file." : "No size or type check in this file (the bucket may have its own limits).",
      who: "Anyone who can reach the upload: huge files, HTML or SVG with script in it, or someone else's photos and music.",
      fix: "Limit size and type on the server or the bucket, serve uploads from a separate domain or with Content-Disposition: attachment, and have a way to take something down when asked (copyright).",
    });
  }
}

function checkSessionReplay(ctx) {
  const { read, report } = ctx;
  for (const f of codeFiles(ctx)) {
    const t = read(f);
    if (!t) continue;
    for (const h of hits(t, /maskAllText\s*:\s*false|maskAllInputs\s*:\s*false|maskTextSelector\s*:\s*["'`]\s*["'`]|blockAllMedia\s*:\s*false|recordCanvas\s*:\s*true/))
      add(report, "finding", {
        id: "replay-unmasked",
        severity: "High",
        title: "Session recording is told not to hide what people type",
        where: `${f}:${h.line}`,
        proof: h.text.slice(0, 120),
        who: "Legal and privacy risk. Passwords, card numbers and messages end up in the recording service's videos.",
        fix: "Leave masking on (the default) and record only with consent.",
      });
    const replay = [];
    for (const h of hits(t, /replaysSessionSampleRate\s*:\s*([0-9.]+)/)) if (Number(h.m[1]) > 0) replay.push({ h, tool: "Sentry Replay" });
    for (const h of hits(t, /replayIntegration\(|new\s+Replay\(|Sentry\.Replay\b/)) replay.push({ h, tool: "Sentry Replay" });
    for (const h of hits(t, /LogRocket\.init\(|static\.hotjar\.com|\bhj\(\s*["']|clarity\.ms|FS\.init\(|@fullstory|fullstory\.com|mouseflow|smartlook|inspectlet|openreplay/i))
      replay.push({ h, tool: h.m[0].replace(/[(.'"]/g, " ").trim().split(/\s+/)[0] });
    if (replay.length && !/consent/i.test(t))
      add(report, "finding", {
        id: "session-replay",
        severity: "Medium",
        title: `Records visitors' sessions (${[...new Set(replay.map((r) => r.tool))].join(", ")})`,
        where: replay.map((r) => `${f}:${r.h.line}`),
        proof: "A session recording tool is switched on and nothing in the file waits for consent.",
        who: "Legal risk. Under UK and EU law recording someone's session needs their consent first, and recordings can capture what they type.",
        fix: "Ask before recording, keep masking on, and say so in the privacy policy.",
      });
    for (const h of hits(t, /posthog\.init\(/))
      if (!/disable_session_recording\s*:\s*true/.test(t))
        add(report, "check", {
          id: "posthog-replay",
          severity: "Low",
          title: "PostHog may record sessions",
          where: `${f}:${h.line}`,
          proof: "PostHog records sessions when replay is switched on in the project's settings. The code can't show that setting.",
          who: "Legal risk, if it's on without consent.",
          fix: "Check the PostHog project settings, or set disable_session_recording: true in the code.",
        });
  }
}

function checkLegalSignals(ctx) {
  const { files, read, report } = ctx;
  const code = codeFiles(ctx);
  const text = (f) => read(f) ?? "";
  const whole = code.map(text).join("\n");
  /* Tracking that needs consent under PECR. Vercel Analytics and Plausible
     set no cookies, so they're left out. */
  const trackers = [];
  for (const f of code)
    for (const h of hits(text(f), /googletagmanager\.com|google-analytics\.com|\bgtag\(\s*["']config|connect\.facebook\.net|\bfbq\(|analytics\.tiktok\.com|snap\.licdn\.com|bat\.bing\.com/))
      trackers.push(`${f}:${h.line}`);
  if (trackers.length)
    add(report, /consent|cookiebot|onetrust|klaro|cookieyes|usercentrics/i.test(whole) ? "check" : "finding", {
      id: "tracking-without-consent",
      severity: "Medium",
      title: "Tracking scripts that set cookies",
      where: trackers,
      proof: "Google Analytics, Tag Manager or an ad pixel is loaded. Nothing in the code looks like a consent banner.",
      who: "Legal risk. UK PECR and the EU's ePrivacy rules need consent before non-essential cookies.",
      fix: "Load them only after someone agrees, or switch to cookieless analytics (Vercel Analytics, Plausible).",
    });
  /* Sign-up: who can make an account. */
  const signups = [];
  for (const f of code) for (const h of hits(text(f), /\.signUp\(|signInWithOAuth\(|signInWithOtp\(|createUserWithEmailAndPassword\(|>\s*(?:Sign up|Create (?:an )?account)\s*</)) signups.push(`${f}:${h.line}`);
  if (signups.length)
    add(report, "check", {
      id: "age-check",
      severity: "Low",
      title: "People can make accounts: could children?",
      where: signups.slice(0, 6),
      proof: /\b(dateOfBirth|date_of_birth|birth|age_?check|over_?(13|16|18)|parental)\b/i.test(whole) ? "There's something age-related in the code; check it runs before an account is made." : "Nothing in the code asks for an age.",
      who: "Legal risk. If under-13s could sign up and it's aimed at them, COPPA (US) applies; if children are likely to use it, the UK Children's Code applies (high privacy by default, no nudges, data kept to a minimum).",
      fix: "If it's for adults or named people only, limit sign-in to an allowlist and say so. Otherwise add an age check and follow the Children's Code.",
    });
  /* Marketing email. */
  const marketing = [];
  for (const f of code) {
    const t = text(f);
    if (EMAIL_SIGNAL.test(t) && /newsletter|marketing|campaign|broadcast|subscribers?\b|mailing list/i.test(t)) marketing.push(f);
  }
  if (marketing.length) {
    const unsub = /unsubscribe|List-Unsubscribe/i.test(whole);
    add(report, unsub ? "check" : "finding", {
      id: "marketing-email",
      severity: "Medium",
      title: "Sends marketing email",
      where: marketing,
      proof: unsub ? "There's an unsubscribe link somewhere; check every email has it, plus a postal address." : "No unsubscribe link anywhere in the code.",
      who: "Legal risk. UK PECR and the US CAN-SPAM Act need an easy unsubscribe in every marketing email (CAN-SPAM also needs a postal address), and Gmail and Yahoo now reject bulk mail without one-click unsubscribe.",
      fix: "Add an unsubscribe link and the List-Unsubscribe header to every marketing email, plus a postal address.",
    });
  }
  /* Subscriptions: renewal terms by the button. */
  const subs = [];
  for (const f of code) for (const h of hits(text(f), /mode\s*:\s*["']subscription["']|stripe-pricing-table|recurring\s*:\s*\{\s*interval/)) subs.push(`${f}:${h.line}`);
  if (subs.length)
    add(report, "check", {
      id: "subscription-terms",
      severity: "Medium",
      title: "Sells subscriptions",
      where: subs,
      proof: "A Stripe subscription checkout or pricing table.",
      who: "Legal risk. The UK DMCC Act 2024 and US state auto-renewal laws want the price, how often it renews and how to cancel shown next to the button, and cancelling as easy as signing up.",
      fix: "Put the renewal terms right by the subscribe button, send a reminder before renewal, and keep cancelling to a click or two.",
    });
  /* Personal data about people, including children, in browser code. */
  const personal = [];
  for (const f of files)
    if (isClientPath(f, read(f)) && (CODE_EXT.has(extname(f)) || f.endsWith(".json")))
      for (const h of hits(text(f), /\b(dob|dateOfBirth|date_of_birth|birthday|birthdate|born)\b["']?\s*[:=]\s*["'`]?\d/i)) personal.push(`${f}:${h.line}`);
  if (personal.length)
    add(report, "check", {
      id: "personal-data-client",
      severity: "Medium",
      title: "A birth date in code that reaches the browser",
      where: personal,
      proof: "Anything bundled for the browser can be read by anyone who loads the site, signed in or not.",
      who: "Anyone who opens the site's JavaScript. A child's name with an age or birthday is the kind of thing that mustn't leak.",
      fix: "Keep it in the database behind a policy and load it only for signed-in family.",
    });
  /* AI that reads text from outside. */
  const ai = [];
  for (const f of code) for (const h of hits(text(f), /api\.anthropic\.com|@anthropic-ai\/sdk|from\s+["']openai["']|api\.openai\.com|\bgenerateText\(|\bstreamText\(|@ai-sdk\//)) ai.push(`${f}:${h.line}`);
  if (ai.length)
    add(report, "check", {
      id: "prompt-injection",
      severity: "Medium",
      title: "An AI model reads text and may act on it",
      where: ai.slice(0, 6),
      proof: "The app calls a language model.",
      who: "Anyone who can put text where the model reads it (a form, a web page, a shared doc). Instructions hidden in that text can make it reveal the system prompt, call its tools or leak data (prompt injection).",
      fix: "Give the model only the tools and data the person using it may already have, check tool calls on the server, and never put secrets in the prompt.",
    });
}

function checkHeadersConfig(ctx) {
  const { files, read, report } = ctx;
  const cfg = files.filter((f) => /^(next\.config\.|vercel\.json$|netlify\.toml$|(public\/)?_headers$|astro\.config\.|middleware\.|src\/middleware\.|index\.html$)/.test(f));
  const all = cfg.map((f) => read(f) ?? "").join("\n");
  if (!/Content-Security-Policy/i.test(all))
    add(report, "finding", {
      id: "no-csp",
      severity: "Low",
      title: "No Content-Security-Policy in the config",
      where: cfg.length ? cfg : "(no headers config found)",
      proof: "None of the files that set headers mention Content-Security-Policy.",
      who: "It's a second line of defence: it stops an injected script loading from elsewhere or the page being framed.",
      fix: "Add one in next.config headers() or vercel.json, starting with frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'.",
    });
  if (!/frame-ancestors|X-Frame-Options/i.test(all))
    add(report, "finding", {
      id: "clickjacking",
      severity: ctx.middleware || routeFiles(files, ctx.hasNext).length ? "Medium" : "Low",
      title: "Other sites can show this one in a frame",
      where: cfg.length ? cfg : "(no headers config found)",
      proof: "No frame-ancestors or X-Frame-Options anywhere in the config.",
      who: "Another site that puts yours in an invisible frame and tricks a signed-in person into clicking a button on it (clickjacking).",
      fix: "Add frame-ancestors 'none' to the CSP (and X-Frame-Options: DENY for old browsers).",
    });
  else report.fine.push("The config sets frame-ancestors or X-Frame-Options, so other sites can't frame it.");
}

function runNpmAudit(ctx) {
  const { root, report } = ctx;
  if (ctx.opts.audit === false) return report.skipped.push("npm audit: turned off with --no-audit");
  if (!existsSync(join(root, "node_modules"))) return report.skipped.push("npm audit: no node_modules (run npm ci first; this script never installs)");
  if (!existsSync(join(root, "package-lock.json"))) return report.skipped.push("npm audit: no package-lock.json");
  const r = spawnSync("npm", ["audit", "--json", "--omit=dev"], { cwd: root, timeout: 120_000, maxBuffer: 64 << 20 });
  let data;
  try {
    data = JSON.parse(r.stdout.toString());
  } catch {
    return report.skipped.push(`npm audit: no answer (${(r.stderr?.toString() || r.error?.message || "").trim().slice(0, 100)})`);
  }
  if (data.error) return report.skipped.push(`npm audit: ${data.error.summary ?? "failed"}`);
  const vulns = Object.values(data.vulnerabilities ?? {});
  const counts = data.metadata?.vulnerabilities ?? {};
  for (const v of vulns.filter((x) => x.severity === "critical" || x.severity === "high")) {
    const via = v.via.filter((x) => typeof x === "object");
    add(report, v.isDirect ? "finding" : "check", {
      id: "npm-audit",
      severity: v.severity === "critical" ? "Critical" : "High",
      title: `${v.name} ${v.range}: ${via[0]?.title ?? `has a vulnerable dependency (${v.via.filter((x) => typeof x === "string").join(", ")})`}`,
      where: "package-lock.json",
      proof: `npm audit: ${v.severity}${via.map((x) => x.url).filter(Boolean).slice(0, 2).map((u) => ` ${u}`).join("")}.${v.isDirect ? "" : " Pulled in by another package."}`,
      who: "Depends on whether the app uses the affected part. Read the advisory before calling it exploitable.",
      fix: v.fixAvailable ? `npm audit fix${v.fixAvailable === true ? "" : ` (or update ${v.fixAvailable.name} to ${v.fixAvailable.version})`}` : "No fix yet: check the advisory for a workaround.",
    });
  }
  const moderate = (counts.moderate ?? 0) + (counts.low ?? 0);
  if (moderate)
    add(report, "check", {
      id: "npm-audit",
      severity: "Low",
      title: `npm audit: ${counts.moderate ?? 0} moderate and ${counts.low ?? 0} low`,
      where: "package-lock.json",
      proof: "Production dependencies only.",
      who: "Usually nobody in practice; read them when updating.",
      fix: "npm audit for the list; npm audit fix for the safe updates.",
    });
  if (!vulns.length) report.fine.push("npm audit found nothing in the production dependencies.");
}

export async function scanRepo(root, opts = {}) {
  root = resolve(root);
  const report = newReport();
  const { files, viaGit } = listFiles(root);
  const raw = makeReader(root);
  const read = makeCodeReader(raw);
  let untracked = new Set();
  if (viaGit) {
    try {
      untracked = new Set(execFileSync("git", ["ls-files", "-o", "--exclude-standard", "-z"], { cwd: root }).toString().split("\0").filter(Boolean));
      for (const f of files) if (isEnvFile(f) && spawnSync("git", ["ls-files", "--error-unmatch", f], { cwd: root }).status !== 0) untracked.add(f);
    } catch {
      /* keep going without it */
    }
  } else for (const f of files) if (isEnvFile(f)) untracked.add(f);
  const middleware = files.find((f) => /^(src\/)?(middleware|proxy)\.[cm]?[jt]s$/.test(f)) ?? null;
  const ctx = { root, files, read, raw, report, opts, viaGit, untracked, middleware, hasNext: false };
  checkNext(ctx);
  if (!ctx.hasNext && middleware && /^(src\/)?proxy\./.test(middleware)) ctx.middleware = null;
  checkMiddlewareOnlyAuth(ctx);
  checkGoogleFonts(ctx);
  checkThirdPartyScripts(ctx);
  checkSourceMaps(ctx);
  checkSecrets(ctx);
  checkHistory(ctx);
  checkSql(ctx);
  checkSupabaseConfig(ctx);
  checkHtmlInjection(ctx);
  checkRequestSinks(ctx);
  checkFormsAndLogins(ctx);
  checkHostHeaderLinks(ctx);
  checkCors(ctx);
  checkWeakSecrets(ctx);
  checkCookiesInCode(ctx);
  checkPrivateCaching(ctx);
  checkLeakyErrors(ctx);
  checkEnumeration(ctx);
  checkOAuth(ctx);
  checkUploads(ctx);
  checkSessionReplay(ctx);
  checkLegalSignals(ctx);
  if (!opts.url) checkHeadersConfig(ctx);
  runNpmAudit(ctx);
  report.files = files.length;
  return report;
}

/* ------------------------------------------------------------------ */
/* Live checks                                                         */
/* ------------------------------------------------------------------ */

function noProxy(host) {
  const list = (process.env.NO_PROXY ?? process.env.no_proxy ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.some((p) => p === "*" || host === p || (p.startsWith(".") && host.endsWith(p)) || (p.startsWith("*.") && host.endsWith(p.slice(1))) || host.endsWith("." + p));
}

/** One request. Goes through HTTPS_PROXY with CONNECT when one is set,
 *  because Node's https module doesn't read it. Reads at most maxBytes. */
export function request(url, { method = "GET", maxBytes = 2_000_000, timeout = 15_000, headers = {} } = {}) {
  const u = new URL(url);
  const lib = u.protocol === "https:" ? https : http;
  const proxy = u.protocol === "https:" && !noProxy(u.hostname) ? process.env.HTTPS_PROXY ?? process.env.https_proxy : null;
  const reqHeaders = { "user-agent": "site-scan (the site owner's own review; passive)", accept: "*/*", ...headers };
  return new Promise((resolvePromise, reject) => {
    const go = (socket) => {
      const options = { method, host: u.hostname, port: u.port || (u.protocol === "https:" ? 443 : 80), path: u.pathname + u.search, headers: reqHeaders, timeout, servername: u.hostname };
      if (socket) {
        socket.on("error", () => {});
        options.createConnection = () => tls.connect({ socket, servername: u.hostname }).on("error", () => {});
        options.agent = false;
      }
      const req = lib.request(options, (res) => {
        const chunks = [];
        let size = 0;
        res.on("data", (c) => {
          if (size < maxBytes) chunks.push(c);
          size += c.length;
          if (size >= maxBytes) res.destroy();
        });
        const done = () =>
          resolvePromise({ url, status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8").slice(0, maxBytes) });
        res.on("end", done);
        res.on("close", done);
        res.on("error", done);
      });
      req.on("timeout", () => req.destroy(new Error("timed out")));
      req.on("error", reject);
      req.end();
    };
    if (!proxy) return go(null);
    const p = new URL(proxy);
    const c = http.request({ host: p.hostname, port: p.port || 80, method: "CONNECT", path: `${u.hostname}:${u.port || 443}`, timeout });
    c.on("connect", (res, socket) => (res.statusCode === 200 ? go(socket) : reject(new Error(`proxy said ${res.statusCode}`))));
    c.on("timeout", () => c.destroy(new Error("proxy timed out")));
    c.on("error", reject);
    c.end();
  });
}

async function get(url, opts) {
  try {
    return await request(url, opts);
  } catch (e) {
    return { url, status: 0, headers: {}, body: "", error: e.message };
  }
}

const looksHtml = (body) => /^\s*(<!doctype|<html|<head|<body|<\?xml|<!--)/i.test(body);

/* Hostnames ending in these share a registrable domain one level down. */
const TWO_PART_TLDS = /\.(co|org|gov|ac|me|ltd|plc|net|sch)\.(uk|nz|za|jp|in)$|\.(com|net|org)\.(au|br|mx|tr)$/;
export function siteOf(host) {
  const parts = host.toLowerCase().split(".");
  return parts.slice(TWO_PART_TLDS.test(host) ? -3 : -2).join(".");
}

export function parseSetCookie(header) {
  const [pair, ...attrs] = header.split(";");
  const name = pair.split("=")[0].trim();
  const has = (a) => attrs.some((x) => x.trim().toLowerCase().startsWith(a));
  const same = attrs.map((x) => x.trim()).find((x) => /^samesite=/i.test(x));
  return { name, secure: has("secure"), httpOnly: has("httponly"), sameSite: same ? same.split("=")[1].toLowerCase() : null };
}

export async function scanLive(url, opts = {}) {
  const report = newReport();
  const base = new URL(url);
  const pause = () => new Promise((r) => setTimeout(r, opts.pause ?? 200));
  /* The page, following up to 5 redirects by hand so each hop's cookies
     and headers are seen. */
  let page;
  let at = base.href;
  const cookies = [];
  for (let hop = 0; hop < 6; hop++) {
    page = await get(at);
    for (const c of [].concat(page.headers["set-cookie"] ?? [])) cookies.push({ c, url: at });
    if (page.status >= 300 && page.status < 400 && page.headers.location) {
      at = new URL(page.headers.location, at).href;
      await pause();
      continue;
    }
    break;
  }
  if (!page || page.status === 0) {
    report.skipped.push(`live: couldn't load ${url} (${page?.error ?? "no answer"})`);
    return report;
  }
  const final = new URL(at);
  const h = page.headers;
  const html = page.body;
  const https_ = final.protocol === "https:";
  if (base.protocol === "https:" && final.protocol === "http:")
    add(report, "finding", { id: "downgrade", severity: "High", title: "The site redirects from https to http", where: `${url} -> ${at}`, proof: "A redirect drops to plain http.", who: "Anyone on the same wifi can read and change the page.", fix: "Serve everything over https." });

  /* Headers */
  const csp = String(h["content-security-policy"] ?? "");
  const xfo = String(h["x-frame-options"] ?? "");
  const hasForm = /<(form|input|button|textarea)\b/i.test(html);
  if (!/frame-ancestors/i.test(csp) && !/deny|sameorigin/i.test(xfo))
    add(report, "finding", {
      id: "live-clickjacking",
      severity: hasForm ? "Medium" : "Low",
      title: "Other sites can show this page in a frame",
      where: `GET ${at}`,
      proof: `No frame-ancestors in the CSP and no X-Frame-Options (got CSP "${csp.slice(0, 60) || "none"}", X-Frame-Options "${xfo || "none"}").`,
      who: hasForm ? "Another site that frames this one invisibly and tricks people into clicking its buttons (clickjacking)." : "Little today: the page has no buttons or forms to trick anyone into using.",
      fix: "Add frame-ancestors 'none' to the Content-Security-Policy.",
    });
  if (!csp)
    add(report, "finding", { id: "live-no-csp", severity: "Low", title: "No Content-Security-Policy", where: `GET ${at}`, proof: "The response has no Content-Security-Policy header.", who: "It's the second line of defence against injected scripts.", fix: "Add one (vercel.json headers or next.config headers())." });
  else {
    const scriptSrc = /script-src\s+([^;]*)/i.exec(csp)?.[1] ?? /default-src\s+([^;]*)/i.exec(csp)?.[1] ?? "";
    if (/'unsafe-inline'/.test(scriptSrc) && !/'nonce-|'sha(256|384|512)-|'strict-dynamic'/.test(scriptSrc))
      add(report, "check", { id: "csp-unsafe-inline", severity: "Low", title: "The CSP lets inline scripts run", where: `GET ${at}`, proof: `script-src ${scriptSrc.trim()}`, who: "An injected script isn't stopped by the CSP.", fix: "Use hashes or nonces for the inline scripts the site needs (Next needs a nonce per request)." });
    if (/'unsafe-eval'/.test(scriptSrc))
      add(report, "check", { id: "csp-unsafe-eval", severity: "Low", title: "The CSP allows eval", where: `GET ${at}`, proof: `script-src ${scriptSrc.trim()}`, who: "Makes an injected script easier to run.", fix: "Remove 'unsafe-eval' if nothing needs it." });
  }
  if (https_ && !h["strict-transport-security"])
    add(report, "finding", { id: "live-no-hsts", severity: "Low", title: "No Strict-Transport-Security", where: `GET ${at}`, proof: "Browsers aren't told to always use https.", who: "Someone on the same network, on the first visit over http.", fix: "Add Strict-Transport-Security: max-age=63072000." });
  if (String(h["x-content-type-options"] ?? "").toLowerCase() !== "nosniff")
    add(report, "finding", { id: "live-no-nosniff", severity: "Low", title: "No X-Content-Type-Options: nosniff", where: `GET ${at}`, proof: "Missing.", who: "Uploaded or user files could be run as script by an old browser.", fix: "Add X-Content-Type-Options: nosniff." });
  if (!h["referrer-policy"])
    add(report, "finding", { id: "live-no-referrer-policy", severity: "Low", title: "No Referrer-Policy", where: `GET ${at}`, proof: "Missing (modern browsers default to strict-origin-when-cross-origin).", who: "Full page addresses, with anything private in them, could be sent to other sites by older browsers.", fix: "Add Referrer-Policy: strict-origin-when-cross-origin." });
  if (!h["permissions-policy"])
    add(report, "check", { id: "live-no-permissions-policy", severity: "Low", title: "No Permissions-Policy", where: `GET ${at}`, proof: "Missing.", who: "Nobody directly; it limits what an injected or third-party script can ask for (camera, microphone, location).", fix: "Add Permissions-Policy listing only what the site uses, e.g. camera=(), microphone=(), geolocation=()." });
  if (h["x-powered-by"])
    add(report, "finding", { id: "live-powered-by", severity: "Low", title: `The server says what it runs (${h["x-powered-by"]})`, where: `GET ${at}`, proof: `X-Powered-By: ${h["x-powered-by"]}`, who: "Someone matching sites to known bugs.", fix: "Turn it off (poweredByHeader: false in next.config)." });
  if (["content-security-policy", "x-content-type-options", "referrer-policy"].every((k) => h[k]) && (https_ ? h["strict-transport-security"] : true))
    report.fine.push("The page sends CSP, nosniff, Referrer-Policy" + (https_ ? " and HSTS." : "."));

  /* Cookies seen on the public page */
  for (const { c, url: from } of cookies) {
    const k = parseSetCookie(c);
    const sessiony = /sess|auth|token|sid|login|jwt|admin|stats|sb-/i.test(k.name);
    if (https_ && !k.secure)
      add(report, "finding", { id: "live-cookie-secure", severity: sessiony ? "Medium" : "Low", title: `Cookie ${k.name} isn't marked Secure`, where: `GET ${from}`, proof: `Set-Cookie: ${k.name}=...; ${c.split(";").slice(1).join(";").trim()}`, who: "Someone on the same network, if the browser ever makes an http request.", fix: "Add Secure." });
    if (!k.httpOnly && sessiony)
      add(report, "finding", { id: "live-cookie-httponly", severity: "Medium", title: `Cookie ${k.name} can be read by scripts`, where: `GET ${from}`, proof: "No HttpOnly.", who: "Any script that gets onto the page can copy it.", fix: "Add HttpOnly." });
    if (!k.sameSite)
      add(report, "check", { id: "live-cookie-samesite", severity: "Low", title: `Cookie ${k.name} has no SameSite`, where: `GET ${from}`, proof: "Browsers treat it as Lax, but say so.", who: "Other sites making requests with it, in older browsers.", fix: "Add SameSite=Lax." });
  }

  /* Files that must never be served. Each is one GET, no redirects. */
  const probes = [
    ["/.git/HEAD", (b) => /^ref: refs\/|^[0-9a-f]{40}\s*$/.test(b.trim())],
    ["/.git/config", (b) => /\[core\]/.test(b)],
    ["/.env", (b) => /^\s*[A-Z_][A-Z0-9_]*\s*=/m.test(b)],
    ["/.env.local", (b) => /^\s*[A-Z_][A-Z0-9_]*\s*=/m.test(b)],
    ["/.env.production", (b) => /^\s*[A-Z_][A-Z0-9_]*\s*=/m.test(b)],
  ];
  let exposed = 0;
  for (const [path, real] of probes) {
    await pause();
    const r = await get(new URL(path, final).href, { maxBytes: 4096 });
    if (r.status === 200 && !looksHtml(r.body) && real(r.body)) {
      exposed++;
      add(report, "finding", {
        id: path.startsWith("/.git") ? "git-exposed" : "env-exposed",
        severity: "Critical",
        title: `${path} is served to anyone`,
        where: `GET ${new URL(path, final).href} -> ${r.status}`,
        proof: `It answers 200 with ${path.startsWith("/.git") ? "git's own file" : "KEY=value lines"} (first line: "${r.body.trim().split("\n")[0].replace(/=.*/, "=...").slice(0, 40)}").`,
        who: path.startsWith("/.git") ? "Anyone. With .git they can download the whole source and its history, secrets included." : "Anyone. They get the site's secrets.",
        fix: "Stop deploying the file (check the build output folder), then rotate every secret it held.",
      });
    }
  }
  if (!exposed) report.fine.push(".git and .env files aren't served.");

  /* Scripts on the page */
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)].map((m) => ({ src: m[1], tag: m[0] }));
  const preloads = [...html.matchAll(/<link\b[^>]*rel\s*=\s*["']modulepreload["'][^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => ({ src: m[1], tag: m[0] }));
  const own = [];
  const thirdParty = new Map();
  for (const s of [...scripts, ...preloads]) {
    let u;
    try {
      u = new URL(s.src, final);
    } catch {
      continue;
    }
    if (u.hostname === final.hostname || siteOf(u.hostname) === siteOf(final.hostname)) own.push(u.href);
    else {
      const e = thirdParty.get(u.hostname) ?? { sri: true, urls: [] };
      e.urls.push(u.href);
      if (!/\bintegrity\s*=/.test(s.tag)) e.sri = false;
      thirdParty.set(u.hostname, e);
    }
  }
  for (const [host, e] of thirdParty)
    if (BAD_SCRIPT_HOSTS.test(host))
      add(report, "finding", { id: "live-compromised-script-host", severity: "Critical", title: `The page loads a script from ${host}`, where: `GET ${at}`, proof: e.urls[0], who: "Whoever controls that host, which has served malware.", fix: "Remove it." });
    else
      add(report, "check", { id: "live-third-party-script", severity: "Low", title: `The page runs a script from ${host}`, where: `GET ${at}`, proof: `${e.urls[0]}${e.sri ? " (with an integrity hash)" : " (no integrity hash)"}`, who: "Whoever runs or takes over that host.", fix: "Keep it only if needed; pin it with an integrity hash or self-host it." });
  if (!thirdParty.size) report.fine.push("Every script on the page comes from the site itself.");
  const fonts = [...html.matchAll(/(?:https?:)?\/\/fonts\.(?:googleapis|gstatic)\.com[^"'\s)>]*/gi)].map((m) => m[0]).sort((a, b) => b.length - a.length);
  if (fonts.length)
    add(report, "finding", {
      id: "live-google-fonts",
      severity: "Medium",
      title: "The page loads fonts from Google",
      where: `GET ${at}`,
      proof: fonts[0].slice(0, 120),
      who: "Legal risk: every visitor's IP address goes to Google without consent. LG Munchen I, 3 O 17493/20 (20 Jan 2022) awarded EUR 100 under GDPR Art. 82.",
      fix: "Self-host the fonts and remove the Google URLs.",
    });
  for (const m of html.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*["']((?:https?:)?\/\/[^"']+)["']/gi)) {
    const host = new URL(m[1], final).hostname;
    if (siteOf(host) !== siteOf(final.hostname))
      add(report, "check", { id: "live-third-party-frame", severity: "Low", title: `Embeds ${host}`, where: `GET ${at}`, proof: m[1].slice(0, 120), who: "Legal risk if the embed sets cookies before consent (YouTube does; youtube-nocookie.com doesn't until play).", fix: "Use the provider's privacy mode or a click-to-load placeholder." });
  }

  /* Source maps for up to 5 of the site's own scripts. */
  let mapsServed = 0;
  for (const src of [...new Set(own)].slice(0, 5)) {
    await pause();
    const js = await get(src, { maxBytes: 3_000_000 });
    if (js.status !== 200) continue;
    const ref = [...js.body.matchAll(/\/\/[#@]\s*sourceMappingURL=([^\s'"]+)/g)].pop()?.[1] ?? js.headers.sourcemap ?? js.headers["x-sourcemap"];
    if (ref && ref.startsWith("data:")) {
      mapsServed++;
      add(report, "finding", { id: "live-source-map", severity: "Medium", title: "A script carries its whole source map inline", where: src, proof: "sourceMappingURL=data:...", who: "Anyone with dev tools: the original source, comments and all.", fix: "Turn source maps off for production builds." });
      continue;
    }
    const candidates = [ref ? new URL(ref, src).href : null, src.split("?")[0] + ".map"].filter(Boolean);
    for (const mapUrl of [...new Set(candidates)]) {
      await pause();
      const m = await get(mapUrl, { maxBytes: 4096 });
      if (m.status === 200 && /^\s*\{/.test(m.body) && /"(mappings|sources)"/.test(m.body)) {
        mapsServed++;
        add(report, "finding", {
          id: "live-source-map",
          severity: "Medium",
          title: "Source maps are served",
          where: `GET ${mapUrl} -> 200`,
          proof: "It returns a source map, which rebuilds the original source.",
          who: "Anyone with dev tools.",
          fix: "Don't deploy .map files (turn them off in the build, or upload them only to the error tracker).",
        });
        break;
      }
    }
  }
  if (own.length && !mapsServed) report.fine.push(`No source maps served for the ${Math.min(own.length, 5)} scripts checked.`);

  /* robots.txt is public. Paths it hides from search engines are a list
     of places to look. */
  await pause();
  const robots = await get(new URL("/robots.txt", final).href, { maxBytes: 65536 });
  if (robots.status === 200 && !looksHtml(robots.body)) {
    const hidden = [...robots.body.matchAll(/^\s*disallow:\s*(\S+)/gim)].map((m) => m[1]).filter((p) => /admin|stats|private|internal|dashboard|secret|backup|staging|debug|api/i.test(p));
    if (hidden.length)
      add(report, "check", { id: "robots-paths", severity: "Low", title: "robots.txt points at private-sounding paths", where: `GET ${new URL("/robots.txt", final).href}`, proof: hidden.join(", "), who: "Anyone reading robots.txt gets a list of places to try. Fine if each is behind a sign-in.", fix: "Check each path refuses a signed-out request. robots.txt hides nothing." });
  }

  if (opts.dns !== false && !/^\d+\.\d+\.\d+\.\d+$|^\[|^localhost$/.test(final.hostname)) {
    const d = await checkDns(final.hostname, opts.resolver);
    report.findings.push(...d.findings);
    report.checks.push(...d.checks);
    report.fine.push(...d.fine);
    report.skipped.push(...d.skipped);
  } else if (opts.dns === false) report.skipped.push("DNS: turned off with --no-dns");
  return report;
}

/* Hosting providers where a name can be claimed by whoever signs up first
   once the owner deletes their app. fp is the page they show for a name
   with nothing behind it. */
export const TAKEOVER_PROVIDERS = [
  { name: "GitHub Pages", re: /\.github\.io$/i, fp: /There isn't a GitHub Pages site here/i },
  { name: "Heroku", re: /\.(herokuapp|herokudns|herokussl)\.com$/i, fp: /no-such-app|No such app/i },
  { name: "Vercel", re: /(vercel-dns\.com|\.vercel\.app|\.now\.sh)$/i, fp: /DEPLOYMENT_NOT_FOUND|The deployment could not be found/i },
  { name: "Netlify", re: /\.netlify\.(app|com)$/i, fp: /Not Found - Request ID/i },
  { name: "AWS S3", re: /\.s3[.-]([\w-]+\.)?amazonaws\.com$|\.s3-website[.-][\w.-]+amazonaws\.com$/i, fp: /NoSuchBucket|The specified bucket does not exist/i },
  { name: "Azure", re: /\.(azurewebsites\.net|cloudapp\.net|cloudapp\.azure\.com|trafficmanager\.net|blob\.core\.windows\.net|azureedge\.net)$/i, fp: /404 Web Site not found|The resource you are looking for has been removed/i },
  { name: "Shopify", re: /\.myshopify\.com$/i, fp: /Sorry, this shop is currently unavailable/i },
  { name: "Surge", re: /\.surge\.sh$/i, fp: /project not found/i },
  { name: "Ghost", re: /\.ghost\.io$/i, fp: /Domain is not configured|Failed to resolve DNS path/i },
  { name: "Fly", re: /\.fly\.dev$/i, fp: null },
  { name: "Render", re: /\.onrender\.com$/i, fp: null },
  { name: "Cloudflare Pages", re: /\.pages\.dev$/i, fp: null },
  { name: "Webflow", re: /proxy(-ssl)?\.webflow\.com$/i, fp: /The page you are looking for doesn't exist or has been moved/i },
  { name: "Tumblr", re: /domains\.tumblr\.com$/i, fp: /Whatever you were looking for doesn't currently exist/i },
  { name: "Pantheon", re: /\.pantheonsite\.io$/i, fp: /The gods are wise/i },
];

const realResolver = {
  resolveCname: (h) => dns.promises.resolveCname(h),
  lookup: (h) => dns.promises.lookup(h, { all: true }),
};

export async function checkDns(host, resolver = realResolver, fetchPage = (u) => get(u, { maxBytes: 65536 })) {
  const report = newReport();
  const apex = host.replace(/^www\./, "");
  const names = [...new Set([host, host.startsWith("www.") ? apex : `www.${host}`])];
  for (const name of names) {
    let chain = [];
    let cur = name;
    try {
      for (let i = 0; i < 6; i++) {
        const c = await resolver.resolveCname(cur);
        if (!c?.length) break;
        chain.push(c[0]);
        cur = c[0];
      }
    } catch (e) {
      if (!["ENODATA", "ENOTFOUND", "ENOTIMP", "NOTFOUND", "NODATA"].includes(e.code)) {
        report.skipped.push(`DNS: couldn't look up ${cur} (${e.code ?? e.message})`);
        continue;
      }
    }
    if (!chain.length) {
      report.fine.push(`${name} has no CNAME (it points straight at an address, or doesn't exist).`);
      continue;
    }
    const target = chain[chain.length - 1];
    const provider = TAKEOVER_PROVIDERS.find((p) => chain.some((c) => p.re.test(c.replace(/\.$/, ""))));
    if (!provider) {
      report.fine.push(`${name} is a CNAME for ${chain.join(" -> ")}, which isn't a provider this script knows can be claimed.`);
      continue;
    }
    let resolves = true;
    try {
      const a = await resolver.lookup(target);
      resolves = Array.isArray(a) ? a.length > 0 : !!a;
    } catch (e) {
      resolves = !["ENOTFOUND", "ENODATA", "NOTFOUND", "NODATA"].includes(e.code) ? null : false;
    }
    if (resolves === false) {
      add(report, "finding", {
        id: "dangling-dns",
        severity: "High",
        title: `${name} points at ${target}, which doesn't exist`,
        where: `DNS CNAME ${name} -> ${chain.join(" -> ")}`,
        proof: `${target} has no address, so the ${provider.name} name behind it is free.`,
        who: `Anyone who signs up to ${provider.name} and claims that name. They'd serve their own pages on ${name}, with your domain's cookies and reputation (subdomain takeover).`,
        fix: `Delete the ${name} CNAME at the DNS host, or point it at something you run.`,
      });
      continue;
    }
    if (provider.fp) {
      const page = await fetchPage(`https://${name}/`);
      if (page.status && provider.fp.test(page.body)) {
        add(report, "finding", {
          id: "dangling-dns",
          severity: "High",
          title: `${name} points at ${provider.name}, which has nothing there`,
          where: `DNS CNAME ${name} -> ${chain.join(" -> ")}; GET https://${name}/ -> ${page.status}`,
          proof: `${provider.name}'s "nothing here" page came back.`,
          who: `Anyone who adds ${name} to their own ${provider.name} account (subdomain takeover).`,
          fix: `Delete the CNAME, or add the domain back to your ${provider.name} project.`,
        });
        continue;
      }
    }
    report.fine.push(`${name} is a CNAME for ${provider.name} (${target}) and something answers there.`);
  }
  return report;
}

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

function sortItems(list) {
  return list.sort((a, b) => rank(a.severity) - rank(b.severity));
}

export function merge(...reports) {
  const out = newReport();
  for (const r of reports) {
    out.findings.push(...r.findings);
    out.checks.push(...r.checks);
    out.fine.push(...r.fine);
    out.skipped.push(...r.skipped);
  }
  sortItems(out.findings);
  sortItems(out.checks);
  return out;
}

export function toText(result) {
  const lines = [];
  lines.push(`site-scan of ${result.repo ?? "(no repo)"}${result.url ? ` and ${result.url}` : ""}`);
  lines.push(`${result.findings.length} findings, ${result.checks.length} to check by hand. These are leads: confirm each one before reporting it.`);
  const block = (title, items) => {
    lines.push("", title);
    if (!items.length) lines.push("  (none)");
    items.forEach((f, i) => {
      lines.push(`  ${i + 1}. [${f.severity}] ${f.title}  (${f.id})`);
      if (f.where.length) lines.push(`     where: ${f.where.join(", ")}`);
      if (f.proof) lines.push(`     proof: ${f.proof}`);
      if (f.who) lines.push(`     who:   ${f.who}`);
      if (f.fix) lines.push(`     fix:   ${f.fix}`);
    });
  };
  block("FINDINGS", result.findings);
  block("CHECK BY HAND", result.checks);
  lines.push("", "FINE");
  for (const f of result.fine) lines.push(`  - ${f}`);
  if (result.skipped.length) {
    lines.push("", "NOT CHECKED");
    for (const s of result.skipped) lines.push(`  - ${s}`);
  }
  return lines.join("\n");
}

export const failing = (result) => result.findings.some((f) => f.severity === "Critical" || f.severity === "High");

function parseArgs(argv) {
  const opts = { json: false, audit: true, history: true, dns: true, url: null, repo: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--no-audit") opts.audit = false;
    else if (a === "--no-history") opts.history = false;
    else if (a === "--no-dns") opts.dns = false;
    else if (a === "--url") opts.url = argv[++i];
    else if (a.startsWith("--url=")) opts.url = a.slice(6);
    else if (a === "-h" || a === "--help") opts.help = true;
    else if (!a.startsWith("-") && !opts.repo) opts.repo = a;
    else throw new Error(`unknown argument ${a}`);
  }
  return opts;
}

export async function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(e.message);
    return 2;
  }
  if (opts.help || (!opts.repo && !opts.url)) {
    console.log("usage: node site-scan.mjs <repo> [--url https://site] [--json] [--no-audit] [--no-history] [--no-dns]");
    return opts.help ? 0 : 2;
  }
  if (opts.url && !/^https?:\/\//.test(opts.url)) {
    console.error("--url needs to start with https:// or http://");
    return 2;
  }
  if (opts.repo && !existsSync(opts.repo)) {
    console.error(`no such folder: ${opts.repo}`);
    return 2;
  }
  const parts = [];
  if (opts.repo) parts.push(await scanRepo(opts.repo, opts));
  if (opts.url) parts.push(await scanLive(opts.url, opts));
  const result = { repo: opts.repo ? resolve(opts.repo) : null, url: opts.url, ...merge(...parts) };
  console.log(opts.json ? JSON.stringify(result, null, 2) : toText(result));
  return failing(result) ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => (process.exitCode = code));
}
