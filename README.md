# trev-ds

Design tokens and themes shared by every app I run. One source of truth in
`src/`, generated into CSS, a Tailwind v4 bridge and a JS export in `dist/`.

The problem it solves: six repos on four different stacks. A static site with
986 lines of hand-written CSS, a Vite app with its styles in a template
string, two Next apps on Tailwind v4, a greenfield app, and a profile README
whose stats card is drawn by a build script. No component library spans all of
that. CSS custom properties do, and Tailwind v4's `@theme` is itself CSS
custom properties, so the token layer needs no adapter anywhere.

## How an app stays particular without leaving the family

Two categories, and which side of the line a value falls on is the whole
design decision:

**Invariants** live in `src/primitives.json` and are byte-identical in all six
apps: the spacing scale, the type scale and its ratios, line heights, motion
easings and durations, focus ring behaviour, shadow shape, control heights,
z-index layers. These are the things that make two screens feel like they were
drawn by the same hand even when they share no colour at all.

**Dials** live in `src/themes/*.json` and are what an app is allowed to differ
on: palette, font trio, `--ds-radius-base`, `--ds-density`. Radius steps are
derived from the base, so Brookwood sets `4px` and gets near-square paper
while Condimental sets `16px` and gets soft cards, and the *ratio* between a
small and a large radius stays the same in both. Density multiplies control
heights and padding the same way.

So Brookwood's parchment and Condimental's mustard stop being exceptions to
the system and become expressions of it.

## Themes

| Theme | App | Character |
| --- | --- | --- |
| `core` | designedbytrev | Near-black, one blue accent. The reference. |
| `parchment` | brookwood-hunt | Aged paper, brown ink, oxblood seal, candlelight. |
| `condimental` | condiment-gallery | Dark and glassy, mustard-to-ketchup gradient, round. |
| `dissonance` | time-dissonance | Night-sky navy with a low amber lamp. |
| `routine` | daily-routine | Light, warm off-white, one green accent. The plain one. |

`core` is the reference theme in a literal sense: the build fails if any other
theme declares a different set of semantic keys, so a theme cannot quietly
drop a token and inherit whatever was left behind.

## Using it

Tokens are vendored, not installed. Four of the six repos are private and two
are not npm-built at all, so a dependency would mean deploy-key auth in every
build for the sake of a few KB of CSS. Each app carries a copy of
`scripts/sync-ds.mjs` and a generated `ds/` folder instead:

```sh
node scripts/sync-ds.mjs             # pull main into ds/
node scripts/sync-ds.mjs --ref v0.2.0  # pin a tag
node scripts/sync-ds.mjs --check     # CI: fail if ds/ is stale
DS_LOCAL=../trev-ds node scripts/sync-ds.mjs   # against a local checkout
```

Plain CSS:

```html
<link rel="stylesheet" href="ds/css/primitives.css">
<link rel="stylesheet" href="ds/css/themes/core.css">
<link rel="stylesheet" href="ds/css/base.css">
```

Tailwind v4:

```css
@import "tailwindcss";
@import "../../ds/css/primitives.css";
@import "../../ds/css/themes/parchment.css";
@import "../../ds/tailwind/theme.css";
```

That last import gives you `bg-surface`, `text-ink-muted`, `rounded-lg`,
`ease-spring`, `shadow-md` and the rest, all resolving through `--ds-*` at
runtime rather than snapshotting values at build time.

Anything that cannot read a stylesheet — the README card generator, OG images,
canvas and WebGL code — imports the JS export instead:

```js
import { tokens } from "./ds/js/tokens.js";
tokens.themes.core["--ds-color-accent"]; // "#5B7FE8"
```

`ds/css/base.css` is opt-in and sets no colour or layout of its own. It is
only the behaviours that were being rewritten in every app: box sizing, focus
rings, `::selection`, text wrapping, and a reduced-motion block that zeroes
delay as well as duration, because staggered entrances lean on delay and
killing only the duration leaves you staring at an empty screen.

## Working on it

```sh
npm run build   # regenerate dist/ from src/
npm run check   # build and fail if dist/ is not committed up to date
```

`dist/` is committed deliberately: consumers clone this repo shallowly and
copy it, with no build step of their own.

## Not here yet

Components. The three React + Tailwind apps (brookwood-hunt,
condiment-gallery, daily-routine) will take shadcn/ui through a registry
served from this repo, so `npx shadcn add` pulls my version rather than the
stock one. The other three consume tokens only — a static site, a Vite app
with inline styles and a README card generator have no use for React
primitives.
