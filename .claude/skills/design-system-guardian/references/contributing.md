# When something belongs in obvious, and how to propose it

## Contents

- Decide: one-off in the app, or part of obvious
- The kinds of change, where each lands, and how risky it is
- Naming a new token
- Renaming or removing something
- Staging a proposal in the app
- Making the change in obvious
- The design tokens format (DTCG) and obvious

## Decide: one-off in the app, or part of obvious

Most needs are one-offs. Build them in the app from tokens (rungs 3 and 4 of
the ladder in SKILL.md) and move on. A one-off that stays in one app is fine
and costs obvious nothing.

Promote it to obvious only when every one of these is true. They're adapted
from GOV.UK's contribution criteria (useful, unique, then usable, consistent,
versatile), Brad Frost's governance process (decide early whether a thing is
a product one-off or a system addition) and Nathan Curtis's advice on tokens
(start local, promote once several places share the need, don't make a
shared name too early).

| Test | How to check it in obvious |
| --- | --- |
| **Useful**: more than one app needs it | Name the apps and the screens. Search them for hand-rolled versions (`grep -rn` for the pattern). One app is not enough. |
| **Unique**: obvious doesn't have it | Search `src/primitives.json`, `src/themes/core.json`, `src/components/`, `registry/` and the README. If an existing thing would do the job with one more knob, propose the knob. |
| **Consistent**: built from the system | Reads only `--ds-*` tokens, its own knobs, or variables with a fallback. `test/components.test.mjs` enforces this for components. No monospace or letter-spacing (also tested). |
| **Versatile**: works in every family theme | Try it on `core` (dark), `routine` and `specimen` (light), `condimental` (16px radius base), `dissonance` (3px) and `morris` (has a dark set). The docs site shows every theme, so it's the quickest place to look. |
| **Usable**: works for people | Keyboard, focus ring, 44px tap target, reduced motion, contrast. The engineer skill's `references/standards/accessibility.md` has the checks. |

If it fails "useful", keep it in the app. If it fails one of the others,
fix that first or keep it in the app until it passes.

## The kinds of change, where each lands, and how risky it is

| Kind | Lands in | Risk to apps |
| --- | --- | --- |
| Fix to a component (a variable that resolves to nothing, a missing state) | `src/components/<name>.css` | Low. Apps get it on their next sync or pin bump. |
| New knob on an existing component | the component's CSS, with today's value as the default | Low. Additive. |
| New primitive (a spacing step, a duration) | `src/primitives.json` | Additive is safe. Changing an existing value changes every app at once: treat it as breaking. |
| New theme colour or dial | every file in `src/themes/`, in one change | Medium. The build fails if any theme lacks a key `core` has, so all 7 get it together. A `dark` block may override it. Contrast is checked for the pairs in `scripts/contrast.mjs`. |
| New `t-*` component | `src/components/<name>.css`, plus JS in `src/js/behaviours.js` if CSS can't do it | Low to apps (opt-in). Counts in obvious's own audit budget. |
| New registry item | `registry/obvious/` and `registry.json` | Apps copy it and the next `add` overwrites their copy, so every tunable value must be an `--ob-*` knob. |
| Rename or remove anything | everywhere it's named | High. See below. |

Semantic versioning's rule fits here even without version numbers: adding is
a minor change, changing or removing what apps depend on is a major one, and
marking something deprecated comes before removing it.

## Naming a new token

Follow the pattern obvious already uses, which lines up with the levels in
Nathan Curtis's "Naming Tokens in Design Systems" (namespace, then category,
concept or property, then modifier):

```
--ds-<category>-<role or property>-<modifier>
--ds-color-text-muted       category color, role text, modifier muted
--ds-type-label-size        category type, role label, property size
--ds-control-height-md      category control, property height, scale md
```

- Name it for what it's for: `--ds-color-warning`. A name like
  `--ds-color-amber` stops making sense the moment a theme makes warnings red. Every theme must be able to give it a different
  value.
- Reuse existing words. Scales use the same steps as their neighbours
  (`xs sm md lg xl`, `instant fast base slow slower slowest`). Don't add
  `--ds-space-14`; pick a step.
- One word, one meaning. The type scale is already split into sizes
  (`--ds-text-*`) and roles (`--ds-type-*`); don't add a third.
- Theme and mode are separate: a dark value goes in the theme's `dark`
  block under the same name. There is no `--ds-color-text-dark`.

## Renaming or removing something

Before removing or renaming any `--ds-*` token, `t-*` class or `ob-*` item:

1. Find who uses it: `node <obvious>/scripts/audit-ds.mjs <every app> --json`
   lists the tokens and components each app references.
2. Keep the old name working for at least one sync cycle, pointed at the new
   one. For a primitive, keep the old key in `src/primitives.json` with the
   value `var(--ds-<new name>)`, the way the `type` roles already point at
   `--ds-text-*`. For a class, keep both names on the rule. Say it's
   deprecated in the `$comment` and the README.
3. Remove it only after the apps that used it have moved. Say which ones in
   the commit.

## Staging a proposal in the app

When you find the need while working in an app, stage the proposal there so
the app works today and the change is easy to lift into obvious later. An
app that uses obvious already does this, and its fixes landed upstream.

- Put it in `ds-proposals/` at the app's root. Never in `ds/`: `sync-ds.mjs`
  deletes and re-copies that folder on every run.
- Load it after obvious's CSS and before the app's own styles, so it behaves
  like part of the system.
- Add the folder to the app's `.ds-audit.json` `ignore` with a note saying
  it's staged work for obvious, so its count doesn't hide in the app's
  budget, and list the literals it still holds.
- Keep a `ds-proposals/README.md` with a table:

| File | What it is | Lands in obvious as |
| --- | --- | --- |
| `fixes.css` | The tooltip never shows; two variables resolve to nothing | edits to `src/components/tooltip.css` and `badge.css` |
| `digit.css` | New component `t-digit` | `src/components/digit.css` |

Each entry in the README says, in plain words: the need and which apps have
it, what exists in obvious today and why it doesn't do the job, what was
tested (themes, widths, light and dark, keyboard), and any literal left in
it with the reason (for example "8px and 2px stay literal: obvious has no
distance or blur scale, and adding one for 2 values would be worse").

## Making the change in obvious

This is its own piece of work in the obvious repo, following obvious's
`CLAUDE.md` and the engineer skill.

1. Edit `src/` only (never `dist/` or `docs/`, which are generated).
2. `npm run build`. It fails if a theme's keys differ from `core`'s, a
   `dark` key isn't a colour in `core`, or a contrast pair got worse or
   newly fails.
3. If contrast fails, don't change a theme colour to pass. Leave the
   failing pair for the owner, recorded in `docs/contrast.md` by the build.
4. `npm run check`: build, registry, docs site, tests, obvious's own audit at
   `--max 113`, and a check that `dist/` and `docs/` are committed.
5. Look at the docs site (`npm run site:serve`, port 4321) for every theme.
6. After it ships, each app picks it up with `node scripts/sync-ds.mjs` (ds/
   apps) or a pin bump (npm apps). Remove the staged copy from the app's
   `ds-proposals/` and its ignore entry in the same change.

## The design tokens format (DTCG) and obvious

The W3C Design Tokens Community Group published the first stable version of
its format, 2025.10, in October 2025. It's a community group report and isn't on the
W3C standards track. In it, a token is an object with `$value` (required), and
optionally `$type`, `$description` and `$deprecated`; aliases are written
`{group.token}`; names can't start with `$` or contain `{`, `}` or `.`.

obvious's `src/*.json` isn't in that format: it's plain nested JSON with
`$comment` notes, built to CSS custom properties by `scripts/build.mjs`.
Don't convert it as a side effect of other work. Where the format helps
today:

- Its rule that tools mustn't guess a token's type from its value is why
  obvious groups by category (`color`, `space`, `duration`), so a name says
  what kind of value it holds.
- `$deprecated` with a reason is the right shape for a deprecation note if
  obvious ever exports tokens to a design tool. Until then, the source
  comment and README do that job.
