# Security

Most of these apps are for family, friends or a few hundred visitors, so the
realistic threats are small: a curious guest, a shared link, a bot hammering
a form, a compromised dependency, an agent doing something it shouldn't. Fix
the realistic ones properly. Don't build a fortress around a static game.

## Access

- **Enforce access in the database and repeat it on the server.** Hiding a
  button is never the control. MorrisOS does this well: RLS through
  `is_family()` / `is_guest()`, the same `my_role()` used by the middleware,
  and guest limits checked again in `app/api/sonos/action/route.ts`.
- **Every table has RLS on, with named policies, in a migration file.**
  A policy that only exists in prose or in the dashboard is the gap to
  avoid. brookwood-hunt's `supabase/setup.sql` is the model.
- **New tables default to the strictest role.** A hand-kept list of tables
  to lock down misses the next table someone adds. Prefer a test that asserts
  every public table's policies, with an allowlist for exceptions (MorrisOS
  has one in `tests/db`).
- **Guard against locking everyone out.** MorrisOS's last-adult trigger is
  the pattern.
- **Allowlist who can sign in** when an app is for named people. Signing in
  with Google alone lets in any Google account.
- **Middleware uses `getUser()`** (`getSession()` trusts the cookie) and fails closed
  when the role check errors.

## Input

- Validate every request body on the server with a schema (zod is already
  used in condiment-gallery). Parse inside the `try`. Reject unknown shapes
  with a 400 and a plain message.
- Clamp numbers, cap string lengths, allow only `https:` for user-supplied
  links, and check types as well as shapes when loading shared or saved
  data (a share link packed into the URL is untrusted input).
- Escape everything that came from a person or a third party before it goes
  into HTML. Never `innerHTML` a response from someone else's server;
  rebuild it from an allowlist, as designedbytrev does with its GitHub graph.
- Forms that anyone can reach get a honeypot and length limits, and a rate
  limit if they send email or write data.
- Never show a query parameter back to the user as a message without an
  allowlist of known codes.

## Passwords and sessions

- Compare secrets in constant time.
- Session cookies: `HttpOnly; Secure; SameSite=Lax`, an expiry that matches
  the comment, and a value that's an HMAC of an issued-at time with a
  separate secret. A hash of the password itself can't be revoked and can
  be cracked offline.
- Rate-limit password forms (Vercel firewall rule or a counter in storage).
  Limit per address; an overall limit lets a stranger lock the owner out.
- A function behind a password checks the cookie itself as well as the
  middleware. Vercel answers `/api/name.js` as well as `/api/name`, so a
  middleware that matches exact paths can miss one.

## Secrets

- Never commit secrets, passwords, tokens or personal data. Use Vercel env
  vars and `.env.local`. Commit a `.env.example` (check `.gitignore` doesn't
  swallow it: a `.env*` rule does).
- Don't derive an encryption key from a secret that might be rotated
  without writing down what rotating it breaks (a sealed sign-in that has
  to be reconnected, say).
- Server-only tokens stay server-only. Don't give the browser a policy that
  can read them.

## Errors

- Users get a plain message from `write-like-trev`. The detail goes to the
  server log. Never show a raw database, crypto or stack message.

## Fonts

- Serve fonts from the site. Loading them from Google Fonts sends every
  visitor's address to Google before they've agreed to anything. Keep each
  family's OFL licence next to its files, and allow `font-src 'self'`.

## Headers

Every site sets these (Next: `next.config` `headers()`; static: `vercel.json`):

- `Content-Security-Policy` with at least `frame-ancestors 'none';
  object-src 'none'; base-uri 'self'; form-action 'self'`, and a
  `script-src` where the app allows it.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Strict-Transport-Security`,
  `Permissions-Policy` listing only what's used.
- `poweredByHeader: false` on Next.

MorrisOS and brookwood-village have good examples.

## Agents and automation

- `.claude/settings.json` must not pre-approve tools that change live data
  (`execute_sql`, `apply_migration`, deploys, deletes). Every change to a
  live database needs Trev's yes for that change.
- GitHub Actions: least `permissions:` at job level, actions pinned to a
  sha, untrusted event data passed through `env:` and never inlined into
  `run:` with `${{ }}`.

## Dependencies

- Lockfile committed. `npm audit --omit=dev` in the audit, with high and
  critical findings fixed or explained.
- Few dependencies is a feature (eye-for-type has none). Ask before adding
  one for something a few lines would do.
