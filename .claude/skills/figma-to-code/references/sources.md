# Sources

All read on 2026-10-18. Where a rule in the skill comes from obvious
itself, the file is named instead.

## Figma

- **Figma MCP server: overview.** https://developers.figma.com/docs/figma-mcp-server/
  Figma. The remote server at mcp.figma.com is the recommended one and has
  the broadest feature set; the desktop server is for specific
  organisation needs. Supports the server set-up assumptions in SKILL.md.
- **Tools and prompts.** https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/
  Figma. What `get_design_context` (React and Tailwind by default),
  `get_variable_defs` (variables and styles used in a selection),
  `get_screenshot`, `get_metadata` (a light outline for large designs),
  `get_code_connect_map`, `search_design_system` and `download_assets` do.
  Supports step 2 of SKILL.md.
- **Add custom rules.** https://developers.figma.com/docs/figma-mcp-server/add-custom-rules/
  Figma. The recommended order (design context, then metadata if
  truncated, then screenshot, then assets), treating the output as a
  representation, swapping Tailwind for project tokens, no new icon
  packages, and validating against the screenshot before calling it done.
  Supports steps 2, 5 and 7.
- **Avoid large frames.** https://developers.figma.com/docs/figma-mcp-server/avoid-large-frames/
  Figma. Large selections slow the tools or return incomplete results;
  use `get_metadata` first and work in sections. Supports step 2.1.
- **Structure your Figma file.** https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/
  Figma. Components, variables for spacing, colour, radius and type,
  semantic layer names, auto layout over absolute positioning,
  annotations. Supports the "frame without variables" handling in
  token-mapping.md and the layout reading in layout-and-responsive.md.
- **Code Connect integration.** https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/
  Figma. Connected components arrive wrapped in a Code Connect snippet
  with an import and usage; plan and seat requirements. Supports step 4's
  "Code Connect beats everything else".
- **figma-design-to-code skill.** `skill://figma/figma-design-to-code/SKILL.md`
  via `Figma:get_figma_skill`. Figma. Read for what it covers (the
  `skillNames` value, sparse responses, assets, Code Connect use) so this
  skill routes to it rather than repeating it. Not copied.
- **Figma MCP tool descriptions** (`get_screenshot`, `get_motion_context`),
  read from the server's tool schemas in this session. The `maxDimension`
  default of 1024 and the `original_width`/`original_height` fields come
  from here. Supports step 2.4 and verification.md.
- **Guide to auto layout.** https://help.figma.com/hc/en-us/articles/360040451373
  Figma Learn. Hug contents, fill container, fixed, minimum and maximum
  sizing, wrap, and "Ignore auto layout" (formerly absolute position).
  Supports the table in layout-and-responsive.md.
- **Guide to variables in Figma.** https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma
  Figma Learn. Variables, modes such as light and dark, aliasing,
  scoping. Supports "Variables, modes and styles" in token-mapping.md.
- **Add measurements and annotate designs.** https://help.figma.com/hc/en-us/articles/20774752502935
  Figma Learn. Annotations carry properties or free text, with preset
  categories including Development, Interaction, Accessibility and
  Content. Supports "Where to look first" in states-and-semantics.md.

## Design tokens

- **Design Tokens Format Module 2025.10.** https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/
  W3C Design Tokens Community Group (Final Community Group Report, not a
  W3C Standard). `$value`, `$type`, groups, `{group.token}` references,
  token types. Supports "Tokens handed over as a file".
- **Design Tokens specification reaches first stable version.** https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
  W3C Design Tokens Community Group, 28 October 2025. 2025.10 is the
  first stable version.
- **Naming Tokens in Design Systems.** https://nathanacurtis.substack.com/p/naming-tokens-in-design-systems-9e86c7444676
  Nathan Curtis (EightShapes). Names as shared language across design and
  code handoff. Background for choosing colour tokens by role rather than
  by value.

## Colour and comparison

- **CSS Color Module Level 4** (Candidate Recommendation Draft, 9 October
  2026). https://www.w3.org/TR/css-color-4/ W3C. OKLab, ΔEOK as the
  distance in OKLab, and the gamut-mapping note that a just-noticeable
  difference is 0.02. Supports the 0.02 "near" limit in match-tokens.mjs.
- **pixelmatch.** https://github.com/mapbox/pixelmatch Mapbox. Perceptual
  per-pixel difference in OKLab with the HyAB distance, default threshold
  0.1, anti-aliasing detection. compare-png.mjs uses the same distance and
  default, written independently and without the anti-aliasing step.
- **Visual comparisons.** https://playwright.dev/docs/test-snapshots
  Playwright. Playwright uses pixelmatch; rendering varies by OS, browser,
  fonts and hardware, so compare in one environment. Supports "What you're
  comparing".
- **Playwright 1.56 type definitions** (`playwright-core/types/types.d.ts`,
  installed in the apps). Microsoft. `animations: "disabled"` finishes
  finite animations and cancels infinite ones; `caret: "hide"`;
  `scale: "css" | "device"`. Supports the screenshot script.

## CSS layout

- **CSS Flexible Box Layout Module Level 1, 4.5 Automatic Minimum Size of
  Flex Items.** https://www.w3.org/TR/css-flexbox-1/ W3C (Candidate
  Recommendation Draft, 14 October 2025). A flex item's minimum size
  defaults to its content size, which is why a "fill" column needs
  `min-width: 0`. Supports the note in layout-and-responsive.md.
- **CSS Environment Variables Module Level 1.** https://www.w3.org/TR/css-env-1/
  W3C (First Public Working Draft, 23 September 2025). `safe-area-inset-*`
  for keeping content inside the visible area on non-rectangular screens.
  Supports the bottom bar advice.

## Accessibility

- **WCAG 2.2.** https://www.w3.org/TR/WCAG22/ W3C Recommendation (current
  edition dated 12 December 2024). Criteria cited: 1.3.1, 1.4.1, 1.4.3,
  1.4.4, 1.4.10, 1.4.11, 1.4.12 (the 1.5, 2, 0.12 and 0.16 values), 1.4.13,
  2.4.11, 2.5.8, 4.1.3. 4.1.1 Parsing is obsolete and removed
  in 2.2, so the skill doesn't mention it.
- **Understanding Reflow (1.4.10).** https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
  W3C WAI. 320 CSS px wide is a 1280px viewport at 400% zoom.
- **Understanding Target Size (Minimum) (2.5.8).** https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
  W3C WAI. 24 by 24 CSS px, with the spacing exception.
- **WAI-ARIA Authoring Practices: Read me first.** https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/
  W3C WAI. "No ARIA is better than Bad ARIA"; roles don't add keyboard
  behaviour. Supports "Semantics: the right element for the job".

## States and content

- **Designing Empty States in Complex Applications: 3 Guidelines.** https://www.nngroup.com/articles/empty-state-interface-design/
  Kate Kaplan, Nielsen Norman Group, 2021. Say what's happening, teach,
  give the action; don't show "no records" while loading.
- **Skeleton Screens 101.** https://www.nngroup.com/articles/skeleton-screens/
  Samhita Tankala, Nielsen Norman Group, 2023 (reviewed 2026). No
  indicator under 1 second, skeletons for page loads, spinners for one
  module, progress bars past 10 seconds.
- **Error message.** https://design-system.service.gov.uk/components/error-message/
  GOV.UK Design System. Message by the field, an error summary, same
  wording in both, don't clear answers, visually hidden "Error:" prefix.
- **Text size in translation.** https://www.w3.org/International/articles/article-text-size
  W3C Internationalization, citing IBM's figures. Strings of up to 10
  characters can grow 200 to 300% in translation. Supports "Long text".

## Writing the skill

- **Skill authoring best practices.** https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
  Anthropic. Frontmatter limits (name up to 64 characters, lowercase and
  hyphens; description up to 1,024 characters, third person, what and
  when), SKILL.md under 500 lines, references one level deep with a
  contents list past 100 lines, checklists and feedback loops,
  `Server:tool` names for MCP tools, scripts that handle their own errors.
- **Skills in Claude Code.** https://code.claude.com/docs/en/skills
  Anthropic. Project skills live in `.claude/skills/<name>/SKILL.md`.
- **Adding custom styles.** https://tailwindcss.com/docs/adding-custom-styles
  Tailwind Labs. The `p-(--var)` shorthand for CSS variables and type
  hints such as `border-(color:--var)`. Supports the Tailwind row in
  token-mapping.md.

## obvious

- `CLAUDE.md`: the design rules (no mono, no eyebrows, the theme's two
  faces, tokens for colour, radius, timing and easing, no generated-site
  furniture).
- `README.md`: themes, dark sets and `data-ds-mode`, the Tailwind and
  shadcn bridges (and why spacing isn't mapped), the registry and
  `--ob-*` knobs, transitions.dev load order, the audit's categories.
- `src/primitives.json`: every primitive token and the "nearest step"
  rule for spacing; type roles as sets; the 44px tap minimum.
- `src/themes/*.json`, `dist/js/tokens.json`: theme colours, faces and
  dials, and the shape match-tokens.mjs reads.
- `src/components/*.css`, `registry.json`, `registry/obvious/*`: the
  component tables.
- `scripts/audit-ds.mjs`, `scripts/contrast.mjs`, `.ds-audit.json`,
  `docs/contrast.md`: the audit and contrast checks and how exceptions
  are written.
- `.claude/skills/engineer/references/standards/design.md` and
  `accessibility.md`: referred to rather than repeated.
