# Checks

Each check says what to look for, where, and how to confirm it. The id in
brackets is what `site-scan.mjs` prints when it covers the check; anything
without one is yours to read. "Locally" means against the repo's own build,
test server or fakes, never the live site.

## The 20 ways sites like these get hacked

### 1. Next.js middleware bypass (CVE-2025-29927) [next-advisory, middleware-only-auth]

- **Look for:** Next.js from 11.1.4 to before 12.3.5, 13.0.0 to 13.5.8, 14.0.0 to 14.2.24 or 15.0.0 to 15.2.2, with a `middleware.ts` that does sign-in or roles. Then whether routes and pages check again themselves.
- **Where:** the installed version (`node_modules/next/package.json`, then `package-lock.json`), `middleware.ts` or `src/middleware.ts` (`proxy.ts` on Next 16).
- **Confirm:** locally only. `npm run build && npx next start -p 4390`, then `curl -i -H 'x-middleware-subrequest: middleware:middleware:middleware:middleware:middleware' http://localhost:4390/<protected path>` (use `src/middleware:...` if the file's in `src/`). A 200 where a signed-out request gets a redirect proves it. On a patched version the header does nothing; the finding is then "only checked in middleware", which is a lower severity. Vercel's own hosting blocked this header in March 2025, but self-hosted and older deploys didn't.

### 2. Exposed .git folder [git-exposed]

- **Look for:** `/.git/HEAD` answering 200 with `ref: refs/heads/...`, or `/.git/config` with `[core]`.
- **Where:** live. Also check the build copies nothing from the repo root into the output folder (`cp -r . dist` in a build script).
- **Confirm:** the scan's GET is the proof. An HTML page with 200 is the site's fallback and is fine.

### 3. Public Supabase storage buckets [public-bucket]

- **Look for:** `insert into storage.buckets (..., public, ...) values (..., true)`, `public = true` in `supabase/config.toml`, and select policies on `storage.objects` that let `anon` list files.
- **Where:** `supabase/migrations`, `supabase/config.toml`, and the storage policies in the baseline.
- **Confirm:** read what the bucket holds. Product photos can be public; ID documents, receipts and family photos can't. Listing is the bigger risk: a public bucket only serves files whose name you know, unless a policy also allows `select` on `storage.objects`.

### 4. Prices trusted from the browser [client-price]

- **Look for:** `unit_amount`, `amount` or `price_data` built from the request body in a checkout or payment route. A price id from the body is fine only if it's checked against the products on sale.
- **Where:** routes calling `stripe.checkout.sessions.create` or `paymentIntents.create`, and any order total the server saves.
- **Confirm:** read where the value comes from. Locally, post the same request with a changed amount to the route on a dev server with Stripe test keys.

### 5. Credential stuffing [login-no-rate-limit]

- **Look for:** any password form (a stats page, a site password, a custom login) with no rate limit, and Supabase projects with leaked password protection off.
- **Where:** routes and middleware that read `password`; Supabase Auth settings.
- **Confirm:** read the handler for a counter. An in-memory `Map` slows a script but resets with each new instance, so the real limit is a Vercel Firewall rule; ask Trev whether it's set, or read it with the Vercel connector if attached. Never test by posting passwords to the live site.

### 6. Open database (no RLS) [table-without-rls, policy-true, policy-true-read, view-bypasses-rls, materialized-view]

- **Look for:** public tables with no `enable row level security`, policies whose condition is `true`, policies `to authenticated` on apps where anyone with a Google account can sign in, views without `security_invoker = true`, and grants to `anon`.
- **Where:** every file in `supabase/migrations` in order (later files can fix or break earlier ones). Ignore folders that aren't run (MorrisOS's `supabase/history`).
- **Confirm:** locally, with the repo's own policy tests if it has them (MorrisOS's `tests/db` builds the schema in PGlite), or `supabase start` and a query as anon: `curl 'http://127.0.0.1:54321/rest/v1/<table>?select=*' -H "apikey: <local anon key>"`. Supabase's `get_advisors` (security) is read-only and fine against the live project. Read the test before trusting it: does it assert that a stranger gets nothing back?

### 7. Compromised third-party scripts [compromised-script-host, third-party-script, live-third-party-script]

- **Look for:** scripts from polyfill.io and the hosts that went with it (bootcss, bootcdn, staticfile), and any script from another company without an integrity hash.
- **Where:** `<script src>` in HTML and JSX, `next/script`, scripts added by code, and the live HTML.
- **Confirm:** the scan lists hosts. For each one, ask why it's there and whether a copy served from the site would do.

### 8. SMS pumping [form-no-rate-limit]

- **Look for:** any route that sends a text (Twilio, Vonage, MessageBird, Supabase phone sign-in) reachable without signing in and without a limit per number and per address.
- **Where:** API routes, Supabase Auth phone settings.
- **Confirm:** read the route. Never send a text to prove it.

### 9. Prompt injection [prompt-injection]

- **Look for:** a model that reads text someone else wrote (form input, web pages, email, shared docs) and can call tools or see data the writer shouldn't.
- **Where:** routes using the Anthropic or OpenAI SDKs, the AI SDK, `.claude/settings.json` and skills that act on real accounts (MorrisOS's shopping skills).
- **Confirm:** list what the model can do with its tools and who can put text in front of it. Locally, put an instruction in test input and see whether it's followed. Agent settings that pre-approve live database or deploy tools are a finding on their own.

### 10. Weak JWT or cookie secrets [secret-fallback, hardcoded-signing-key, cookie-flags]

- **Look for:** `process.env.X_SECRET || "something"`, signing keys written in code, cookies that hold a hash of the password (can't be revoked), and session cookies without HttpOnly, Secure and SameSite.
- **Where:** middleware, auth helpers, routes that set cookies.
- **Confirm:** read the signing code. A key derived from the password plus a separate secret, with an expiry, is the pattern designedbytrev and ground-frames-register use.

### 11. Race conditions

- **Look for:** read-then-write without a lock or a conditional update: redeeming a code, spending credit, a "first come" slot, refreshing an OAuth token. Two requests at once both pass the check.
- **Where:** routes that check a value and then change it; token refresh code (MorrisOS's `lib/token-refresh.ts` uses a compare-and-set lease for this reason).
- **Confirm:** locally, fire the same request twice in parallel (`Promise.all`) against the dev server or a unit test with a fake store, and see whether both succeed.

### 12. Account pre-hijacking [email-unconfirmed]

- **Look for:** email sign-up without confirmation on an app that also has Google sign-in and links accounts by email, so someone can register your address first and keep access after you sign in with Google.
- **Where:** `supabase/config.toml` (`enable_confirmations`), the Supabase dashboard (Auth, Providers, Email: Confirm email), custom sign-up code.
- **Confirm:** the dashboard setting decides it, so ask Trev or read it with a connector. Apps limited to an allowlist (MorrisOS's household) aren't exposed.

### 13. Subdomain takeover [dangling-dns]

- **Look for:** a CNAME for the domain, `www` or any subdomain Trev mentions, pointing at a provider name that no longer exists or shows the provider's "nothing here" page.
- **Where:** DNS (`dig CNAME`), live.
- **Confirm:** the scan resolves the target and fetches the page. For other subdomains, ask Trev which exist and run `node -e` with `dns.promises.resolveCname`.

### 14. SSRF [ssrf]

- **Look for:** the server fetching an address taken from the request: image proxies, link previews, webhooks, "import from URL".
- **Where:** API routes and server actions.
- **Confirm:** read how the address is built. A fixed host with a checked path (MorrisOS's Plex poster route) is fine. Locally, ask the route for `http://127.0.0.1:<another local port>/` and see whether it fetches it.

### 15. Path traversal [path-traversal]

- **Look for:** a file read or written with a name from the request.
- **Where:** API routes, Vercel functions, build scripts that take arguments.
- **Confirm:** locally, ask for `../package.json`.

### 16. Password reset poisoning [host-header-link]

- **Look for:** reset, magic link or invite emails whose link is built from the `Host` or `X-Forwarded-Host` header, and Supabase `redirectTo` taken from the request.
- **Where:** routes that send auth emails; the Supabase dashboard's redirect URL allowlist.
- **Confirm:** read where the link's origin comes from. Locally, send the request with `-H 'Host: evil.test'` and read the email the fake mailer captured.

### 17. Public source maps [source-maps, source-maps-hidden, live-source-map]

- **Look for:** `productionBrowserSourceMaps: true`, `build.sourcemap: true` or `'inline'`, `.map` files in `public/`, and maps served next to the live scripts.
- **Where:** `next.config.*`, `vite.config.*`, `astro.config.*`, the live scripts.
- **Confirm:** the scan fetches the map for up to 5 of the site's scripts. 'hidden' maps are still deployed unless the build deletes them.

### 18. Clickjacking [clickjacking, live-clickjacking]

- **Look for:** no `frame-ancestors` in the CSP and no `X-Frame-Options`, on a page with buttons or forms.
- **Where:** live headers; `next.config` `headers()`, `vercel.json`, middleware.
- **Confirm:** the live response is the proof. A page with nothing to click is Low.

### 19. Open redirects [open-redirect]

- **Look for:** `redirect(next)` where `next` came from the query, including OAuth `returnTo` and `?next=` after sign-in.
- **Where:** routes, middleware, auth callbacks.
- **Confirm:** locally, `curl -i 'http://localhost:PORT/route?next=https://example.com'` and read the Location header. `//example.com` and `/\example.com` get past a plain `startsWith("/")`.

### 20. User enumeration [user-enumeration]

- **Look for:** sign-in, sign-up or reset saying "no account with that email", or answering faster when the account doesn't exist.
- **Where:** auth routes and the messages they return; Supabase's own endpoints answer the same either way.
- **Confirm:** read the messages. Don't probe the live site with emails.

## Legal

### Children: age checks, COPPA and the UK Children's Code [age-check, personal-data-client]

- **Look for:** sign-up open to anyone on something children might use, and any child's name, age, birthday, school or photo in code or files the browser gets.
- **Where:** sign-up and sign-in code; `public/`, client components, JSON bundled into pages, the live JavaScript. MorrisOS's README has a "Keeping the family private" check: run it, then also search the built `.next/static` yourself.
- **Confirm:** who can make an account (an allowlist is fine), and for personal data, search the built client output: `grep -rIl '<name>' .next/static dist` with the names Trev gives you. Don't put the names in the report.

### Google Fonts from Google's servers [google-fonts, live-google-fonts]

- **Look for:** `fonts.googleapis.com` or `fonts.gstatic.com` loaded by the page. `next/font/google` downloads the files at build time and serves them from the site, so it's fine.
- **Where:** HTML `<link>`, CSS `@import`, the live HTML.
- **Confirm:** the live HTML is the proof. LG Munchen I, 3 O 17493/20, 20 Jan 2022: EUR 100 under GDPR Art. 82 for sending a visitor's IP address to Google without consent, followed by a wave of demand letters. Low money, real nuisance.

### Session replay [session-replay, replay-unmasked, posthog-replay]

- **Look for:** Sentry Replay, LogRocket, Hotjar, Clarity, FullStory, PostHog recording, especially with masking turned off.
- **Where:** analytics and error-tracking setup (`sentry.client.config.*`, `instrumentation-client.*`, layout scripts).
- **Confirm:** read the config, and for PostHog ask whether recording is on in the project settings. Recording without consent is a PECR and GDPR problem; recording keystrokes unmasked is a breach waiting to happen.

### Tracking cookies without consent [tracking-without-consent]

- **Look for:** Google Analytics, Tag Manager, ad pixels, YouTube embeds, loaded before anyone agrees.
- **Where:** layouts, `index.html`, the live HTML.
- **Confirm:** load the live page in a fresh browser profile (Playwright, no clicks) and list the cookies set. Vercel Analytics and Plausible set none.

### Marketing email [marketing-email]

- **Look for:** newsletters or campaigns without an unsubscribe link, a List-Unsubscribe header and a postal address.
- **Where:** email sending code and templates.
- **Confirm:** read a template. Transactional email (a receipt, an enquiry alert to Trev) doesn't need one.

### Subscriptions [subscription-terms]

- **Look for:** recurring payments without the price, renewal period and how to cancel shown by the button, and cancelling that's harder than signing up.
- **Where:** pricing pages, checkout code (`mode: 'subscription'`).
- **Confirm:** look at the page at 390 wide: are the terms next to the button without scrolling? UK DMCC Act 2024 subscription rules, US state auto-renewal laws.

### User uploads and takedowns [uploads]

- **Look for:** anyone being able to upload files that others can see, with no way to take something down, no size or type limit, and HTML or SVG served from the site's own domain.
- **Where:** upload components, storage buckets and their limits, Vercel Blob `put()` and client uploads.
- **Confirm:** read the bucket's `file_size_limit` and `allowed_mime_types` and who the policy allows to insert. For takedowns, is there a contact address and a way to delete a file?

## Stacks

### Next.js

- Version against advisories [next-advisory]. The scan's table is a floor; `npm audit` and the Next.js security advisories page are the full list.
- Every route handler and server action checks the user itself. Server actions are public POST endpoints: anyone can call one with any arguments.
- `getUser()` in middleware and on the server (`getSession()` trusts the cookie).
- `poweredByHeader: false`, headers in `next.config` `headers()`.
- Anything imported by a client component ends up in the browser; `import "server-only"` on files with secrets.
- `NEXT_PUBLIC_` variables are in the client bundle [public-env-secret].
- Images: `images.remotePatterns` limited to known hosts (an open pattern is an image proxy for anyone).

### Vite and static sites

- `VITE_` variables are in the bundle [public-env-secret].
- Everything in `public/` is served as it is [secret-in-client, source-maps-public].
- Headers come from `vercel.json`; check the CSP matches the inline scripts (designedbytrev has `npm run csp`).
- `innerHTML` with anything from another site or the URL [html-injection].

### Astro

- `PUBLIC_` variables are in the bundle. Server endpoints in `src/pages/**/*.ts` need the same checks as API routes. `set:html` is Astro's `innerHTML`.

### Vercel functions and Routing Middleware

- Functions in `api/` are public URLs. Each checks its own caller; a middleware path pattern is easy to change and leave a function open [middleware-only-auth].
- Cron routes check `CRON_SECRET` (Vercel sends it as a bearer token).
- Rate limits in memory are per instance [rate-limit-in-memory]; the Vercel Firewall rule is the real limit, and the repo can't show it.
- `vercel.json` rewrites can expose files you didn't mean to serve.

### Supabase

- RLS and policies as in check 6. Policies use helper functions (`is_family()`), and those helpers are `security definer` with `set search_path = ''` [definer-search-path] and `execute` revoked from `anon` where callers shouldn't use them directly [definer-rpc].
- RPC: every function in `public` is callable at `/rest/v1/rpc/<name>`. A security definer one skips RLS, so read what it returns.
- Auth: allowed redirect URLs, email confirmation, leaked password protection, sign-ups open or closed. Dashboard settings; ask or read with a connector.
- Storage as in check 3.
- Keys: the anon or publishable key is public by design. The service role or secret key must never reach the browser [secret-in-client], and server code that uses it skips RLS, so it must check the user itself first.
- Realtime: tables in the `supabase_realtime` publication broadcast changes to anyone whose policies allow select.

### Vercel Blob

- `access: 'public'` blobs are readable by anyone with the URL. Private data uses private blobs read through a function that checks the caller.
- Client uploads: `handleUpload` limits content types and size in `onBeforeGenerateToken`, and checks the user there.
- Conditional writes (`ifMatch`) for anything 2 devices can save at once.

### OAuth flows [oauth-no-state]

- A random `state` kept in an httpOnly cookie and checked in the callback; PKCE where the provider supports it.
- Redirect URIs registered in full, with no wildcards.
- Tokens stored server-side and sealed; refresh in one place (MorrisOS's `lib/token-refresh.ts`).
- The callback's `?next=` is an open redirect unless checked [open-redirect].

### Cookies [cookie-flags, live-cookie-secure, live-cookie-httponly, live-cookie-samesite]

- Session cookies: `HttpOnly; Secure; SameSite=Lax`, an expiry, and a value that's signed with a separate secret.

### CSP and security headers [live-no-csp, no-csp, csp-unsafe-inline, csp-unsafe-eval, live-no-hsts, live-no-nosniff, live-no-referrer-policy, live-no-permissions-policy, live-powered-by]

- At least `frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`, a `script-src` without `'unsafe-inline'` where the stack allows it, HSTS, nosniff, Referrer-Policy and a Permissions-Policy listing only what's used.

### Secrets in client bundles and git history [secret-in-client, secret-in-repo, secret-in-history, env-committed, public-env-secret]

- Search the built output as well as the source: `grep -rIE 'sb_secret_|sk_live_|service_role|PRIVATE KEY' .next/static dist out`.
- `git log` keeps every key ever committed. A removed key still needs revoking.
- `.env*` files tracked by git (`git ls-files | grep env`).

### Dependencies [npm-audit]

- `npm audit --omit=dev` for what ships. Read the advisory before calling a transitive one exploitable: the app may never use the vulnerable part.
- Lockfile committed; GitHub Actions pinned to a sha with least `permissions:`.

### Rate limits on forms and logins [form-no-rate-limit, login-no-rate-limit, rate-limit-in-memory]

- Any public route that sends email, sends texts, writes to the database or checks a password needs a limit. Honeypots and Origin checks stop lazy bots only.

### Email header injection

- **Look for:** a subject, name or reply-to taken from a form and put into email headers without removing line breaks. Raw SMTP and old mail libraries are the risk; Resend's JSON API and current nodemailer reject line breaks in headers.
- **Confirm:** read the send call and the library version. Locally, send a name containing `\r\nBcc: test@example.com` through a fake mailer.

### File upload validation [uploads]

- Size and type checked on the server or the bucket, never only in the browser. File names taken from the user stripped to a safe pattern. SVG and HTML served with `Content-Disposition: attachment` or from another domain.

### IDOR

- **Look for:** a route that takes an id (`/api/notes/123`, `?id=`) and returns or changes the row without checking it belongs to the caller. RLS covers this when the route uses the user's own Supabase client; it doesn't when the route uses the service key.
- **Where:** every route with an id in the path, query or body.
- **Confirm:** locally, sign in as one test user and ask for another's id. With MorrisOS's fake Supabase, use the guest role.

### CORS [cors-credentials, cors-reflect]

- `Access-Control-Allow-Origin` echoing the request or `*` together with `Allow-Credentials: true` lets any site read signed-in answers. `*` on public static files is normal (Vercel sends it).

### Cache headers on private data [private-cached]

- Anything that depends on who's signed in sends `Cache-Control: private, no-store`. `s-maxage` or `public` on such a route can serve one person's data to the next.
- **Confirm:** read the route's headers and `vercel.json` headers for the path.

### Error messages [error-leak]

- Raw database, crypto or library messages, stack traces and `?error=` echoed from the address. Plain message to the person, detail to the log (MorrisOS's `plainError()`).

### Children's data in public JS [personal-data-client]

- See the children section above. Look in `public/`, client components, seed data imported by pages, and the built output. Names and ages together are the thing to keep out.
