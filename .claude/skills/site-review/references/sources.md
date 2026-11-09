# Sources

Where the checks and numbers in this skill come from. Check the advisory
itself before quoting a version range to Trev; these were current in
November 2026.

## Advisories

- CVE-2025-29927, Next.js middleware bypass with `x-middleware-subrequest`: GitHub advisory GHSA-f82v-jwr5-mffw (March 2025). Fixed in 12.3.5, 13.5.9, 14.2.25 and 15.2.3.
- CVE-2025-55182 (React) and CVE-2025-66478 (Next.js), remote code execution through React Server Components, known as React2Shell (December 2025). Next.js fixed in 15.0.5, 15.1.9, 15.2.6, 15.3.6, 15.4.8, 15.5.7 and 16.0.7.
- CVE-2025-55184, CVE-2025-55183 and CVE-2025-67779, Server Components denial of service and source exposure (December 2025). Next.js fixed in 14.2.35, 15.0.7, 15.1.11, 15.2.8, 15.3.8, 15.4.10, 15.5.9 and 16.0.10.
- CVE-2024-51479, middleware authorisation bypass for pages at the root of a base path. Fixed in 14.2.15.
- CVE-2024-34351, Server Actions SSRF through the Host header. Fixed in 14.1.1.
- CVE-2024-46982, Next.js cache poisoning. Fixed in 13.5.7 and 14.2.10.
- CVE-2025-57822, middleware SSRF when request headers are passed to `next()`. Fixed in 14.2.32 and 15.4.7.
- polyfill.io supply chain attack: Sansec's report of 25 June 2024. The same operator's bootcss, bootcdn and staticfile hosts were named in follow-up reports.
- Next.js security advisories: github.com/vercel/next.js/security/advisories. npm audit reads the GitHub Advisory Database.

## Supabase

- Row Level Security: supabase.com/docs/guides/database/postgres/row-level-security.
- The database linter's security checks: `security_definer_view` (views run with their owner's rights), `function_search_path_mutable`, `rls_disabled_in_public`, `policy_exists_rls_disabled`. supabase.com/docs/guides/database/database-linter.
- Storage access control and public buckets: supabase.com/docs/guides/storage/security/access-control.
- `getUser()` over `getSession()` on the server: supabase.com/docs/guides/auth/server-side.

## Attacks

- OWASP Top 10 (2021) and the OWASP Cheat Sheet Series for SSRF, open redirects, path traversal, clickjacking, CSRF, session management and password storage.
- Password reset poisoning: PortSwigger Web Security Academy, "Password reset poisoning".
- Account pre-hijacking: Sudhodanan and Paverd, "Pre-hijacked accounts: An Empirical Study of Security Failures in User Account Creation on the Web", USENIX Security 2022.
- SMS pumping (artificially inflated traffic): Twilio's and the GSMA's guidance on SMS fraud.
- Prompt injection: OWASP Top 10 for LLM Applications, LLM01.

## Legal

- Google Fonts: Landgericht Munchen I, judgment of 20 January 2022, 3 O 17493/20. EUR 100 damages under GDPR Art. 82 for passing a visitor's IP address to Google without consent.
- Cookies and tracking: UK Privacy and Electronic Communications Regulations 2003 (PECR), regulation 6, and the ICO's guidance on cookies.
- Children: the ICO's Age Appropriate Design Code (the Children's Code), in force since 2 September 2021; the US Children's Online Privacy Protection Act (COPPA) and the FTC's COPPA Rule, under 13s.
- Marketing email: PECR regulation 22 (consent and an easy opt-out); the US CAN-SPAM Act 2003 (opt-out and a postal address); Google's and Yahoo's bulk sender rules from February 2024 (one-click unsubscribe).
- Subscriptions: the UK Digital Markets, Competition and Consumers Act 2024, Part 4 Chapter 2 (subscription contracts); US state automatic renewal laws such as California's.
- Uploads and copyright: the US DMCA notice and takedown process (17 U.S.C. 512) and, in the UK and EU, hosting liability that depends on acting on notice.
