# Mapping a Figma frame onto obvious

## Contents

- Where obvious's values live
- Figma property to token
- Colours: choosing by role
- Type: map to roles
- Variables, modes and styles
- Values with no token
- Writing tokens in each stack
- Parts of the frame to components
- Tokens handed over as a file

## Where obvious's values live

`tokens.json` (in `ds/js/` or `node_modules/obvious/dist/js/`) has three
parts:

- `primitives`: the same in every app. Spacing, the type scale and roles,
  leading, tracking, weights, radius steps, borders, focus ring, durations,
  easing, shadow shapes, control sizes, z layers.
- `themes.<name>`: what each app sets. Colours, the two faces,
  `--ds-radius-base` and `--ds-density`.
- `dark.<name>`: colour overrides for themes with a dark set.

Radius and control sizes are worked out from the theme's dials, and some
sizes are fluid (`clamp()` on the viewport width), so the same token is a
different number of pixels in different apps and at different widths.
That's why `match-tokens.mjs` takes `--theme` and `--width`.

## Figma property to token

| In Figma | Token | Notes |
|---|---|---|
| Fill, stroke, text colour | `--ds-color-*` | Choose by role (below). |
| Auto layout gap, padding | `--ds-space-3xs` to `--ds-space-5xl` (2 to 128px, on a 4px base) | Pick the nearest step; the primitives file says so. |
| Section rhythm that grows with the screen | `--ds-space-fluid-s` to `-xl` | Fluid. A phone frame and a desktop frame will show different values for the same gap. |
| Page side margin | `--ds-gutter` | Fluid, 20 to 64px. |
| Text column width | `--ds-measure` (68ch) | |
| Page max width | `--ds-container` (1140px) | |
| Corner radius | `--ds-radius-xs` to `-xl`, `--ds-radius-full` | Multiples of the theme's base. A pill is `full`. |
| Stroke weight | `--ds-border-hairline` (1px), `-thick` (1.5px), `-heavy` (2px) | |
| Text style | `--ds-type-<role>-size`, `-leading`, `-tracking`, `-weight` | Roles: h1, h2, h3, lead, body, ui, label. Never mono. |
| Font family | `--ds-font-display` (headings), `--ds-font-sans` (everything else) | |
| Font weight | `--ds-weight-regular` 400, `-medium` 500, `-semibold` 600, `-bold` 700 | |
| Drop shadow | `--ds-shadow-sm` to `-xl`, `--ds-shadow-inset-hairline` | Shape only. Colour is the theme's `--ds-color-shadow-color`. |
| Button or input height | `--ds-control-height-sm/md/lg`, `--ds-control-tap-min` (44px) | Heights scale with density. |
| Horizontal padding in controls | `--ds-control-pad-x-sm/md/lg` | |
| Prototype transition | `--ds-duration-*`, `--ds-ease-*` | Durations 100 to 900ms. Tune with `transitions-polish`. |
| Layer order | `--ds-z-*` | raised, sticky, nav, overlay, modal, toast. |
| Focus ring | `--ds-focus-width`, `-offset`, `-style` | `base.css` already draws it; don't restyle per screen. |

## Colours: choosing by role

Several colour tokens can hold the same value (white is often both
`--ds-color-surface` and `--ds-color-accent-contrast`). The script lists
all of them; pick the one whose job matches the layer.

| The layer is | Token |
|---|---|
| Page background | `bg`; a quieter band or sidebar is `bg-alt` |
| Card, sheet, panel | `surface`; one floating above another is `surface-raised` |
| Hovered row or item | `surface-hover` |
| Dividers and outlines | `border-subtle`, `border`, `border-strong` |
| Main text | `text` |
| Secondary text | `text-dim`, then `text-muted` for the quietest |
| Text on a dark fill (or light fill in dark mode) | `text-inverse` |
| Primary action fill, links, focus | `accent`, `accent-hover` |
| Text or icon on the accent | `accent-contrast` |
| Second accent | `accent-alt` |
| Status | `success`, `warning`, `danger`, `info` |
| Text selection | `selection-bg`, `selection-text` |

All carry the `--ds-color-` prefix. Secondary text is where Figma files and
themes most often disagree on contrast. Several themes have muted text or
status colours below 4.5:1 (listed in obvious's `docs/contrast.md`); if
the frame puts small text in one of those, say so.

Layer opacity on text (a 60% black label) isn't a token. Use `text-dim` or
`text-muted` and list it as "near". A fill with alpha is compared by what
it looks like over the theme's page colour, which is how the script judges
it.

## Type: map to roles

A Figma text style is size, line height, letter spacing and weight
together. obvious sets them together too, by role, so a heading can't end
up with body leading. Map each text style to the closest role and use all
four of its properties:

```css
h1 {
  font-family: var(--ds-font-display);
  font-size: var(--ds-type-h1-size);
  line-height: var(--ds-type-h1-leading);
  letter-spacing: var(--ds-type-h1-tracking);
  font-weight: var(--ds-type-h1-weight);
}
```

h1, h2, h3 and lead are fluid. At 390 the h1 is 34px and at 1280 it's
78px, so a phone frame and a desktop frame of the same screen should both
map to h1. If a frame's sizes don't follow that growth, the role still
wins; list the size difference.

Labels are sentence case, the `label` role, no tracking. A frame with an
all-caps tracked label gets a sentence-case label and a line in the report.
Figures in tables or prices get `font-variant-numeric: tabular-nums`,
never a mono face.

## Variables, modes and styles

- Variables hold single values: colour, number, string, boolean. Figma
  can alias one variable to another and give a collection modes, such as
  Light and Dark.
- Styles can hold composites: a text style, an effect such as a shadow, a
  gradient fill. `get_variable_defs` returns both.
- A Light/Dark mode pair maps to the theme's colours and its `dark` block.
  Match each mode separately (`--mode dark`). The dark block can only
  change colours, so a dark frame with different spacing or radius is a
  difference to report. Keep one layout.
- A frame with no variables at all (raw hex everywhere) still gets
  matched: pass the literals from `get_design_context` with `--values`.
  Expect more "near" and "none" verdicts, and say the file wasn't tokenised.
- Variable names are only hints. "Primary" in a Figma library is
  often the brand colour, which may be `accent` or may be `text`. Decide
  by what the layer does.

## Values with no token

The system is small on purpose. When a value has no token:

1. Check it's real. Is it a one-off nudge (13px where 12 and 16 exist)?
   Treat that as a snap.
2. If it's real (a colour the theme doesn't have, a size well off the
   scale, a third face), don't add a token to the app and don't write the
   literal. Use the nearest token, leave a short comment at the spot
   (`/* frame: #7B3FE4, no token, asked */`), and ask in the report.
3. If the designer says keep it, it either goes into obvious (a theme
   colour, which changes every app on that theme, so it's their decision)
   or into the app's `.ds-audit.json` as an exception with a note saying
   why. Never an exception without a note, and never one you decided on
   alone.

## Writing tokens in each stack

| Stack | Write |
|---|---|
| Plain CSS | `var(--ds-color-surface)`, `var(--ds-space-md)`, `var(--ds-radius-lg)` |
| Tailwind v4 with `ds/tailwind/theme.css` | `bg-surface`, `text-ink-muted`, `border-border-subtle`, `rounded-ds-lg`, `shadow-ds-md`, `ease-ds-out`, `font-display`, `text-ds-sm`. The middle border colour has no short name, so write `border-(color:--ds-color-border)`. Spacing isn't mapped (it broke `max-w-*` once), so write `p-(--ds-space-md)` or `gap-(--ds-space-sm)`. Check `ds/tailwind/theme.css` for the full list. |
| shadcn with `shadcn/theme.css` | shadcn's own variables already point at the theme: `--primary` is the accent, `--muted-foreground` is `text-muted`, `--radius` is `radius-md`. Use shadcn's classes as they come. |
| Canvas, SVG drawn in JS, OG images | `import { tokens } from "./ds/js/tokens.js"` and read `tokens.themes.<name>["--ds-color-accent"]`. |

The audit counts `rounded-[12px]`, `text-[15px]`, hex and `rgb()` in any
of these as going around the system.

## Parts of the frame to components

| The frame shows | Use |
|---|---|
| Button | `ob-button`, with `--secondary`, `--ghost`, `--icon`, `--sm` and `--lg` |
| Text field, select, with an error line | `ob-field`, `ob-input` or `ob-select`, `ob-field-message--error` (`field.css`) |
| One-of-several pills, filters, nav items | `ob-chip`, `aria-pressed="true"` (or `.is-selected`) for the selected one |
| Text link | `ob-link` (`ob-link--strong` for the stronger one) |
| Tooltip | `ob-tooltip-host`, `ob-tooltip` |
| Count dot on a button | `ob-badge` on an `ob-badge-host`, or the registry `Badge` |
| Spinner that becomes a tick | `ob-inline-loading`, or `SuccessCheck` in React |
| Small loading spinner | `ob-spinner`, with `ob-loading-text` beside it for a longer wait |
| Bottom sheet on phones, dialog on desktop | registry `Sheet` |
| Toast or snackbar | registry `Toasts` with `useToasts()` |
| A + that opens a menu | registry `PlusMenu` |
| Segmented control or tabs | registry `Tabs` |
| Switch | registry `Switch` |
| Search box with a clear button | registry `SearchField` |
| Checkbox | registry `Checkbox` |
| Changing number | registry `AnimatedNumber` or `Odometer` |
| Dialog, popover, select, menu in a Tailwind app | shadcn, themed by the bridge |

Registry components are added with `npx shadcn add @obvious/<name>` (or
the full URL) and land in `components/obvious/`. Their size and timing
knobs are `--ob-*` properties set on `:root`. Each brings its own CSS.

If an obvious piece and the frame disagree (the frame's chip has a
different radius), use the piece as it is and list the difference.
Restyling a shared piece for one screen is how apps drift apart.

## Tokens handed over as a file

If the designer exports tokens as a file instead of using variables, it
may be in the Design Tokens Community Group format (stable since version
2025.10): each token is an object with `$value` and usually `$type`,
groups nest, and `{group.token}` points at another token. Resolve the
references to plain values first, then feed the values to
`match-tokens.mjs` with `--values`, keeping the token names as hints. Don't
add the file's tokens to the app. They're evidence of intent; obvious is
still the source.
