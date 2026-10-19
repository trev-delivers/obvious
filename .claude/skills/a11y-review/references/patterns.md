# Patterns

What to check for each common widget, from the WAI-ARIA Authoring Practices
Guide (APG), then what to look for in obvious's own registry pieces. A native
HTML element (`<button>`, `<select>`, `<details>`, `<dialog>`, a checkbox)
gets its keys and roles from the browser, so prefer it in a fix. ARIA roles
add no keyboard behaviour: a `role="menu"` with no arrow keys is worse than
a plain list of buttons, because it promises something it doesn't do.

The APG's examples are references. It says itself they need testing with
real browsers and assistive technology before use.

## Contents

- Dialog (modal) and sheets
- Disclosure (show and hide, including site navigation)
- Menu button and menu
- Tabs
- Switch
- Combobox and listbox
- Tooltip
- Toasts and other status messages
- obvious's registry pieces

## Dialog (modal) and sheets

Test: open it from the keyboard, Tab and Shift+Tab right round it, press
Escape, check where focus lands, then open it again and close it with its
button.

- Opening moves focus inside. Usually the first focusable element; the
  least destructive button for a "delete this?" dialog; static text at the
  top (with `tabindex="-1"`) when the content is long.
- Tab and Shift+Tab stay inside and wrap. Focus reaching the page behind is
  a failure of 2.4.3 Focus Order and, where it then lands under the dialog,
  2.4.11.
- Escape closes it.
- Closing returns focus to whatever opened it, or to the next logical place
  if that's gone.
- `role="dialog"` with `aria-modal="true"`, named by its visible title
  (`aria-labelledby`) or `aria-label`. A dialog with no name is announced as
  just "dialog" (4.1.2).
- Only mark it modal if the page behind really is blocked and covered.
- There's a visible close button.
- A native `<dialog>` opened with `showModal()` makes the rest of the page
  inert and closes on Escape by itself; it still needs a name and sensible
  first focus (`autofocus`).
- In the tree with the dialog open, the page behind should be gone or inert.

## Disclosure (show and hide, including site navigation)

A button that shows and hides a region: a "Menu" button for site navigation,
an accordion header, "Show more".

- It's a `button`; Enter and Space toggle it.
- `aria-expanded` is `true` when open and `false` when closed (check it
  flips in the tree). `aria-controls` is optional.
- When closed, the content is out of the Tab order and out of the tree.
- For site navigation the APG has a disclosure navigation example, which is
  simpler and more forgiving than a menu. Escape to close is nice to have,
  not a WCAG requirement: put it under "worth doing".

## Menu button and menu

Only for application-style menus of actions (Edit, Share, Delete), with
`role="menu"` and `role="menuitem"`.

- The button has `aria-haspopup="menu"` (or `true`) and `aria-expanded`.
- Enter, Space (and optionally Down Arrow) open the menu and move focus to
  the first item.
- Up and Down Arrows move between items; Home and End go to the ends.
- Escape closes the menu and returns focus to the button.
- Tab moves out of the menu and closes it. Items aren't separate Tab stops.
- If the items are reached with Tab and arrows do nothing, either the roles
  should go (a plain group of buttons) or the arrow keys should be added.
  Report the mismatch as a 4.1.2 problem when the roles mislead.

## Tabs

- `tablist` (with a name) containing `tab`s; each panel is a `tabpanel`
  labelled by its tab. The active tab has `aria-selected="true"`.
- Tab moves into the tab list onto the active tab, and Tab again moves to
  the panel. Left and Right Arrows move between tabs (Up and Down if
  vertical) and wrap.
- Selecting on focus is fine when panels appear at once; otherwise Enter or
  Space selects.
- A row of buttons styled as tabs with none of this is fine too, as long as
  it doesn't claim the tab roles. Segmented controls that filter a list are
  usually buttons with `aria-pressed`.

## Switch

- `role="switch"` with `aria-checked`, or a checkbox styled as a switch.
- Space toggles it.
- The label stays the same when the state changes ("Dark mode", not "Turn
  dark mode on" swapping to "Turn dark mode off").

## Combobox and listbox

Custom selects and type-ahead inputs are the most often broken widget. If a
native `<select>` would do, the fix is the native element. If it must be
custom, check against the APG combobox pattern: the input has
`role="combobox"` and `aria-expanded`, Down Arrow moves into the options,
focus stays on the input with `aria-activedescendant` pointing at the
current option, Enter picks and closes, Escape closes and leaves focus on
the input, and the chosen value ends up in the input.

## Tooltip

- Shows on hover and on keyboard focus.
- Escape hides it without moving focus (1.4.13).
- The pointer can move onto it without it vanishing (1.4.13).
- Tied to its trigger with `aria-describedby`, unless it only repeats the
  trigger's name.
- Nothing essential lives only in a tooltip; touch screens can't hover.

## Toasts and other status messages

- The container is a live region and is in the page before any toast is
  added. `role="status"` for confirmations, `role="alert"` only for errors
  that need attention now.
- One announcement per event: no live region around a counter or a timer.
- If it disappears on a timer, the information is available somewhere else
  too, or the user can stop it disappearing (2.2.1).
- It doesn't cover the focused element (2.4.11), and it doesn't steal focus.
- An action inside a toast ("Undo") that vanishes before a keyboard or
  screen reader user can reach it is a 2.2.1 problem; the same action
  should exist somewhere permanent.

## obvious's registry pieces

Apps copy these from obvious with `shadcn add` into `components/obvious/`,
and a later `add` overwrites the copy, so fixes belong in obvious's
`registry/obvious/` and then a re-add. Read the app's copy (it may be older)
before reporting, and say whether a finding is in the app's code or in
obvious's.

- **`Sheet`** (`Sheet.tsx`): `role="dialog"`, `aria-modal="true"`,
  focus moves to the panel on open and back to the opener on close, Escape
  closes the top sheet. Check, because the source doesn't do them: whether
  the dialog has a name (the title is an `h2` with no `aria-labelledby`
  link, so the dialog may be announced with no name); whether Tab can
  leave the sheet for the page behind (there's no focus trap and nothing is
  made `inert`); and how it closes when there's no `title`, since the Close
  button lives in the title row. Drag to dismiss on phones is fine for
  2.5.7 while the Close button is there.
- **`PlusMenu`** (`PlusMenu.tsx`): the button has `aria-expanded` and a
  label (default "Add"); items are `role="menuitem"` inside `role="menu"`,
  removed from the Tab order when closed; Escape and tapping outside close
  it. Check: no arrow-key movement between items and no `aria-haspopup`;
  focus doesn't move into the menu on open or back to the button on Escape.
- **`Toasts`** (`Toasts.tsx`): one `aria-live="polite"` container that's
  always rendered, each toast `role="status"` or `role="alert"` for errors.
  Check: toasts dismiss after 2.8 seconds (6 for errors), so the message
  must be available elsewhere (2.2.1); tapping a toast dismisses it, and it
  isn't a button, so there's no keyboard way to dismiss one early (usually
  fine, since it goes by itself).
- **`ob-tooltip`** (`src/components/tooltip.css`): shows on hover and when
  focus is inside its `ob-tooltip-host`. Check Escape and hovering the tooltip
  itself (1.4.13).
- **`ob-reveal`, `ob-stagger`, `revealWords()`**: entrance animations. With
  `base.css` and the behaviours' own `prefersReducedMotion()` checks they
  stop under reduced motion; confirm content is visible straight away with
  the setting on, and with JavaScript failing.
