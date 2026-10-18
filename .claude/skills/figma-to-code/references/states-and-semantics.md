# States and semantics a frame can't show

## Contents

- Where to look first
- Interaction states for every control
- Data states for anything that loads or submits
- Content states
- Semantics: the right element for the job
- Motion
- Writing it up

A frame is one state. Before designing a missing one yourself, check
whether the designer drew it somewhere else.

## Where to look first

1. Variants. If a frame part is a component instance, its component set
   may have hover, pressed, disabled, error or empty variants. Ask
   `Figma:get_design_context` or `Figma:get_metadata` about the component
   set, or `Figma:search_design_system` for its name.
2. Other frames on the page: "Empty", "Error", "Loading", "Dark".
   `Figma:get_metadata` with no node lists the file's pages; with a page id
   it lists that page's frames.
3. Annotations and dev resources in Dev Mode. Designers note behaviour,
   accessibility and content there (Figma's preset annotation categories
   include Interaction, Accessibility and Content). Read any that come
   back with the design context, and ask the designer if the frame clearly
   has notes you can't see.
4. The obvious component you're using. `t-input` already has its error
   state and shake, `t-chip` its hover and selected state, `Sheet` its
   focus handling. Don't redesign what the system already decided.

Anything still missing, you design with the system's tokens and list in
the report under "Decided for you".

## Interaction states for every control

| State | How |
|---|---|
| Hover | A step along the theme's own colours: `--ds-color-accent-hover` for accent fills, `--ds-color-surface-hover` for rows and quiet buttons. Wrap hover-only styling in `@media (hover: hover)` so phones don't keep it after a tap. |
| Focus-visible | `base.css` draws the ring in the accent. Don't remove it or restyle it per screen. Check it isn't clipped by `overflow: hidden` and isn't hidden under a sticky bar (WCAG 2.4.11). |
| Active or pressed | Optional, and small: a colour step. Layout stays still. |
| Disabled | Prefer leaving the control enabled and explaining what's missing when it's pressed. If it must be disabled, use the `disabled` attribute so it's announced, and keep its label readable. |
| Selected, on, current | `aria-pressed`, `aria-selected` or `aria-current` as the pattern needs, plus a visual change that isn't colour alone (WCAG 1.4.1). |

Tap targets on phones are at least `--ds-control-tap-min` (44px). WCAG
2.2's floor is 24 by 24 CSS px (2.5.8), and obvious sets the higher one
because these apps are used one-handed. A small icon can keep its drawn
size with a larger hit area from padding.

## Data states for anything that loads or submits

| State | What to build |
|---|---|
| Loading | Nothing if it's usually under a second. A skeleton in the shape of the real content for a page that takes a few seconds; a spinner for one small part; a progress bar with a time estimate past about 10 seconds (NN/g). obvious has `t-boot-ring`, `t-think` and the registry `Matrix` for waits. Keep the page's layout stable as content arrives. |
| Empty | Say what will appear here and how to fill it, with the action that does it. Never a blank box, and never "No results" while it's still loading. |
| Error | Say what went wrong and what to do, in plain words, next to the thing that failed. For forms: the message by the field, linked with `aria-describedby`, the field marked `aria-invalid`, nothing the person typed cleared, and on submit a summary at the top that links to each field (GOV.UK's pattern). Errors stay until fixed. Use the app's own error helper if it has one. |
| Success | Confirm where the action happened: `t-check-badge` or `SuccessCheck` in place, or a toast for something that happened elsewhere. Announce it with a polite live region if focus doesn't move (WCAG 4.1.3). |
| Offline or partial | If the app has these states elsewhere, match them. If not, list it as not handled. |

## Content states

- **Long text.** Names, titles and labels will be longer than the
  frame's. Translated strings can be 2 to 3 times as long as short English
  ones (W3C, from IBM's figures). Try the longest real value you can find,
  then a silly one. Decide per element: wrap (the default), clamp to a
  number of lines with the full text available, or truncate with an
  ellipsis and a way to see the rest. Buttons wrap rather than truncate.
- **Short or missing text.** One-word titles, no description, no image.
  Nothing should collapse or leave a hole.
- **Many and few.** 0, 1 and 50 items. Lists need a sensible end (paging,
  "show more") and grids shouldn't look broken with one card.
- **Numbers.** Large values, negatives, zero. Use `tabular-nums` where
  figures line up. Dates go through the app's date helper if it has one.
- **Images.** Missing, slow, or a different shape from the frame's.
  Reserve the space with `aspect-ratio` so the page doesn't jump.

## Semantics: the right element for the job

A frame is shapes and text. The browser and screen readers need to know
what each shape is.

- `<button>` for actions, `<a href>` for going somewhere. Never a
  clickable `div`. Native elements bring keyboard support and announce
  themselves; an ARIA role brings neither on its own, which is why the
  WAI-ARIA Authoring Practices put "no ARIA is better than bad ARIA" first.
- One `h1`, then headings in order, matching the visual hierarchy. A big
  number in a card isn't a heading because it's big.
- Landmarks: `header`, `nav`, `main`, `footer`. One `main`.
- Every input has a visible `<label>`. Placeholder text in the frame is a
  hint at most. Group related radios and checkboxes in a `fieldset` with a
  `legend`.
- Icon-only buttons get an accessible name (`aria-label` on the button,
  or visually hidden text). Decorative icons get `aria-hidden="true"`.
- Images that carry meaning get alt text that says what the image tells
  you; decorative ones get `alt=""`. Ask for real alt text if the frame
  doesn't say.
- Custom widgets (tabs, menus, dialogs, comboboxes) follow the WAI-ARIA
  APG pattern for that widget, including the keys. The registry `Tabs` and
  `Sheet` already do. Prefer them.
- Reading and Tab order follow the source. Build the source in the order
  the screen should be read, then lay it out.
- `lang` on `<html>` (`en-GB` for these apps).
- Contrast: 4.5:1 for text, 3:1 for large text, icons, borders that
  matter and the focus ring (WCAG 1.4.3, 1.4.11). Measure with the real
  token values.
- Hover or focus content (tooltips, previews) can be dismissed with
  Escape, can be hovered without vanishing, and stays until dismissed
  (1.4.13). `t-tt` shows on hover and keyboard focus; link it with
  `aria-describedby`.

For a full audit, `a11y-review` (if present) or the `engineer` skill's
`references/standards/accessibility.md` covers the rest.

## Motion

Figma prototypes can show transitions and Smart Animate. Rebuild them with
`--ds-duration-*` and `--ds-ease-*`, or the registry and transitions.dev
pieces via `transitions-dev`. Motion should explain a change: something appeared, moved or saved. Everything respects `prefers-reduced-motion`: `base.css` zeroes CSS
durations and delays, JS motion in React checks `reduced()` from the
registry's `motion.tsx`, and obvious's `behaviours.js` checks the setting
itself. When the frame has keyframe animation, `Figma:get_motion_context`
returns its tracks and easing; map those onto the tokens rather than
pasting its CSS.

## Writing it up

For each state or semantic choice you made yourself, one line: what, and
why. "Empty list: says 'Nothing planned yet' with an Add a meal button,
because the frame only shows a full week." The designer may want to draw
it properly; give them enough to decide.
