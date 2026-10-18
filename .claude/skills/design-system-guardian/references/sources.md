# Sources

All read on 2026-10-18.

## obvious itself (the primary source for every command and name)

| File | Supports |
| --- | --- |
| `CLAUDE.md` ("Design rules for every app that uses this", "Careful with") | The rules, and the dangerous areas: theme keys, `src/primitives.json`, registry components, theme colours and contrast, copied scripts |
| `README.md` | How apps take obvious (ds/ or npm pin), load order, the Tailwind, shadcn and JS bridges, the registry, `.ds-audit.json` format, the adoption table |
| `scripts/audit-ds.mjs` | Every category, what's skipped, substring path matching, notes required on exceptions, exceptions never hiding adoption, `--detail`, `--max`, `--json` |
| `scripts/sync-ds.mjs` | `--check` (untouched copy of the stamped commit, commits behind main), `--latest`, `DS_LOCAL` not allowed with `--check`, ds/ replaced on every sync |
| `scripts/build.mjs`, `scripts/contrast.mjs`, `src/contrast-exceptions.json`, `docs/contrast.md` | Theme keys must match `core`; dark keys must be colours in `core`; contrast pairs and thresholds; recorded failures may not get worse |
| `src/primitives.json`, `src/themes/*.json` | Token names and values, radius maths from the base, density, the shadow-colour mistake recorded in the `shadow` comment |
| `src/components/*.css`, `registry/obvious/*.css`, `registry.json` | Component classes and knobs, where registry knobs are declared |
| `test/components.test.mjs`, `test/audit-ds.test.mjs` | Components read only tokens, knobs or fallbacks; no mono or letter-spacing in components; audit behaviour |
| `.claude/skills/engineer/` (`SKILL.md`, `references/standards/design.md`, `scripts/scan.mjs`) | The design checklist this skill points to rather than repeats; pattern scan for arrows, hover lift, middle dots |

Audits run while writing this: obvious itself (113 against a budget of 113),
two apps that use obvious through `ds/` (11 and 52 with obvious's script;
one app's own older copy reported 0), and an npm-pinned app for
`ds-context.mjs`. `sync-ds.mjs --check` was run in two apps and passed,
reporting 5 and 35 commits behind main.

## External

| Source | Publisher, date | Supports |
| --- | --- | --- |
| [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) | Anthropic, current docs | Frontmatter limits (`name` 64 chars, lowercase and hyphens; `description` 1,024 chars, third person, what and when); SKILL.md short with one-level references; contents list on references over 100 lines; copyable checklists; validate, fix, repeat loops; scripts for deterministic steps |
| [Design Tokens Format Module 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) | W3C Design Tokens Community Group, final community group report, 28 Oct 2025 | First stable version; not a W3C standard; `$value`, `$type`, `$description`, `$deprecated`; `{group.token}` aliases; name restrictions; tools mustn't infer type from value |
| [Contribution criteria](https://design-system.service.gov.uk/community/contribution-criteria/) | GOV.UK Design System, current | Useful and unique at proposal; usable, consistent and versatile before publishing. Adapted into the promotion tests |
| [Extending and modifying components in production](https://design-system.service.gov.uk/get-started/extending-and-modifying-components/) | GOV.UK Design System, current | Own prefix for own components; don't overwrite system selectors; override classes first; forking loses updates; check accessibility of anything modified |
| [A design system governance process](https://bradfrost.com/blog/post/a-design-system-governance-process/) | Brad Frost, 4 Nov 2019 | Use existing components first; talk to the system early; decide one-off ("snowflake") or system addition; prototype, review, pilot in a product, then release |
| [Naming Tokens in Design Systems](https://nathanacurtis.substack.com/p/naming-tokens-in-design-systems-9e86c7444676) | Nathan Curtis, 15 Oct 2020 | Name levels (namespace, object, category, concept, property, modifier); avoid words with two meanings; theme and mode are separate; start local and promote when several places share a need; don't make shared names too early |
| [Contribution](https://atlassian.design/contribution) | Atlassian Design System, current | Tiers of contribution: fixes, small enhancements that don't break behaviour, and major enhancements that need system-wide coordination. Informs the risk column in `contributing.md` |
| [Semantic Versioning 2.0.0](https://semver.org/) | semver.org | Incompatible change is major, additive is minor; deprecate in a minor release before removing in a major |
| [Understanding SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | W3C WAI, WCAG 2.2 | 4.5:1 for normal text, 3:1 for large; thresholds aren't rounded. Matches `scripts/contrast.mjs` |
| [Understanding SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | W3C WAI, WCAG 2.2 | 3:1 for controls, states and focus indicators. Why obvious checks the accent and status colours at 3:1 |
| [shadcn CLI](https://ui.shadcn.com/docs/cli) | shadcn/ui, current | `add` has `--overwrite` and `--yes`, so a registry copy is replaced on re-add |
| [A perceptual color space for image processing](https://bottosson.github.io/posts/oklab/) | Björn Ottosson, 23 Dec 2020 (matrices updated 25 Jan 2021) | OKLab conversion used by `ds-nearest.mjs` to rank colour candidates; coefficients checked against the post |

## Looked for and left out

- Nathan Curtis, "Measuring Design System Success" (EightShapes): the page
  returned 503 and the archive couldn't be fetched, so nothing from it is
  used. Adoption guidance here comes from obvious's own audit instead.
- Nathan Curtis's articles on contribution (Medium) returned 403. Not used.
- Shopify Polaris contribution guidelines: the old URL now redirects to
  Shopify's developer docs and the page couldn't be confirmed. Not used.
- No perceptual threshold is claimed for colour distance; the script ranks
  only.
