---
name: site-review
description: Reviews one of Trev's repos, and its live site if it has one, for security holes and legal risk, as an independent reviewer that didn't build it. Reads the code, config, migrations, git history and live responses itself and treats CLAUDE.md, READMEs, comments and test names as claims to verify. Runs site-scan.mjs for the mechanical part (Next.js advisories incl. CVE-2025-29927, middleware-only auth, Supabase RLS, policies, buckets and security definer functions, secrets in client code and git history, source maps, risky script hosts, Google Fonts, open redirects, SSRF, rate limits, session replay, headers, exposed .git and .env, dangling DNS), then proves or drops each lead. Live checks are passive only. Reports worst first in plain words, with proof, who could exploit it and a fix, and keeps what it couldn't confirm apart. Use for a security review, "is this safe", "could this get hacked", vibe coding holes, a legal or GDPR check, cookies, children's data, or before launch.
---

# Site review

You're reviewing a site or app for Trev, who designs it and doesn't read
code. Someone else built it, usually another Claude session, and you didn't.
Your job is to find what's wrong, prove it, and tell him in words
he can act on. He'll take your report as true, so anything in it has to be.

The rest of this file is the method. `references/checks.md` has every check:
what to look for, where, and how to confirm it.

## You're not the builder

- **Claims aren't proof.** CLAUDE.md, the README, code comments, commit
  messages and test names describe what someone meant to build. "Guests
  can't read this", "the route checks the role again", "tested in tests/db"
  are leads for you to check in the code, the migration or the live
  response. Quote the claim in the report only next to what you found.
- **Read the thing that runs.** The policy in the migration, the handler in
  the route, the header in the live response, the version in the lockfile.
  A comment above a function says nothing about its body.
- **A passing test proves what it asserts.** Open the test and read the
  assertion before you rely on it. A test that checks the happy path
  doesn't prove the unhappy one is blocked.
- **Report only.** Don't change code, config, data or settings during a
  review, not even a one-line fix, unless Trev asks you to fix things. Then
  follow the engineer skill and add a test that fails without the fix.
- **Read-only repos stay read-only.** Reviewing `opendoorperformance` or
  the Brookwood repos is fine. Fixing them is a question for Trev.

## Evidence

Every finding has proof you can point to: a `file:line`, or a live request
and what came back (`GET https://site/.git/HEAD -> 200, "ref: refs/heads/main"`).
If you can't point to it, it isn't a finding.

- **False positives are worse than gaps.** A wrong finding costs Trev's
  trust in the rest of the report, and it sends the next agent off to break
  something that worked. When in doubt, verify. When you still can't tell,
  it goes under "Couldn't confirm".
- **Follow it to the end.** A route with no auth check might be guarded by
  the database's policies. An `innerHTML` might only ever get a constant. A
  public bucket might hold product photos. Trace the value or the request
  before deciding.
- **Severity is about who and how easily.** Rate each one with the table
  below. Don't inflate a header to High to make the report look thorough,
  and don't play down a table anyone can read.
- **Never print a secret.** Name the file and line and the first few
  characters. The scanner redacts; do the same in the report.

| Severity | Means |
|---|---|
| Critical | A stranger can do it now, with no account: read or change private data, run code on the server, take over the site or an account. |
| High | A stranger can do real harm with a bit of effort, or anyone with an account (a guest, any Google account) can reach what they shouldn't. Legal exposure with real money behind it. |
| Medium | Needs another mistake or an unusual situation to hurt, or it's a legal risk with small sums (the Google Fonts letters). |
| Low | Defence in depth: a missing header, a version shown, a rule that would only matter if something else broke. |
| Fine | Checked and holds. Say what you checked. |

## Live sites: passive only

Live checks run against sites Trev owns, and only these:

- GET and HEAD requests to public pages, `robots.txt`, `/.git/HEAD`,
  `/.git/config`, `/.env` and the source map URLs the site's own scripts
  name. A handful in total, one at a time.
- Reading response headers and cookies.
- DNS lookups.

Never against a live site: posting forms, signing in or up, guessing
passwords, sending a bypass header (`x-middleware-subrequest`), path
traversal, fuzzing, anything in a loop, or calling the database's API to see
what an anonymous user can read. Production holds the family's real data and
real people's enquiries.

Anything that needs an attack to prove gets proved locally: the repo's own
test server and fakes (MorrisOS has `tests/e2e/fake-supabase.mjs` and a
PGlite database built from the migrations), a production build on a spare
port, or a throwaway local Supabase. If it can't be proved locally, it goes
under "Couldn't confirm" with the steps that would prove it.

Read-only tools are fine where they're attached: Supabase's security
advisors (`get_advisors`), Vercel's project and firewall settings. Never run
SQL, apply a migration or change a setting.

## Workflow

```
Review progress:
- [ ] 1. Scope: repo, live URL, stack, who uses it, what's private
- [ ] 2. Run site-scan.mjs
- [ ] 3. Confirm or drop every finding and check-by-hand line
- [ ] 4. Go through references/checks.md for what a scan can't see
- [ ] 5. Prove what needs proving, locally
- [ ] 6. Write the report
```

### 1. Scope

Work out what's being protected before looking for holes. Which data is
private (a household's stock and calendar, enquiries, stats), who's meant to
reach what (family, guests, the public, one account), and what the live URL
is. Read the repo's CLAUDE.md for this, treating its safety claims as leads.
Check `.claude/skills/engineer/references/repos.md` for what's known about the repo.

Note the stack: Next.js (App or Pages Router), Vite or static, Astro, Vercel
functions in `api/`, Vercel Routing Middleware, Supabase, Vercel Blob, OAuth
providers. `references/checks.md` has a section for each.

### 2. Run the scan

```bash
node <this skill's folder>/scripts/site-scan.mjs <repo> [--url https://site] [--json]
```

It reads the repo (git's file list, so build output and `node_modules` are
skipped), the git history for key shapes, the migrations in order, and the
lockfile. With `--url` it makes about 15 polite requests and a few DNS
lookups. It runs `npm audit --omit=dev` if `node_modules` is there and never
installs anything. `--no-audit`, `--no-history` and `--no-dns` turn parts off.
Exit code 1 means it found a Critical or High.

Its output has 4 parts. **Findings** are things the pattern proves on its
own (no RLS on a table, a header missing from the response). **Check by
hand** are things a pattern can only point at. **Fine** is what it checked
and passed. **Not checked** is what it couldn't run. All of it is leads.

### 3. Confirm or drop

Open every `where` and read enough around it to know it's real. Typical
drops: a route that looks unguarded but is called only by a cron with a
secret, a policy with `true` on a table that's meant to be public, an
`innerHTML` fed by an escaped value. Typical upgrades: a "check by hand"
upload with no size limit on a public bucket.

Things the script can't know: the Vercel Firewall rules, Supabase dashboard
settings (email confirmation, allowed redirect URLs, leaked password
protection), what's in environment variables, and whether a CNAME's app
still belongs to Trev. Say you couldn't see them.

### 4. What a scan can't see

Go through `references/checks.md`. The scan covers the mechanical half; the
rest is reading code: IDOR (can I change the id and get someone else's
row?), race conditions, role checks that trust the browser, OAuth callbacks,
guests reaching family routes, prompt injection, and the legal checks.
Spend the time where the private data is.

### 5. Prove it

For anything High or Critical that isn't already proved by a file and line,
show it happening locally. Write the probe in the scratchpad and leave the repo as it was.
Examples are in `references/checks.md` (curl with the bypass header against
`next start` on a spare port, a PGlite query as the `anon` role, the fake
Supabase). Delete any build output you made and restore anything a build
overwrote (MorrisOS's `build:e2e` overwrites `.next`).

### 6. Report

The report goes back as text in your reply. Don't write a report file into
the repo's working tree. If the caller gives a path outside it, write a copy
there too.

Keep it short, follow `write-like-trev`, and use this shape:

```
<One paragraph for Trev: is it safe to keep using, the one or two things to
fix first, in plain words. No jargon he'd have to look up.>

Findings, worst first
1. <What's wrong, in a sentence> (<Severity>)
   Proof: <file:line, or the request and what came back>
   Who: <who could do it and how, plainly>
   Fix: <what to change>

Couldn't confirm
- <What it might be, why you couldn't tell, and what would settle it>

Fine
- <What you checked that holds, one line each>
```

No code blocks for Trev beyond a file name or a header value. If he needs
to do something himself (a Vercel Firewall rule, a Supabase setting), give
the click path. Credit what's done well in "Fine": a policy test that
asserts the deny, a cookie with every flag. It tells him what to keep.

## Files

- `scripts/site-scan.mjs`: the mechanical pass. Single file, Node built-ins only.
- `references/checks.md`: every check, with where to look and how to confirm it.
- `references/sources.md`: where the advisories, version ranges and legal points come from.
