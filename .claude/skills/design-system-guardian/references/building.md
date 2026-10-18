# Building with obvious

## Contents

- Where the files are in an app
- Which token for which job
- Components: the interaction layer (`t-*`)
- Components: the registry (`ob-*`)
- Retuning without forking
- Tailwind, shadcn and the JS export
- Brookwood and other non-family themes

## Where the files are in an app

| How the app takes obvious | Built files | Token values as data |
| --- | --- | --- |
| Vendored | `ds/` (a copy of obvious's `dist/`, stamped in `ds/.version`) | `ds/js/tokens.json` |
| npm (tarball pin in `package.json`) | `node_modules/obvious/dist/` | `node_modules/obvious/dist/js/tokens.json` |
| obvious itself | `dist/`, built from `src/` by `npm run build` | `dist/js/tokens.json` |

The source of truth is always obvious's `src/`: `src/primitives.json` (shared
by every app), `src/themes/<name>.json` (each app's dials) and
`src/components/*.css`. Read those to see a value and its comment. Never
edit the built copies.

Load order in an app: `primitives.css`, then `themes/<name>.css`, then
optionally `base.css` and `components.css` (or single files from
`css/components/`), then the app's own styles.

## Which token for which job

Names are the real custom properties. Values are in `src/primitives.json`
or the theme file.

**Colour** (theme sets these; a theme's `dark` block can override any of
them):

| Job | Token |
| --- | --- |
| Page | `--ds-color-bg`, `--ds-color-bg-alt` |
| Cards, sheets, raised panels | `--ds-color-surface`, `-surface-raised`, `-surface-hover` |
| Lines | `--ds-color-border-subtle`, `-border`, `-border-strong` |
| Text, strongest to quietest | `--ds-color-text`, `-text-dim`, `-text-muted`; on a filled accent `-accent-contrast`; on an inverted surface `-text-inverse` |
| Primary action, links, focus ring | `--ds-color-accent`, `-accent-hover`, `-accent-alt` |
| Status | `--ds-color-success`, `-warning`, `-danger`, `-info` |
| Shadow colour | `--ds-color-shadow-color`, `-shadow-highlight` (the shadow tokens already use them) |
| Selection | `--ds-color-selection-bg`, `-selection-text` (`base.css` applies them) |

`--ds-color-text-muted` fails 4.5:1 on some themes (see obvious's
`docs/contrast.md`). Check that table before using muted for small text; a
condimental app uses `-text-dim` for secondary text for this reason.

**Type.** Set a whole role so size, leading, tracking and weight travel
together. A loose `--ds-text-*` size on its own picks up the wrong leading:

```css
.caption {
  font-family: var(--ds-font-sans);
  font-size: var(--ds-type-label-size);
  line-height: var(--ds-type-label-leading);
  letter-spacing: var(--ds-type-label-tracking);
  font-weight: var(--ds-type-label-weight);
}
```

Roles: `h1`, `h2`, `h3` (display face), `lead`, `body`, `ui` (controls),
`label` (small labels, sentence case). Ignore the `mono` role and the
`--ds-font-mono` slot: the rules ban monospace and the slot only exists so
old code renders in the text face. Fonts: `--ds-font-display` for headings,
`--ds-font-sans` for everything else. Weights: `--ds-weight-*`. Line
heights outside a role: `--ds-leading-*`.

**Space and layout**: `--ds-space-3xs` (2px) to `--ds-space-5xl` (128px) on
a 4px base; pick the nearest step rather than adding one. Vertical rhythm
between sections: `--ds-space-fluid-s` to `-xl`. Page side padding:
`--ds-gutter`. Line length: `--ds-measure` (68ch). Max width:
`--ds-container`.

**Shape**: `--ds-radius-xs` to `-xl` are fractions of the theme's
`--ds-radius-base`, so a 4px theme and a 16px theme keep the same
proportions. `--ds-radius-full` for pills and circles. Borders:
`--ds-border-hairline`, `-thick`, `-heavy`. Shadows: `--ds-shadow-sm` to
`-xl`, `--ds-shadow-inset-hairline`.

**Motion**: `--ds-duration-instant` (100ms) to `-slowest` (900ms);
`--ds-ease-out` is the house curve, plus `-in`, `-in-out` and `-spring`.
Anything longer than 900ms is a loop or choreography, which is a recorded
exception. For adding or tuning motion, use the `transitions-dev` and
`transitions-polish` skills with these tokens.

**Controls and layers**: `--ds-control-height-sm/md/lg` and
`--ds-control-pad-x-*` scale with the theme's `--ds-density`;
`--ds-control-tap-min` (44px) is the floor for anything tapped. Stacking:
`--ds-z-base` to `--ds-z-toast`. Focus: `base.css` draws the one focus ring
from `--ds-focus-*` and the accent. Don't restyle it per app.

## Components: the interaction layer (`t-*`)

Plain CSS in `src/components/`, built to `css/components/<file>.css`, with
the JS that CSS can't do in `js/behaviours.js` (each function returns a
teardown, which suits a React effect). The header comment of each file says
what it is and which knobs it has.

| File | Class | Knobs to retune |
| --- | --- | --- |
| `field.css` | `t-input` | `--t-input-height`, `--t-input-error`, `--shake-*` |
| `chip.css` | `t-chip` | `--t-chip-radius`, `--t-chip-pad` |
| `link.css` | `t-link`, `t-link--loud` | none; colours follow the theme |
| `tooltip.css` | `t-tt` | none |
| `badge.css` | `t-badge` | `--badge-*` |
| `check-badge.css` | `t-check-badge` | `--check-*` (always green on purpose) |
| `reveal.css` | `t-reveal` | none |
| `stagger.css` | `t-stagger` | `--stagger-*` |
| `think.css` | `t-think` | `--think-*` |
| `boot-ring.css` | `t-boot-ring` | `--boot-*` |
| `pro-button.css` | `t-pro-btn` | `--probtn-*` |
| `gradient-text.css` | `t-gradient-text` | `--gradient-text-*` |

`t-gradient-text` and `t-think` break the written rule against gradient
text and are recorded as exceptions in obvious's own `.ds-audit.json`. Don't
reach for them in new work without the owner asking.

## Components: the registry (`ob-*`)

React components served as a shadcn registry. They're copied into
`components/obvious/` and each `.tsx` imports its own CSS.

| Item | What it is | Knobs |
| --- | --- | --- |
| `sheet` | Bottom sheet on phones, centred dialog from 640px | `--ob-sheet-radius`, `--ob-sheet-bg`, `--ob-shade`, `--ob-sheet-open-dur`, `--ob-sheet-close-dur`, `--ob-sheet-ease` |
| `toasts` | Stacked toasts, `useToasts()` | `--ob-toasts-bottom` |
| `plus-menu` | A + that grows into its menu | `--ob-plus-size`, `--ob-plus-width`, `--ob-plus-row`, `--ob-plus-items` |
| `motion` | Tabs, Badge, PopNumber, TextSwap, SuccessCheck, Toggle and more | `--ob-badge-bg`, `--ob-shadow-float` |

Install with the full URL, or the short name once the app's
`components.json` has `"registries": { "@obvious": "https://obvious-nine.vercel.app/r/{name}.json" }`:

```sh
npx shadcn add @obvious/sheet
```

Each item lists the transitions.dev snippets it needs, and shadcn prints the
`npx transitions-dev add ...` command. Load order then is primitives and
theme, the transitions.dev CSS, `css/transitions-bridge.css`, then the
app's styles.

The next `add` replaces the app's copy (shadcn's `add` has an `--overwrite`
flag for exactly this). So any change made inside `components/obvious/` is
lost. Where a knob is declared matters when you set it:

- Sheet's knobs sit on `:where(:root)`, which has zero specificity, so the
  app sets them on `:root`.
- `--ob-badge-bg`, `--ob-shadow-float` and `--ob-toasts-bottom` are read
  with a fallback and declared nowhere, so `:root` works for them too.
- Plus menu's knobs are declared on `.ob-plus` itself, so set them on
  `.ob-plus` or a more specific selector in the app (for example an app
  class on the element). Setting them on `:root` does nothing.

Check the item's CSS before assuming.

## Retuning without forking

Adapted from GOV.UK's guidance on extending components in production, which
has the same problem obvious has: an app's changes must survive the next
update.

1. Use the component's own knobs first (tables above).
2. Name the app's own classes with its own prefix. `t-` and `ob-` are
   obvious's; a class like `.t-chip--big` defined in an app looks like part of
   the system and collides with any later version.
3. Don't restyle `t-*` or `ob-*` classes in app CSS beyond setting their
   knobs. Overriding `padding` or `color` on `.t-chip` works until obvious
   changes the component, then breaks with no warning.
4. If a knob is missing, that's a proposal to obvious (add the knob), staged
   in `ds-proposals/`. See `contributing.md`.
5. A full fork (copying a component under a new name) means the app stops
   getting fixes. Only with the owner's say-so, and recorded in the report.

## Tailwind, shadcn and the JS export

- **Tailwind v4**: import `ds/tailwind/theme.css` after the theme. It adds
  names that read the tokens: colours `bg`, `bg-alt`, `surface`,
  `surface-raised`, `ink`, `ink-dim`, `ink-muted`, `accent`, status colours
  (so `bg-surface`, `text-ink-muted`); `rounded-ds-*`, `text-ds-*`,
  `ease-ds-*`, `shadow-ds-*`. Spacing is deliberately not mapped, because
  mapping it once broke `max-w-*`; use `var(--ds-space-md)` in an arbitrary
  value. Tailwind's own scales stay as they were, so `rounded-lg` is not a
  token.
- **shadcn/ui** in a Tailwind app: import `shadcn/theme.css` after shadcn's
  globals. It points `--background`, `--primary`, `--radius` and the rest at
  `--ds-*`, dark set included.
- **Canvas, WebGL, OG images, build scripts** that can't read CSS: import
  `js/tokens.js` (`tokens.themes.<name>["--ds-color-accent"]`) or read
  `--ds-*` off the page at paint time with `getComputedStyle`. A `<meta
  name="theme-color">` can't read a custom property either; copying
  `--ds-color-bg` there is a recorded exception.

## Brookwood and other non-family themes

A theme with `"family": false` (today, `parchment`) takes the primitives and
none of the interaction layer, on purpose. In an app on such a theme, the
ladder's component rung is skipped: tokens and type roles only.
