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
| `routine` | daily-routine | yes | Follows the clock, warm in the morning and dark at night. |
| `parchment` | brookwood-hunt | **no** | Aged paper, brown ink, oxblood seal, candlelight. |
| `morris` | MorrisOS | yes | Warm grey paper, near-black ink, one green. Has a dark set. |

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

A theme can also have a `dark` block. It can only override colours the theme
already has (the build checks), and it's emitted under
`prefers-color-scheme: dark`. Set `data-ds-mode="light"` or `"dark"` on
`<html>` to force one. `morris` is the only theme with one so far, because
MorrisOS follows the phone's setting.

## Using it

This repo is public, so an npm-built app can install it straight from GitHub
with no auth. Pin a commit or tag, and use the tarball URL rather than
`github:`, because npm records `github:` in the lockfile as an SSH URL that
Vercel can't fetch:

```sh
npm i https://codeload.github.com/trev-delivers/obvious/tar.gz/<commit-or-tag>
```

```ts
import "obvious/css/primitives.css";
import "obvious/css/themes/morris.css";
```

The static site and the README card generator aren't npm-built, so they
carry a copy of `scripts/sync-ds.mjs` and a generated `ds/` folder instead:

```sh
node scripts/sync-ds.mjs             # pull main into ds/
node scripts/sync-ds.mjs --ref v0.2.0  # pin a tag
node scripts/sync-ds.mjs --check     # CI: fail if ds/ is stale
DS_LOCAL=../obvious node scripts/sync-ds.mjs   # against a local checkout
```

The skills every repo should have, `engineer` and `write-like-trev`, live
here in `.claude/skills/`. `scripts/sync-skills.mjs` copies them into an
app's `.claude/skills/` the same way, and leaves any skills of the app's
own alone:

```sh
node scripts/sync-skills.mjs           # pull main into .claude/skills/
node scripts/sync-skills.mjs --check   # CI: fail if a copy is stale
DS_LOCAL=../obvious node scripts/sync-skills.mjs
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

That last import is **additive**. It gives you `bg-surface`, `text-ink-muted`,
`rounded-ds-lg`, `ease-ds-out` and `shadow-ds-md`, all resolving through
`--ds-*` at runtime rather than snapshotting values at build time, and it
leaves Tailwind's own scales alone.

That namespacing is not fussiness. The first version of this bridge mapped
straight onto `--spacing-*`, `--radius-*`, `--text-*` and `--shadow-*`, which
quietly changed what `rounded-lg`, `text-base` and `shadow-sm` meant in the
consuming app. `--spacing-*` was the worst of them: Tailwind resolves
`max-w-md` through that same namespace, so `max-w-md` became 16px and every
sheet and centred column in the app collapsed to a strip. Tailwind's spacing
scale is numeric and is not ours to rename, so it is not mapped at all — use
`var(--ds-space-md)` directly when you want a step.

The two deliberate overrides are `--font-sans` and `--font-mono`. Naming the
app's typeface is the one thing the bridge should take over.

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
npm run build        # regenerate dist/ from src/, then build the site
npm run check        # build and fail if dist/ is not committed up to date
npm run site:serve   # the site on localhost:4321
```

The website lives in `web/`. `web/build.mjs` writes it to `site/`, which
Vercel serves and git ignores. Pages link the real stylesheets from `dist/`,
and the token tables and theme pages are generated from `src/`, so the site
changes when the system does. Page content is in `web/pages.mjs`.

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
| `t-check-badge` | Spinner that turns into a filled tick, in place. |
| `t-pro-btn` | White pill with a glowing rim. Full width or docked icon. |
| `t-gradient-text` | Seven drifting gold washes, clipped to glyphs. |
| `t-think` | Thinking shimmer: a phrase cycling under a sweeping highlight. |
| `t-boot-ring` | Pixel-LED ring that powers up, then breathes. |
| `t-link` | The house text link: muted on a hairline, both take the accent. |
| `t-reveal` | Scroll and load reveals. |
| `t-stagger` | A short sequence of lines inside something that just appeared. |
| `t-badge` | The notification dot that pops onto a button once. |
| `t-tt` | Hover tooltip. |
| `t-confetti` | Paper flakes with real physics that pile on the button. |

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
gold and `t-check-badge` keeps its green: the first is a fixed material
that should look the same everywhere it appears, and the second is a success
signal, which stops being readable at a glance if it changes colour per app.

## Is it actually being used?

`--check` proves the copy in `ds/` is current. Whether the app uses any of it
is a separate question, because an app can carry the whole system and still be
built out of hard-coded hexes. The audit answers that one.

```sh
npm run audit ../app-one ../app-two   # from here, across checkouts
node scripts/audit-ds.mjs             # or from inside one app
node scripts/audit-ds.mjs --detail    # every finding, with file:line
node scripts/audit-ds.mjs --max 60    # exit 1 over budget, for CI
node scripts/audit-ds.mjs --json      # the same numbers for a script
```

It counts what an app takes from the system: the tokens it references, the
`t-*` components it uses, the registry items it has installed and how many of
their `ob-*` classes it uses, and the theme it imports. It finds the theme and
components in `ds/`, or in `node_modules/obvious` for an app that installs it
from npm.

Then it counts what went around the system, which is the number I care about.
Each of these gets its own line:

| Category | What it looks for |
| --- | --- |
| literal colours | hex, `rgb()` and `hsl()` values |
| literal durations | seconds and milliseconds in a transition or animation |
| literal easing curves | `cubic-bezier()` and `linear()` |
| literal font stacks | a `font-family` that names faces instead of a variable |
| literal radii | px values in `border-radius`, `borderRadius` or `rounded-[..px]` |
| px font sizes | px in `font-size`, `fontSize`, the `font` shorthand or `text-[..px]` |
| monospace | `monospace`, `font-mono`, `--ds-font-mono`, `var(--mono)` and named mono faces |
| eyebrows | capitals and letter-spacing in one rule, or `uppercase` with `tracking-*` |
| gradient text | `background-clip: text` and `bg-clip-text` |
| fonts loaded outside the theme | Google Fonts, `@font-face`, `next/font` or `@fontsource` loading a face the theme doesn't name |

It skips `node_modules`, `ds/`, build output, `scripts/`, test fixtures, and
the `.claude` and `.agents` folders where the skills live. Registry files
copied into `components/obvious/` are mine, so they don't count against the
app either.

I don't expect it to reach zero. Icons need literal fills, and Brookwood
doesn't take the interaction layer at all. I want the number small and known,
and `--max` lets an app ratchet it down.

When something is meant to stay, say why in the app's `.ds-audit.json`.
`ignore` excuses every category in those paths. An entry under `exceptions`
excuses one category, and only counts if it has a note:

```json
{
  "ignore": ["tools/"],
  "note": "tools/ is a standalone preview harness.",
  "exceptions": {
    "gradient-text": { "ignore": ["src/hero.css"], "note": "The gold headline. I chose it." }
  }
}
```

The audit prints how many findings each exception covered, next to its note,
and complains about an exception with no note or a category it doesn't know.
Exceptions only hide findings. Tokens used in an ignored file still count,
because Ritual's `palette.ts` writes every `--ds-color-*` there is and hiding
that would make the app look like it uses less of the system than it does.

### Where the apps stood on 17 October 2026

This is with the new categories, so it isn't comparable with the first run.

| App | Tokens | Components | Bypass |
| --- | --- | --- | --- |
| MorrisOS | 23 | 4/12 | 290 |
| designedbytrev | 53 | 8/12 | 119 |
| brookwood-hunt | 35 | 0/12 | 81 |
| condiment-gallery | 0 | 0 | 58 |
| daily-routine | 36 | 0/12 | 46 |
| eye-for-type | 40 | 0/12 | 13 |
| trev-delivers | 11 | 0/12 | 9 |
| time-dissonance | 37 | 10/12 | 0 |

condiment-gallery doesn't take obvious yet. Its colours are the condimental
theme copied in by hand, so it scores zero for adoption. Brookwood's 0
components is on purpose.

## React components

`registry/` holds React components, served as a
[shadcn registry](https://ui.shadcn.com/docs/registry) from the docs site.
shadcn copies a component's source into the app instead of installing it, so
each app owns its copy and takes updates when it re-runs `add`.

| Item | What it is |
| --- | --- |
| `sheet` | Bottom sheet on phones that drags down to close, centred dialog from 640px. |
| `toasts` | Stacked toasts. `useToasts()` gives you `toast(text, tone)`. |
| `plus-menu` | A + that grows into the menu it opens. |
| `motion` | Tabs, Badge, PopNumber, TextSwap, useReveal, SuccessCheck, Toggle, SearchField, Check, IconSwap, Matrix, Reel. |

They came out of MorrisOS. Class names are `ob-*` and colours come from the
theme, so they work in any app that loads one.

```sh
npx shadcn add https://obvious-nine.vercel.app/r/sheet.json
```

Or add the registry to the app's `components.json` once and use the short
name:

```json
"registries": { "@obvious": "https://obvious-nine.vercel.app/r/{name}.json" }
```

```sh
npx shadcn add @obvious/sheet
```

Files land in `components/obvious/`. Each `.tsx` imports its own CSS.
Size, radius and timing knobs are `--ob-*` custom properties at zero
specificity, so an app sets them on `:root` to match itself. MorrisOS sets
`--ob-shade`, `--ob-shadow-float` and `--ob-badge-bg`, for example.

`npm run build` regenerates `dist/r/` from `registry.json` and
`registry/obvious/`.

### transitions.dev

These components are wrappers around transitions.dev snippets: they set the
classes and data attributes each snippet expects. The snippets' CSS is not in
this repo. Its terms let you use them in as many of your own products as you
like, but not republish them as a kit, and this repo is public.

So each app pulls the CSS itself. Every registry item lists the snippets it
needs, and shadcn prints the command after install:

```sh
npx transitions-dev add modal banner-stacking plus-menu-morph tabs-sliding ...
```

Then load, in this order: primitives and a theme, the transitions.dev CSS,
`obvious/css/transitions-bridge.css`, then the app's own styles. The bridge
points transitions.dev's colour hooks (`--tabs-bar-bg`, `--shimmer-base`
and so on) at the theme. It has to come after the transitions.dev CSS
because that sets its own dark-grey defaults on `:root`.

The `t-*` components in the interaction layer above are different: they're
hand-written adaptations that lived in the portfolio's own stylesheet, and
nothing in them comes from a transitions.dev package. The only third-party
component anywhere is `border-beam`, which is MIT.

## shadcn/ui

For the structural parts the registry doesn't cover (dialog, popover,
select), use shadcn's own components. `obvious/shadcn/theme.css` points
shadcn's variables (`--background`, `--primary`, `--radius` and the rest) at
`--ds-*`, so they pick up the app's theme, dark set included, with no `.dark`
class. Import it after shadcn's globals.

shadcn's components are written in Tailwind, so this needs a Tailwind app.
MorrisOS isn't one, which is why the registry components above are plain
CSS.

## Icons

`icons/` has a favicon for each theme, all drawn the same way: a 32px
tile with an 8px radius and a hairline edge, and one mark drawn with a
2.5px round-ended stroke, in the theme's own colours. Core is a T,
specimen an eye, dissonance a clock, routine a sun on the horizon,
condimental a bottle and parchment a lit window. Apps copy the SVG in, plus
PNG and ICO versions where they need them.
