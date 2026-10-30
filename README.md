# obvious

The design system behind everything I make. It's named after the line on my
portfolio: *I make complicated products feel obvious.*

It holds the design tokens, the themes and the small interaction pieces my
apps share. Everything starts in `src/` and is built into `dist/` as CSS, a
Tailwind v4 bridge, a shadcn bridge and a JS export.

I needed it because my apps don't share a stack. There's a static site with
986 lines of hand-written CSS, a Vite app with its styles in a template
string, Next apps on Tailwind v4 and on plain CSS, and a profile README whose
stats card is drawn by a build script. No component library covers all of
that, but CSS custom properties work in every one of them. Tailwind v4's
`@theme` is custom properties too, so the tokens go in with no adapter.

## What every app shares, and what it can change

**Primitives** live in `src/primitives.json` and are the same in every app:
the spacing scale, the type scale, line heights, easing curves and durations,
the focus ring, shadow shapes, control heights and z-index layers. They're
what makes two of my apps feel like they came from the same person even when
they share no colours.

The type scale is copied straight from designedbytrev, using its real sizes.
It's set by role (`--ds-type-h1-*`, `--ds-type-body-*`) so size, leading and
tracking come as a set, and a heading can't end up with body text's 1.6 line
height.

**Dials** live in `src/themes/*.json` and are what each app sets for itself:
colours, its pair of faces, `--ds-radius-base` and `--ds-density`. The radius
steps are worked out from the base, so Brookwood sets `4px` and gets
near-square paper while Condimental sets `16px` and gets soft cards, and a
small radius is the same fraction of a large one in both. Density scales
control heights and padding the same way.

## Themes

| Theme | App | Family | What it looks like |
| --- | --- | --- | --- |
| `core` | designedbytrev | yes | Near-black with one blue accent. Where a new app starts. |
| `condimental` | condiment-gallery | yes | Warm paper, brown ink, ketchup red with a bit of mustard. The roundest. The app doesn't use obvious yet. |
| `dissonance` | time-dissonance | yes | Night-sky navy with a low amber lamp, and a serif. |
| `routine` | daily-routine | yes | Follows the clock: warm in the morning, dark at night. |
| `specimen` | eye-for-type | yes | Cool proof paper and black ink, with a proofreader's red and blue. |
| `morris` | MorrisOS | yes | Warm grey paper, near-black ink and one green. Has a dark set. |
| `parchment` | brookwood-hunt | **no** | Aged paper, brown ink, an oxblood seal and candlelight. |

Family apps take everything: the primitives, `base.css`, the type scale and
the components below.

Brookwood is the exception. It's the one app made for people who've never
seen any of the others, so it takes the primitives (spacing, type scale,
easing, focus) and none of the shared components. Gold text and the loading
line would make it look like part of my portfolio
when it's meant to look like something the village made.

`core` is the reference theme. The build fails if another theme has a
different set of keys, so a theme can't drop a token and quietly pick up
whatever was there before.

A theme can also have a `dark` block. It can only change colours the theme
already has (the build checks), and it's written out under
`prefers-color-scheme: dark`. Set `data-ds-mode="light"` or `"dark"` on
`<html>` to force one. `morris` is the only theme with one so far, because
our household app follows whatever the phone is set to.

The build also checks contrast for every theme and dark set. The pairs that
fail today are in [docs/contrast.md](docs/contrast.md), each with the nearest
colour that would pass. I haven't decided on those yet, so they're recorded
in `src/contrast-exceptions.json` and the build only fails if one gets worse
or a new one appears.

## Using it

The repo is private, so an app built with npm installs a packed copy kept
in the app itself. That way Vercel and CI never need a login to build it. Pack
the commit you want, copy it into the app's `vendor/` and install from there:

```sh
# in obvious, at the commit you want
npm pack && mv obvious-0.1.0.tgz ../app/vendor/obvious-0.1.0-$(git rev-parse --short HEAD).tgz
# in the app
npm i ./vendor/obvious-0.1.0-<sha>.tgz
```

Apps that copy obvious into `ds/` fetch it with git, so their CI needs a
read-only key in a secret called `OBVIOUS_TOKEN` (see their workflow).

```ts
import "obvious/css/primitives.css";
import "obvious/css/themes/morris.css";
```

The static site and the README card generator aren't built with npm, so they
keep a copy of `scripts/sync-ds.mjs` and a generated `ds/` folder instead:

```sh
node scripts/sync-ds.mjs             # pull main into ds/
node scripts/sync-ds.mjs --ref v0.2.0  # pin a tag
node scripts/sync-ds.mjs --check     # CI: fail if ds/ was edited or half-synced
node scripts/sync-ds.mjs --latest    # also fail if ds/ is behind main
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

That last import only adds names. It gives you `bg-surface`,
`text-ink-muted`, `rounded-ds-lg`, `ease-ds-out` and `shadow-ds-md`, which
all read the `--ds-*` variables when the page runs, and it leaves Tailwind's
own scales alone.

The first version of the bridge did map onto `--spacing-*`, `--radius-*`,
`--text-*` and `--shadow-*`, and it changed what `rounded-lg`, `text-base`
and `shadow-sm` meant in the app. Spacing was the worst. Tailwind works out
`max-w-md` from the same names, so `max-w-md` became 16px and every sheet and
centred column collapsed to a strip. So spacing isn't mapped at all. Use
`var(--ds-space-md)` when you want a step.

The bridge does take over `--font-sans` and `--font-mono` on purpose, so the
app's typeface comes from the theme. The mono slot points at the theme's text
face, because none of my apps use monospace.

Anything that can't read a stylesheet (the README card generator, OG images,
canvas and WebGL code) imports the JS export instead:

```js
import { tokens } from "./ds/js/tokens.js";
tokens.themes.core["--ds-color-accent"]; // "#5B7FE8"
```

`ds/css/base.css` is optional and sets no colours or layout. It's the
behaviours I kept rewriting in every app: box sizing, focus rings,
`::selection`, text wrapping, and a reduced-motion block that zeroes delays
as well as durations. Staggered entrances use delays, so zeroing only the
duration leaves you looking at an empty screen.

## Working on it

```sh
npm run build        # rebuild dist/ from src/, then the registry and the site
npm run check        # everything below, and fail if dist/ or docs/ isn't committed
npm test             # just the tests
npm run site:serve   # the site on localhost:4321
```

`npm run check` is what has to pass before merging, run locally. CI runs the
same, but only when started by hand from the Actions tab ("Run workflow"). It builds `dist/` (which checks every theme
has the same keys and that contrast hasn't got worse), the registry and the
docs site, runs the tests in `test/`, audits obvious itself with a budget of
113, and fails if the built files aren't committed.

The website lives in `web/`. `web/build.mjs` writes it to `site/`, which
Vercel serves and git ignores. Pages link the real stylesheets from `dist/`,
and the token tables and theme pages are generated from `src/`, so the site
changes when the system does. Page content is in `web/pages.mjs`, apart
from the pixel games pages, which are in `web/pixel.mjs` with their pictures
in `web/img/`.

The pixel games pages are how my 2 games, Four Horsemen and Smuggle
Brawlers, are built: the pixel rules, the loop, effects, motion, hits,
accessibility and Discord. None of it is tokens. It's written down so the
next game starts from there. There's also a case study on the Smuggle
Brawlers lettering.

`dist/` is committed because apps copy it from a shallow clone and have no
build step of their own.

## Components

These are my own, written on the tokens. They used to be the portfolio's
`t-` components, some of them adapted from transitions.dev. On 18 Oct 2026 I
rewrote them all from scratch and gave them the names other design systems
use, with an `ob-` prefix.

| Component | What it is |
| --- | --- |
| `ob-button` | Primary, secondary, ghost and icon-only, in 3 sizes, with a loading state. |
| `ob-field` | Label, text input (`ob-input`) or select (`ob-select`), and a message. Shakes on a wrong answer. |
| `ob-inline-loading` | A small spinner that turns into a tick, in place. |
| `ob-spinner` | 8 dots in a ring, a line of text tall. CSS only. |
| `ob-loading-text` | A line that says what's happening, with a brighter band passing through it. |
| `ob-gradient-text` | The gold, with the light moving across it. |
| `ob-confetti` | Gold confetti that pops off a button and settles on it. |
| `ob-link` | Muted text with a fine underline. Both take the accent on hover. |
| `ob-chip` | One of a row of options where one is on. |
| `ob-reveal` | Things fading up as they scroll into view. |
| `ob-stagger` | The contents of something that's just opened, arriving in turn. |
| `ob-badge` | A count on a button or tab that pops in and out. |
| `ob-tooltip` | A short label on hover and keyboard focus. |

```css
@import "../ds/css/components.css";       /* all of it */
@import "../ds/css/components/button.css"; /* or just what you use */
```

The parts CSS can't do live in one module with no dependencies. Each function
returns a teardown or a control object, which is the shape a React effect
wants:

```js
import { inlineLoading, shakeField, cycleLoadingText, revealOnScroll, mountConfetti } from "./ds/js/behaviours.js";

useEffect(() => cycleLoadingText(ref.current, phrases), []);
```

Each one reads its timing from the component's CSS custom properties, so
retiming is a CSS change and the CSS and JS can't disagree.

`ob-gradient-text` keeps its own colours, so it's the same gold wherever it
appears. It breaks the written rule against gradient text, so it's listed as
an exception in `.ds-audit.json`.

### Moving an app off the old names

| Was | Now |
| --- | --- |
| `t-pro-btn` | `ob-button` (`--icon` for the round one) |
| `t-input-wrap`, `t-input`, `t-input--select`, `t-error-msg` | `ob-field`, `ob-input`, `ob-select`, `ob-field-message--error` |
| `t-check-badge` and `checkMorph()` | `ob-inline-loading` and `inlineLoading()` |
| `t-boot-ring` and `mountBootRing()` | `ob-spinner`, with 8 `<i>` inside and no JS |
| `t-think` and `cycleThink()` | `ob-loading-text` and `cycleLoadingText()` |
| `shake()` | `shakeField()` |
| `t-link`, `t-link--loud` | `ob-link`, `ob-link--strong` |
| `t-chip.is-on`, `t-chip--outlined` | `ob-chip[aria-pressed="true"]`, `ob-chip--outline` |
| `t-reveal`, `.in`, `t-word` | `ob-reveal`, `.is-visible`, `ob-reveal-word` |
| `t-stagger.is-shown`, `t-stagger-line` | `ob-stagger.is-open`, any children |
| `t-badge[data-open]`, `t-badge-dot` | `ob-badge[data-visible]` |
| `t-tt-wrap`, `t-tt` | `ob-tooltip-host`, `ob-tooltip` |

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
because the skincare app's `palette.ts` writes every `--ds-color-*` there is,
and hiding that would make the app look like it uses less of the system than
it does.

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
| `sheet` | Bottom sheet on phones that drags down to close, centred dialog from 640px, or a drawer from the right with `side`. Named from its title (or `aria-label`), keeps Tab inside and gives focus back when it closes. |
| `toasts` | Stacked toasts. `useToasts()` gives you `toast(text, tone)`. |
| `plus-menu` | A + that grows into the menu it opens. |
| `motion` | Tabs, Badge, AnimatedNumber, TextSwap, useReveal, SuccessCheck, Switch, SearchField, Checkbox, IconSwap, DotLoader, Odometer. |
| `effects` | HoloSurface, Holo, Guilloche, EncryptedText, GlowText, BorderLight and GlowCursor, from the Morris OS key card. For special moments only. |

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

`effects` is the odd one out. It's the craft from the guest key card in
MorrisOS, and it bends the rules on glow and colour, so it's only for things
like a key card, a welcome or one hero element (see "Effects" in CLAUDE.md).
Its engine is in `fx.ts`, with no React in it, which is what the docs page
runs too. Its colours are `--fx-*` on `:root`, the card's blue-violet by
default.

Every item brings its own CSS, so nothing else needs installing. They used
to wrap transitions.dev snippets and needed its CSS in the app. That's gone:
the motion is my own now. An app that still loads the transitions.dev CSS
and `obvious/css/transitions-bridge.css` can drop both once it has re-run
`add`. The bridge file is empty and stays for now so old imports don't break.

The old component names still work in `motion`: `PopNumber`, `Toggle`,
`Check`, `Matrix` and `Reel` point at `AnimatedNumber`, `Switch`, `Checkbox`,
`DotLoader` and `Odometer`. The class names inside have all changed from `t-`
to `ob-`, so an app that styled those classes itself needs to follow.

The only third-party component anywhere is `border-beam`, which is MIT.

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
condimental a bottle and parchment a lit window. There isn't one for morris
yet. Apps copy the SVG in, plus PNG and ICO versions where they need them.
