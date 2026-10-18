---
name: design-system-guardian
description: Keeps apps that use the obvious design system built from it. Finds the app's theme and its ds/ folder or npm pin, reaches for tokens, type roles, t-* components and ob-* registry items before writing any CSS, applies obvious's design rules, runs obvious's audit (audit-ds.mjs with --detail, --max and .ds-audit.json) and the ds/ sync check, and either fixes a value that goes around the system or records a measured exception. Also decides when a new token or component belongs in obvious itself and how to propose it safely. Use whenever you style, build or review UI in an app that has a ds/ folder, an obvious dependency or a .ds-audit.json, when the audit number goes up or CI fails on ds:audit or ds:check, and when someone asks for a design system check, "is this on-system", "why is this hard-coded", adding a token, adding a component, or changing a theme.
---

# Design system guardian

obvious is the design system. Every app that takes it should look like it
came from the same hands, and the only way that stays true is if new work
is built out of what obvious already has. This skill is the procedure for
doing that, proving it, and handling the cases where obvious doesn't have
what's needed.

The rules themselves live in obvious's `CLAUDE.md` under "Design rules for
every app that uses this". The engineer skill's
`references/standards/design.md` turns them into a checklist. Read that; this
skill doesn't repeat it. This one covers the obvious-specific how.

`<obvious>` below means the obvious checkout (this skill sits inside it at
`.claude/skills/design-system-guardian/`). `<app>` is the app's folder.

## Workflow

Copy this and tick it off as you go:

```
Design system pass:
- [ ] 1. Locate: theme, ds/ or npm pin, budget, exceptions
- [ ] 2. Baseline: audit with obvious's own script, note the number
- [ ] 3. Build from the ladder (below), top rung first
- [ ] 4. Check the rules the audit can't see
- [ ] 5. Re-audit: number is the same or lower
- [ ] 6. Fix each new finding, or record a measured exception
- [ ] 7. Sync check (ds/ apps) and app's own checks
- [ ] 8. Look at it: 390 and 1280 wide, light and dark if it has both
- [ ] 9. Report in plain words
```

### 1. Locate

```sh
node <obvious>/.claude/skills/design-system-guardian/scripts/ds-context.mjs <app>
```

It reads the app (read only) and prints how it takes obvious (`ds/` with the
commit in `ds/.version`, or an npm tarball pin), the theme it imports and
that theme's dials (radius base, density, its 2 faces, whether it has a dark
set), any registry items in `components/obvious/`, its `.ds-audit.json`, the
`--max` budget its own checks enforce, whether its copies of `audit-ds.mjs`
and `sync-ds.mjs` match obvious's, and any `var(--ds-*)` that names a token
obvious doesn't define (that resolves to nothing, silently).

If it can't find the theme, look for a `<link>` or `@import` of
`css/themes/<name>.css`, or `data-ds-theme` on `<html>`. If the app takes
neither `ds/` nor the package, it isn't on obvious yet; say so and stop.

### 2. Baseline

```sh
node <obvious>/scripts/audit-ds.mjs <app> --detail
```

Use obvious's copy of the script. An app's own `scripts/audit-ds.mjs` can
be older and miss whole categories: an app can pass `--max 0` with its own
copy and show 52 findings with obvious's. If they disagree, report both
numbers and don't touch either budget to hide the gap.

Write down the total and each category's count before you change anything,
so old findings aren't blamed on you. How to read every line of the output
is in [references/audit.md](references/audit.md).

### 3. Build from the ladder

Take the first rung that does the job. Each step down is more for someone to
maintain.

1. **Something the app already has** that's built on obvious. Reuse it.
2. **An obvious component.** `t-*` classes from `ds/css/components/` (field,
   chip, link, tooltip, badge, reveal, stagger and the rest), or a registry
   item (Sheet, Toasts, PlusMenu, motion) installed with
   `npx shadcn add @obvious/<name>`. Retune them through their custom
   properties (`--t-chip-radius`, `--ob-sheet-radius`, `--ob-shade`) on
   `:root` or a parent. Never edit a registry file or restyle a `t-*`
   selector.
3. **A type role plus tokens.** Set a whole role at once
   (`--ds-type-label-size`, `-leading`, `-tracking`, `-weight`), colours from
   `--ds-color-*`, spacing from `--ds-space-*`, radius from `--ds-radius-*`,
   motion from `--ds-duration-*` and `--ds-ease-*`.
4. **An app class built only from tokens**, with the app's own prefix (never
   `t-` or `ob-`, which belong to obvious).
5. **A literal**, only when no token fits and the value is deliberate. It
   needs an exception (step 6).
6. **A proposal to obvious**, when the same need shows up in more than one
   app. See "Does it belong in obvious?" below.

Which token for which job, the component catalogue and their knobs, the
Tailwind and JS bridges, and how to retune without forking are in
[references/building.md](references/building.md).

### 4. The rules the audit can't see

The audit counts literals and a few banned patterns. It does not see
spacing, line height, weight, layout or most of the "generated-site
furniture" list. After building, check by eye and by search:

- Spacing is on the scale (`--ds-space-*`, `--ds-space-fluid-*`,
  `--ds-gutter`). The audit doesn't flag `padding: 13px`; you should.
- Headings use `--ds-font-display`, everything else `--ds-font-sans`.
- Figures use `font-variant-numeric: tabular-nums` in the text face.
- Labels are sentence case on the `label` role with no tracking. Positive
  tracking tokens (`--ds-tracking-wide`, `-wider`) are for real acronyms in
  capitals and nothing else.
- None of the furniture list in obvious's `CLAUDE.md` (pill above a heading,
  glow, stripe down a card, hover lift on every card, arrows on links,
  middle-dot metadata and the rest).
- Controls are at least `--ds-control-tap-min` (44px) to tap.

`node <obvious>/.claude/skills/engineer/scripts/scan.mjs <app>` finds some of
these by pattern (arrows on links, hover lift, middle dots). Treat its hits
as leads to check.

### 5 and 6. Re-audit, then fix or record

Run step 2 again. The total must not go up. For every new finding:

1. Ask what it is:
   ```sh
   node <obvious>/.claude/skills/design-system-guardian/scripts/ds-nearest.mjs <app> 26px 300ms "#E8E9E5"
   ```
   It works out each token's value in the app's theme (radius from its base,
   control sizes from its density) and says which matches exactly or how far
   off the nearest is.
2. **Exact match:** swap it for the token.
3. **Near miss:** a design call. Swapping changes what people see. Make the
   swap only if it still looks right at both widths, and list it under "what
   I decided for you" in the report.
4. **Deliberate, with no token:** record it in the app's `.ds-audit.json`
   with a measured reason. The format and what makes a reason
   good enough are in [references/audit.md](references/audit.md). Prefer a
   category exception scoped to one file over a whole-path `ignore`.

When the total goes down, lower the budget (`--max`) in the app's checks to
the new number so it can't creep back. Never raise it.

### 7. Sync and checks

For a `ds/` app, from inside the app:

```sh
node scripts/sync-ds.mjs --check
```

It proves `ds/` is an untouched copy of the commit in `ds/.version` and says
how far behind `main` it is. It needs network access to clone obvious.
Never edit anything in `ds/`: the next sync deletes it. For an npm app, read
the pinned commit in `package.json`.

Then run the app's own `npm run check` (or `sh scripts/check.sh`, whatever
its CLAUDE.md says). Don't call it done if a check didn't run; say which.

### 8. Look at it

Open the built page in Playwright with the preinstalled Chromium
(`executablePath: '/opt/pw-browsers/chromium'`; never `playwright install`)
at 390 and 1280 wide, light and dark if the theme has a dark set. Confirm the
theme loaded by reading a token off the page:
`getComputedStyle(document.documentElement).getPropertyValue('--ds-color-bg')`
should be the theme's value. Empty means the theme didn't load. A clean audit isn't proof the page
looks right.

### 9. Report

For a designer who doesn't read code: worst first, plain words, no code.
Say the audit number before and after, what was swapped, every near-miss
call you made, every exception you added and why, and anything you found
but didn't fix.

## Does it belong in obvious?

Default to building in the app. Promote to obvious when all of these hold
(the criteria and how to propose are in
[references/contributing.md](references/contributing.md)):

- **Needed in more than one app**, or already hand-rolled in more than one.
- **Not already there** under another name. Search `src/primitives.json`,
  `src/themes/core.json`, `src/components/` and `registry/` first.
- **Works in every family theme**, light and dark, including the roundest
  (`condimental`, 16px) and squarest (`dissonance`, 3px) radius bases.
- **Built only from tokens**, so a theme retunes it with no override.

Stage the proposal in the app's `ds-proposals/` folder (never `ds/`), with a
README line saying where in obvious it lands. Changing obvious is its own
piece of work in the obvious repo, with `npm run check` passing there.

## Dangerous in obvious itself

- **Theme keys.** Every theme must have exactly `core`'s keys. A dropped key
  breaks every app on that theme. A new key goes into every theme in the same
  change. `npm run build` fails if they differ.
- **`src/primitives.json`.** One edit changes every app at once. Treat a
  changed value or a removed name as a breaking change.
- **Registry components.** Apps copy them in and the next `shadcn add`
  overwrites their copy. Anything an app needs to tune has to be an `--ob-*`
  property.
- **Theme colours and contrast.** Never change a theme colour to make the
  contrast check pass. Failing pairs go to `docs/contrast.md` for the owner
  to decide; `src/contrast-exceptions.json` only records them.
- **The copied scripts.** `audit-ds.mjs`, `sync-ds.mjs` and `sync-skills.mjs`
  are copied into apps, so they stay single files with Node's own imports.

## Never

- Raise an audit budget, widen an `ignore`, or add an exception without a
  measured reason to make a check pass.
- Edit `ds/` or a file in `components/obvious/`.
- Load a font the theme doesn't name, or use monospace anywhere.
- Say the audit or sync check passed without having run it.
- Fix another part of the app's design system debt as a side effect. Report
  it instead.
