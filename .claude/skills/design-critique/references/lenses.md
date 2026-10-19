# The lenses

What to check in the second pass. Each lens has the checks, the obvious
tokens that apply, and the principle to name in a finding. Judge each check
against the goal and task from step 1: a check that doesn't affect the task
is at most Polish.

## Contents

1. Hierarchy and scanning
2. Layout and spacing rhythm
3. Type roles
4. Colour and contrast
5. Consistency with obvious and the platform
6. States
7. Flows and the steps between screens
8. IA and labelling
9. Feedback and affordances
10. Motion
11. Content
12. Responsive at 390 and 1280
13. Obvious's tokens at a glance

## 1. Hierarchy and scanning

- Squint at the fold shot (or look at it small). Is the most prominent thing
  the thing the task needs first? If not, that's usually the top finding.
- Count the levels. More than about 3 type sizes or 3 contrast levels on one
  screen and nothing leads. No more than 2 things at the largest size.
- One primary action per screen, visibly heavier than the rest. Two buttons
  in the accent colour read as equally important (similarity).
- Can someone scan it? Headings that say what's under them, key words at the
  start of lines, short chunks. Walls of text force the F-pattern, where
  people read the first lines and the left edge and miss the rest.
- Does the first screen at 390 show the task, or a hero someone has to get
  past?

Principles: visual hierarchy (NN/g), scanning patterns (F-pattern,
layer-cake), Gestalt similarity.

## 2. Layout and spacing rhythm

- Related things closer together than unrelated things (proximity). The
  classic miss: a heading equidistant between the section above and its own
  content, so it seems to belong to neither. Headings sit closer to what
  they introduce.
- Spacing comes from the scale. Gaps should land on `--ds-space-*` steps:
  2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. Vertical rhythm between page
  sections uses `--ds-space-fluid-s|m|l|xl`. A run of near-misses (14, 18,
  22, 28px) is what makes a page feel slightly off without anyone being
  able to say why.
- Gaps grow with the size of the boundary: inside a control < between
  controls < between groups < between sections. If they're all the same,
  grouping disappears.
- Containers only where whitespace can't do the job (common region). Boxes
  inside boxes, borders on everything, or full-width bands that look like
  the end of the page ("false floors") are findings.
- Text measure no wider than `--ds-measure` (68ch). Page edges use
  `--ds-gutter`; content width tops out at `--ds-container` (1140px).
- Alignment: a shared left edge per column. Count the distinct left edges in
  a screenshot; each one that isn't doing a job is drift.

Principles: Gestalt proximity, common region.

## 3. Type roles

- Each piece of text uses a role, and size, leading and tracking travel
  together: `--ds-type-{h1,h2,h3,lead,body,ui,label}-{size,leading,tracking,weight}`.
  A heading with body leading (1.6) looks loose; body text with heading
  leading (1.06) looks cramped.
- The scale's sizes: 11, 12.5, 13, 14, 15, 17px, lead 16 to 19, h3 20 to 28,
  h2 30 to 52, h1 34 to 78 (the last four are fluid). The capture script
  lists the computed sizes; anything off the list is worth a look on screen.
- The theme's 2 faces only: `--ds-font-display` for headings,
  `--ds-font-sans` for the rest. The script lists faces in use; a third face
  (or a fallback like `-apple-system` showing up for real text) is a
  finding unless the page is showing other themes on purpose.
- No monospace, including for numbers, dates and captions. Figures that line
  up use `font-variant-numeric: tabular-nums`.
- No eyebrows: no small label above a heading, nothing in capitals with
  letter-spacing. Labels are sentence case in the `label` role.
- Long reading uses the `body` role (17px, 1.6 leading) at every width.

Principles: obvious's design rules (its CLAUDE.md), type roles in
`src/primitives.json`.

## 4. Colour and contrast

- WCAG 2.2 AA: text 4.5:1, large text (24px, or 18.66px bold) 3:1. UI
  parts that carry meaning (input borders, focus rings, icons, chart marks)
  3:1 against what's next to them. The script's contrast list is
  approximate and skips images and gradients; confirm on the screenshot.
- Colour never the only signal. Errors, selected states, status and links
  in text need a second cue (an icon, weight, underline, words).
- The accent means "you can act on this". Decorative use of the accent
  colour on things that can't be clicked misleads (similarity).
- Red and the theme's `--ds-color-danger` reserved for errors and
  destructive actions.
- Every colour from a `--ds-color-*` token. Check both light and dark
  shots: a token that works in one and vanishes in the other is common
  (`--ds-color-text-muted` on `--ds-color-surface` is the usual suspect).
- Known theme failures in obvious's `docs/contrast.md` are Trev's decision;
  report them once as known issues.

Principles: WCAG 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast, 1.4.1
Use of Color.

## 5. Consistency with obvious and the platform

- Internal: one name, one look and one behaviour per thing across the app.
  The same action shouldn't be a button on one screen and a link on another.
- System: shared pieces before new ones. Obvious's registry has Sheet,
  Toasts, PlusMenu and motion; its CSS components include field, chip,
  badge, link, tooltip, check-badge and reveal. A hand-built modal next to
  the registry Sheet is a finding.
- Radius from `--ds-radius-*` (worked out from the theme's
  `--ds-radius-base`), shadows from `--ds-shadow-*`, focus ring from
  base.css (2px, offset 3px, accent colour). A restyled or missing focus
  ring is a finding.
- None of the generated-site furniture from obvious's CLAUDE.md: gradient
  text and washes, pill badges above headings, glows and blobs, a coloured
  stripe down a card, 01/02/03 on things that aren't steps, hover lift on
  every card, fade-up on every section, emoji or icons in coloured squares,
  arrows tacked onto links, middle-dot metadata strings. Check
  `.ds-audit.json` for agreed exceptions first.
- Platform: on phones, people expect a back gesture and button that works,
  primary navigation at the bottom or behind a clearly labelled menu, and
  sheets that close by swiping or tapping outside. Apple's default control
  size is 44 by 44pt; Material asks for 48 by 48dp with 8dp between.
  Breaking a convention needs a reason the user benefits from.

Principles: Nielsen's consistency and standards (heuristic 4), Apple HIG,
Material.

## 6. States

Every screen has more than one. For each view in scope, check:

- **Empty:** says what goes here, why it's empty, and offers the action
  that fills it. A blank panel reads as broken or still loading.
- **Loading:** nothing for waits under 1s; a skeleton for full-page loads
  that take a few seconds; a spinner for one component; a progress bar with
  an estimate past 10s. Layout shouldn't jump when content arrives. "No
  results" must not flash before results load.
- **Error:** next to what caused it, in plain words, says what to do, keeps
  what the person typed, and stays until it's fixed.
- **Partial:** some data missing, one image failed, a list of 1.
- **Long content:** long names, 3-line titles, big numbers, 200 items.
  Does it wrap, truncate with a way to see all,
  or break the layout?
- **First use:** no saved data, no history, nothing set up. Does the screen
  explain itself?
- **Other people's view:** signed out, a guest, a role with fewer rights.
- **Offline or slow:** what happens to a tap that's still waiting?

`states.md` shows how to make each one appear.

Principles: visibility of system status (heuristic 1), help users
recognise, diagnose and recover from errors (heuristic 9), NN/g on empty
states and skeleton screens, Nielsen's response time limits.

## 7. Flows and the steps between screens

- Walk the task end to end with `--steps`. Count the steps and the
  decisions. Every step that doesn't move the person forward is a cost.
- Each screen answers: where am I, what can I do here, what happens next?
- After an action, does the person land somewhere sensible, with
  confirmation of what happened?
- Back returns to where they were, scroll position and filled-in fields
  intact. A sheet closes on back. Deep links work, and signed-out visitors
  come back to the same place after signing in.
- Anything that ends, deletes or overwrites names the thing and the
  consequence, or offers undo. Routine actions shouldn't ask for
  confirmation at all: people learn to click Yes without reading. Save
  the dialog for rare, serious ones and offer undo wherever you can.
- Long choices broken into steps; recommended options highlighted. More
  options at once means a slower decision (Hick's law), but don't hide what
  people need every time.
- Nothing has to be remembered from one screen to the next.

Principles: user control and freedom (3), error prevention (5),
recognition rather than recall (6), Hick's law.

## 8. IA and labelling

- Navigation is the same on every screen of a section, and stays put.
- Count top-level items on a phone. Experiments and rarely used tools go
  somewhere quieter than the main bar.
- Labels are the user's words and say what's behind them. "Resources",
  "Hub", "More" and "Explore" say nothing. A button label says what it does
  ("Copy link" when it copies a link).
- One name per thing across nav, headings, buttons, page title and docs.
- The current location is marked in the navigation.
- Grouping in menus matches how people think about the tasks. Watch for
  menus that mirror how the code or the team is organised.

Principles: match between the system and the real world (2), consistency
and standards (4).

## 9. Feedback and affordances

- Things that can be tapped look tappable (a button looks like a button, a
  link is underlined or clearly coloured in text) and things that can't,
  don't.
- Every tap gets a visible response within about 100ms: pressed state,
  selection, the result itself. Buttons that wait show a pending state and
  can't be double-submitted.
- Hover is a bonus. Anything that only appears on hover doesn't exist on a
  phone.
- Focus is visible on every interactive element and never hidden behind a
  sticky header or sheet.
- Targets: at least 24 by 24 CSS px with spacing (WCAG 2.2 AA); obvious's
  `--ds-control-tap-min` is 44px, and that's the bar for touch. Small
  targets close together cause wrong taps (Fitts's law); labels on icons
  make the target bigger.
- Controls used together sit together: the submit button near the last
  field, a menu near what opened it.

Principles: Fitts's law, visibility of system status (1), WCAG 2.5.8
Target Size (Minimum), 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured
(Minimum).

## 10. Motion

- Motion explains a change: something appeared, moved, was saved, came
  from somewhere. Motion that only decorates is a finding when it delays
  the task.
- Durations from `--ds-duration-*` (100, 150, 250, 400, 700, 900ms). Small
  feedback around 100ms; panels and sheets 200 to 300ms; over 400ms only
  for big moves across large screens. Too long is far more common than too
  short.
- Easing from `--ds-ease-*`: `out` for things arriving, `in` for things
  leaving. Entrances slightly longer than exits. No linear movement.
- The more often an animation is seen, the shorter it should be.
- With `--reduced-motion`, movement goes and the content still appears.
  Compare the two capture runs: a page that's blank or half-faded with
  reduced motion is a Blocks finding.
- For timing detail, hand off to `transitions-polish`.

Principles: NN/g on animation duration, WCAG 2.3.3 Animation from
Interactions (AAA, and obvious's base.css already honours
`prefers-reduced-motion`).

## 11. Content

- The words carry the task: headings say what's here, buttons say what
  happens, errors say what to do.
- Plain language, the user's words, no internal jargon.
- Front-load: the important words first in headings, labels and links.
- Nothing invented: no placeholder lorem, fake numbers or made-up
  testimonials in something about to ship.
- For Trev's projects, words follow `write-like-trev` (UK spelling,
  numerals, no em dashes). Note copy problems in the crit; rewriting is
  that skill's job.

Principles: match between the system and the real world (2), aesthetic and
minimalist design (8).

## 12. Responsive at 390 and 1280

- No sideways scroll at 390 (the script reports it, and which elements
  stick out). WCAG 1.4.10 Reflow asks for no 2-direction scrolling at
  320 CSS px, so 390 passing is the minimum.
- The main action is available at every width, phones included.
- On phones, primary actions within reach and not under the browser's own
  bars; nothing important only in a hover state.
- Stacked columns keep related things together. Content that sat side by
  side at 1280 can end up far apart at 390 (proximity breaks on reflow).
- At 1280, line length stays within the measure and the layout uses the
  width for something (a sidebar, a second column) or centres sensibly.
  Stretched cards and 1200px-wide paragraphs are findings.
- Tables and wide content: scroll inside their own box, or change shape.
- Light and dark both checked where the app has both.

Principles: WCAG 1.4.10 Reflow, Gestalt proximity.

## 13. Obvious's tokens at a glance

From `src/primitives.json` (same in every app) and `src/themes/*.json`
(per app):

| Kind | Tokens |
|---|---|
| Space | `--ds-space-3xs` 2 to `--ds-space-5xl` 128px; fluid `--ds-space-fluid-s|m|l|xl` |
| Width | `--ds-gutter`, `--ds-measure` 68ch, `--ds-container` 1140px |
| Type roles | `--ds-type-{h1,h2,h3,lead,body,ui,label}-{size,leading,tracking,weight}` |
| Faces | `--ds-font-display`, `--ds-font-sans` (theme) |
| Colour | `--ds-color-{bg,bg-alt,surface,surface-raised,border,text,text-dim,text-muted,accent,accent-contrast,success,warning,danger,info}` (theme) |
| Radius | `--ds-radius-{xs,sm,md,lg,xl,full}` from the theme's `--ds-radius-base` |
| Controls | `--ds-control-height-{sm,md,lg}` times `--ds-density`; `--ds-control-tap-min` 44px |
| Motion | `--ds-duration-{instant,fast,base,slow,slower,slowest}`, `--ds-ease-{out,in,in-out,spring}` |
| Focus | `--ds-focus-width` 2px, `--ds-focus-offset` 3px, accent colour |
| Layers | `--ds-z-{base,raised,sticky,nav,overlay,modal,toast}` |
