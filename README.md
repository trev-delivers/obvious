# obvious

The design system behind everything I ship. Named after the thing the
portfolio claims: *I make complicated products feel obvious.*

Design tokens, themes and a shared interaction layer, used by every app I run. One source of truth in
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
apps: the spacing scale, the type scale, line heights, motion easings and
durations, focus ring behaviour, shadow shape, control heights, z-index layers.
These are the things that make two screens feel like they were drawn by the
same hand even when they share no colour at all.

The type scale is lifted verbatim from designedbytrev, which is the type
authority — its real sizes, not a scale invented around them. Roles rather than
t-shirt sizes (`--ds-type-h1-*`, `--ds-type-body-*`), because size, leading and
tracking travel together: a heading that takes h1's size and body's 1.6 leading
is the most common way a page quietly stops looking like the rest of them.

**Dials** live in `src/themes/*.json` and are what an app is allowed to differ
on: palette, font trio, `--ds-radius-base`, `--ds-density`. Radius steps are
derived from the base, so Brookwood sets `4px` and gets near-square paper
while Condimental sets `16px` and gets soft cards, and the *ratio* between a
small and a large radius stays the same in both. Density multiplies control
heights and padding the same way.

So Brookwood's parchment and Condimental's mustard stop being exceptions to
the system and become expressions of it.

## Themes, and who is in the family

| Theme | App | Family | Character |
| --- | --- | --- | --- |
| `core` | designedbytrev | yes | Near-black, one blue accent. The reference. |
| `condimental` | condiment-gallery | yes | Dark and glassy, mustard-to-ketchup gradient, round. |
| `dissonance` | time-dissonance | yes | Night-sky navy with a low amber lamp. |
| `routine` | daily-routine | yes | Light, warm off-white, one green accent. The plain one. |
| `parchment` | brookwood-hunt | **no** | Aged paper, brown ink, oxblood seal, candlelight. |

Family members take everything: primitives, base, the type scale and the whole
interaction layer below. They are meant to feel like the same hand made them.

Brookwood stands apart deliberately. It is the one app built for people who
have never seen any of the others, so it takes the primitives — spacing, type
scale, motion curves, focus behaviour — and none of the shared components. No
gradient text, no Pro button, no thinking shimmer. Those would make it read as
part of a portfolio rather than as a thing found in a village. The engineering
is shared; the voice is not.

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
DS_LOCAL=../obvious node scripts/sync-ds.mjs   # against a local checkout
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

## The interaction layer

The portfolio's components, lifted out so the rest of the family can use them.
They keep the `t-` prefix they were written with, which marks their origin in
transitions.dev's work and means adopting them in designedbytrev is a deletion
rather than a rename across three files.

| Component | What it is |
| --- | --- |
| `t-input` | The field assembly: border tween, error state, shake, message. |
| `t-check-badge` | Spinner that morphs into a filled check, in place. |
| `t-pro-btn` | White pill with a glowing Pro rim. Full width or docked icon. |
| `t-gradient-text` | The seven-wash drifting spectrum, clipped to glyphs. |
| `t-think` | Thinking shimmer: a phrase cycling under a sweeping highlight. |
| `t-boot-ring` | Pixel-LED ring that powers on, then breathes. |
| `t-link` | The house text link: muted on a hairline, both take the accent. |
| `t-stagger` / `t-seq` / `t-word` | Scroll and load reveals, word-by-word headings. |

```css
@import "../ds/css/components.css";      /* all of it */
@import "../ds/css/components/field.css"; /* or just what you use */
```

Behaviours that CSS cannot do live in one dependency-free module. Each returns
a teardown or a control object, which is the shape a React effect wants:

```js
import { mountBootRing, checkMorph, shake, cycleThink, revealOnScroll } from "./ds/js/behaviours.js";

useEffect(() => mountBootRing(ref.current).destroy, []);
```

Every one of them reads its timing from the component's own CSS custom
properties rather than hard-coding it, so retiming stays a CSS change and the
two can never disagree.

Two components are deliberately not tokenised. `t-gradient-text` keeps its own
spectrum and `t-check-badge` keeps its green: the first is a fixed material
that should look the same everywhere it appears, and the second is a success
signal, which stops being readable at a glance if it changes colour per app.

## Not here yet

shadcn/ui, through a registry served from this repo, for the structural
primitives the React apps need and this layer does not cover — dialog, popover,
select, the parts where getting focus trapping and ARIA right matters more than
character. The character is already here.
