---
name: figma-to-code
description: Builds a screen from a Figma frame in an app that uses the obvious design system, using obvious's --ds-* tokens, type roles, t-* CSS components, ob-* registry components and the shadcn bridge instead of the frame's literal values. Maps Figma variables and styles to tokens and flags any value with no token, makes the fixed-width frame work at 390 and 1280 and everything between, adds the states and accessibility a frame can't show, then screenshots the build at the frame's width, compares it with Figma's render and reports the differences it kept. Use when given a figma.com/design link with a node-id, or asked to "build this from Figma", "implement this frame", "turn this design into code", "match the Figma", "design to code" or "handoff" in an app with a ds/ folder, an obvious dependency or a .ds-audit.json. Works alongside Figma's own figma-design-to-code skill, which handles the MCP calls.
---

# Figma to code, on obvious

A Figma frame is one picture of one state at one width. The job is to build
the screen it describes, out of the system the app already uses, and then
prove it looks like the frame. Figma's own skill knows how to read the file.
This one knows obvious, and owns the mapping, the gaps and the check.

The person reading the result is a designer. They judge it on screen at 390
and 1280. Anything you changed from the frame, they need to hear about in
plain words.

## Copy this checklist and work through it

```
- [ ] 1. Find the app's theme, ds/ source, stack and existing components
- [ ] 2. Load figma-design-to-code, then pull the frame (context, variables, screenshot)
- [ ] 3. Map every value to a token with scripts/match-tokens.mjs; list what has none
- [ ] 4. Map every part of the frame to an obvious component or the app's own
- [ ] 5. Build it: layout that flexes, tokens only, the theme's two faces
- [ ] 6. Add the states and semantics the frame doesn't show
- [ ] 7. Screenshot at the frame's width, compare with scripts/compare-png.mjs, iterate
- [ ] 8. Check 390 and 1280, light and dark, and run the app's own checks
- [ ] 9. Report: worst difference first, plain words, screenshots
```

## 1. Know the app before you open Figma

- Read the app's CLAUDE.md and README. Its rules win where they're stricter.
  If the `engineer` skill is present, follow its "Before you touch anything".
- Theme: search the source for `css/themes/<name>.css`
  (`grep -rn "css/themes/" --include=*.css --include=*.tsx --include=*.ts --include=*.html . | grep -v node_modules`).
  Or run obvious's audit, which prints the themes it found:
  `node scripts/audit-ds.mjs` from the app, or
  `node /path/to/obvious/scripts/audit-ds.mjs /path/to/app`.
- Source of tokens: a `ds/` folder (synced by `scripts/sync-ds.mjs`) or
  `node_modules/obvious` (installed from a pinned tarball). Read
  `ds/js/tokens.json` or `node_modules/obvious/dist/js/tokens.json` for the
  real values. Never edit `ds/`.
- Stack: plain CSS, Tailwind v4 with `ds/tailwind/theme.css`, or shadcn
  with `shadcn/theme.css`. Registry items live in `components/obvious/`.
- Note the audit's bypass number before you start. It can go down. It mustn't go up.
- Does the theme have a dark set? Only those listed under `dark` in
  tokens.json do. If it does, you'll need the frame's dark variant too, or
  you'll be building dark mode blind (say so in the report).

## 2. Pull the frame through Figma's skill

Figma's MCP server requires its `figma-design-to-code` skill before
`get_design_context`. Load it: the `/figma-design-to-code` skill if the
Figma plugin is installed, otherwise
`Figma:get_figma_skill` with `skill://figma/figma-design-to-code/SKILL.md`.
Follow it for the mechanics: the `skillNames` logging value, sparse
responses, assets and SVGs, Code Connect at mapped nodes.

Then, from the URL (`figma.com/design/<fileKey>/...?node-id=1-2` gives
nodeId `1:2`; a branch URL uses the branch key):

1. Large or unclear frame: `Figma:get_metadata` first, then fetch only the
   sections you're building.
2. `Figma:get_design_context` with `clientFrameworks` and `clientLanguages`
   set to the app's stack. Its React and Tailwind is a reference to
   translate into the app's stack. Don't paste it.
3. `Figma:get_variable_defs` on the same node. Save the result as
   `figma-vars.json` in your scratchpad.
4. `Figma:get_screenshot` at the frame's natural size. The default caps the
   long edge at 1024px, which shrinks a 1280 frame and any tall phone frame.
   Read `original_width` and `original_height` from the response and ask
   again with `maxDimension` set to the larger of the two, then download the
   PNG with the curl line it gives you.
5. `Figma:get_code_connect_map` if the file uses Code Connect. A mapped node
   means "use this component", which beats anything below.

Read only. Don't create, edit or annotate the Figma file, and don't send
Code Connect mappings, unless the designer asks.

## 3. Map values to tokens

Run, from the app's folder:

```sh
node /path/to/obvious/.claude/skills/figma-to-code/scripts/match-tokens.mjs figma-vars.json --theme <theme> --width <frame width>
```

Add the literal values from `get_design_context` that aren't variables
(`--values "#7B3FE4" 18 "Inter"`). Run it with `--mode dark` against the
dark frame if there is one. It gives each value a verdict:

| Verdict | Do this |
|---|---|
| exact | Use the token. Where several share a value, pick by role: text colour from `--ds-color-text*`, never `--ds-color-accent-contrast` because it happens to be white. |
| near | A colour within 0.02 in OKLab. Use the token and list it. |
| snap | A size between steps. Take the step it names and list it. Type maps to a whole role (`--ds-type-<role>-*`), never a size alone. |
| none | Nothing close. **Don't invent a token or write the literal.** Use the nearest token as a stand-in only if the screen can't be built otherwise, mark it in the code with a comment, and put it at the top of the report as a question. |

Fonts the theme doesn't name are always "none": use `--ds-font-display`
for headings and `--ds-font-sans` for the rest, load nothing else, and say
so. The full mapping rules, Tailwind and shadcn names, and what to do with
gradients, opacity and shadows are in [references/token-mapping.md](references/token-mapping.md).

## 4. Map parts to components

Before writing markup, decide what each part of the frame is:

1. A Code Connect mapping: use that component.
2. An obvious piece that does the job: `t-input` field, `t-chip`, `t-link`,
   `t-tt` tooltip, `t-badge`, `t-check-badge`; `Sheet`, `Toasts`,
   `PlusMenu`, `Tabs`, `Toggle`, `SearchField`, `Check` from the registry.
3. A component the app already has (search its components folder first).
4. shadcn (dialog, popover, select) in a Tailwind app, through the bridge.
5. Only then, new markup in the app, styled with tokens.

If an obvious piece looks different from the frame, use the piece and
report the difference. Don't restyle it per screen. The table of parts, and
which frame shapes map to which, is in [references/token-mapping.md](references/token-mapping.md).

## 5. Build

- Translate auto layout to flex and grid. Fixed widths become fluid with a
  max. Absolute positioning only where the design truly overlaps.
  [references/layout-and-responsive.md](references/layout-and-responsive.md)
  covers how each Figma setting maps and what to do at 390, 1280 and between.
- obvious's design rules apply even when the frame breaks them: no
  monospace, no eyebrows (capitals with letter spacing above a heading), no
  gradient text, glows, coloured card stripes or arrows on links. Build the
  rule-following version and report it as a kept difference. The designer
  can overrule it with an exception in `.ds-audit.json`.
- Assets come from the Figma payload, per Figma's skill. No new icon
  packages.
- Words in the frame are placeholders until confirmed. Keep them, but if
  they break `write-like-trev` (em dashes, "please", Title Case buttons),
  flag them. Never invent copy for states the frame lacks without saying so.

## 6. States and semantics the frame can't show

Work through [references/states-and-semantics.md](references/states-and-semantics.md).
At minimum: hover, focus-visible, active and disabled on every control;
loading, empty and error for anything that fetches or submits; long and
translated text; the right element for each job (`button`, `a`, headings
in order, labels); 44px tap targets; reduced motion. Every state you design
yourself goes in the report as "decided for you".

## 7. Verify against the frame

Follow [references/verification.md](references/verification.md). In short:

1. Serve the built page (the app's own dev or preview command, on a port
   nobody else is using).
2. Screenshot it with Playwright at exactly the frame's width and height,
   `deviceScaleFactor` to match the Figma PNG, animations disabled, fonts
   loaded, the frame's colour scheme. Use the preinstalled Chromium
   (`executablePath: "/opt/pw-browsers/chromium"`); never run
   `playwright install`.
3. `node .../scripts/compare-png.mjs figma.png built.png --diff diff.png`.
4. Look at both images and the diff yourself. The numbers say where; your
   eyes say what.
5. Fix real differences (spacing, size, colour, order, missing parts) and
   repeat. Stop when what's left is renderer noise or a difference you're
   keeping on purpose. If 3 rounds in a row don't reduce the difference,
   stop and report what's left instead of chasing it.

Never call a comparison done that you didn't run, and never loosen
`--threshold` to make a number look better.

## 8. Check the rest

- 390 and 1280 wide, and one width in between (768 is a good one): no
  sideways scroll, nothing clipped, nothing overlapping.
- Light and dark if the theme has a dark set.
- Keyboard: Tab through it; focus is visible and in a sensible order.
- No console errors.
- The app's own `npm run check` (or whatever its CLAUDE.md says). The
  obvious audit must not go up. `design-system-guardian`, if present, has
  the audit details.
- Contrast for any pairing the frame introduced, with real values. obvious's
  `scripts/contrast.mjs` covers the theme's own pairs.

## 9. Report

Written for a designer, worst first, no code unless asked. Use this shape:

```
Built: <screen>, from <frame name>, in <app> (<theme> theme).
Screenshots: Figma, built at <frame width>, built at 390 and 1280 [, dark].

Needs your call
- <value or part with no token, and what I used for now>

Differences I kept
- <what differs from the frame> because <rule or reason>

Decided for you
- <states, behaviour or semantics the frame didn't show>

Checked
- Compared at <w>x<h>: <n>% of pixels differ, mostly <where, why>.
- <390/1280/768, dark, keyboard, console, app checks, audit before and after>

Not checked
- <anything you couldn't run, and why>
```

Words follow `write-like-trev`.
