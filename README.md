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
| `t-check-badge` | Spinner that turns into a filled tick, in place. |
| `t-pro-btn` | White pill with a glowing rim. Full width or docked icon. |
| `t-gradient-text` | The seven-wash drifting spectrum, clipped to glyphs. |
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
spectrum and `t-check-badge` keeps its green: the first is a fixed material
that should look the same everywhere it appears, and the second is a success
signal, which stops being readable at a glance if it changes colour per app.

## Is it actually being used?

`--check` proves the vendored copy is current. That is a different question
from whether anything uses it: an app can carry the whole system and still be
built entirely out of hard-coded hexes.

```sh
npm run audit ../app-one ../app-two   # from here, across checkouts
node scripts/audit-ds.mjs             # or from inside one app
node scripts/audit-ds.mjs --detail    # every finding, with file:line
node scripts/audit-ds.mjs --max 60    # exit 1 over budget, for CI
```

It counts two things. **Adoption**: which tokens and components an app
references, and which theme it imports. **Bypass**: the values that went
around the system anyway — literal colours, durations, easing curves and font
stacks. Bypass is the number that matters.

It is not meant to reach zero. Icons need literal fills, a one-off texture is
a one-off decision, and Brookwood's whole point is that it does not take the
interaction layer. The target is a number that is small, known, and going
down. `--max` exists so it can be ratcheted rather than watched.

Where a file is genuinely outside the system's remit, say so in the app's
`.ds-audit.json` rather than letting it sit in the count forever:

```json
{ "ignore": ["tools/"], "note": "a standalone preview harness, not the app" }
```

Exceptions suppress bypass findings only, never adoption. A file can be
outside the remit and still use the tokens — Ritual's `palette.ts` writes
every `--ds-color-*` there is — and hiding that would understate adoption to
flatter the bypass number, which is the wrong trade.

### Where it stood when the audit was written

| App | Tokens | Components | Bypass |
| --- | --- | --- | --- |
| designedbytrev | 18 | 6/8 | 92 |
| condiment-gallery | 24 | 1/8 | 44 |
| daily-routine | 21 | 0/8 | 99 |
| brookwood-hunt | 17 | 0/8 | 97 |
| time-dissonance | 14 | 0/8 | 67 |
| trev-delivers | 11 | — | 8 |

The portfolio is the only app really using the interaction layer, which is
worth saying plainly: right now this is a token system with a component layer
that mostly travels unused.

## Nothing here needs a licence

Worth writing down, because it was not obvious: none of these repos import a
transitions.dev package. Every `t-*` component is a hand-written adaptation
that lived in the portfolio's own stylesheet, and they are all in here now.
The `t-` prefix is where they came from, not a dependency.

The only third-party component anywhere is `border-beam`, which is MIT.

## Not here yet

shadcn/ui, through a registry served from this repo, for the structural
primitives the React apps need and this layer does not cover — dialog, popover,
select, the parts where getting focus trapping and ARIA right matters more than
character. The character is already here.
