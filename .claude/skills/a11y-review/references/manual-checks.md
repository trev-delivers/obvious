# Manual checks

The checks a rule engine can't make, in the order to do them. Each says what
to do, what passes, what fails and which WCAG 2.2 criterion it is. Run them
on every page and state in scope, at 390 and 1280 wide.

## Contents

- Setting up a probe script
- 1. Keyboard only
- 2. Focus order and focus visible
- 3. Focus Not Obscured (2.4.11)
- 4. Target size (2.5.8) and obvious's 44px
- 5. Dragging (2.5.7) and gestures (2.5.1)
- 6. Redundant entry (3.3.7)
- 7. Accessible authentication (3.3.8)
- 8. Reflow at 320 CSS px (1.4.10)
- 9. Text spacing (1.4.12)
- 10. Zoom to 200% and 400% (1.4.4, 1.4.10)
- 11. Motion (2.2.2, 2.3.1, and obvious's rule)
- 12. The accessibility tree (1.1.1, 1.3.1, 2.4.6, 2.5.3, 4.1.2)
- 13. Forms (1.3.5, 3.3.2)
- 14. Errors and status messages (3.3.1, 3.3.3, 4.1.3)
- 15. Content on hover or focus (1.4.13) and timing (2.2.1)

## Setting up a probe script

Write throwaway scripts in the scratchpad, not in the app. Borrow the app's
Playwright the same way the pass does:

```js
// probe.mjs  (run: APP=/path/to/app node probe.mjs)
import { createRequire } from "node:module";
const req = createRequire(process.env.APP + "/package.json");
const { chromium } = req("playwright"); // or "@playwright/test"
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
await page.goto("http://localhost:PORT/");
const focused = () => page.evaluate(() => document.activeElement?.outerHTML.slice(0, 100));
// ...drive the page here...
await browser.close();
```

Useful pieces:

- What has focus: `await focused()`.
- Role and name of the focused element, as the tree has them:
  `await page.locator(":focus").ariaSnapshot()`.
- The whole tree with computed names (Chromium only):
  `const cdp = await page.context().newCDPSession(page); const { nodes } = await cdp.send("Accessibility.getFullAXTree");`
- Emulate settings: `browser.newPage({ colorScheme: "dark", reducedMotion: "reduce" })`.
- Screenshot every state you report on, and look at it.

## 1. Keyboard only

Put the mouse away. From the address bar, press Tab through the whole page,
then do each task in scope with Tab, Shift+Tab, Enter, Space, the arrow keys
and Escape.

- Passes: everything a pointer can do can be done from the keyboard (2.1.1),
  and focus never gets stuck (2.1.2). Custom controls answer the keys their
  APG pattern lists (see `patterns.md`).
- Fails: a `div` or `span` with a click handler that Tab skips; a control that
  only reacts to a click; focus that can't leave a widget or an embed; a
  single-letter shortcut with no way to turn it off or remap it (2.1.4).
- The pass prints `focus stuck (possible trap)` when the same element holds
  focus for 4 Tabs. Confirm by pressing Tab and Shift+Tab yourself.
- A skip link should be the first stop and should move focus past the header
  (2.4.1 Bypass Blocks; landmarks also satisfy it).

## 2. Focus order and focus visible

- Order (2.4.3): read the pass's `order:` line against the screen. Focus
  should follow the reading order and the task. Fails: focus jumping to the
  footer and back, a positive `tabindex` (the pass flags it), a sheet whose
  contents come after the whole page, focus landing on hidden things.
- Visible (2.4.7): every stop shows where focus is. The pass compares a
  screenshot of each element focused and blurred, and lists `no visible
  change on focus`. Open the `nofocus-*.png` files to confirm. A change that
  exists but is faint isn't covered by that check: look at the page
  screenshots, and measure the ring against what's next to it (3:1 under
  1.4.11). obvious's ring is `--ds-color-accent`, so the theme's
  `accent on bg` row in `docs/contrast.md` answers it for most stops.
- Hidden but focusable: closed menus, off-canvas navs and sheets that were
  faded out with `opacity: 0` but not `hidden`, `inert` or `display: none`.
  The pass shows them as stops with `focused but off screen` or as stops
  you can't see in the screenshot.
- After an action, focus should go somewhere sensible: into a dialog when it
  opens, back to the opener when it closes, to the new heading or the error
  summary when content is replaced.

## 3. Focus Not Obscured (2.4.11)

The focused element must not be **entirely** hidden by something the page
put there: a sticky header or footer, a cookie banner, a toast, a chat
bubble, a bottom tab bar.

- The pass flags `covered when focused (2.4.11)` when five points across the
  element all hit something else. Confirm with the page screenshot taken at
  that stop.
- Test at 390 wide and at 1280 wide zoomed to 200% (viewport 640), where
  sticky bars take a bigger share of the screen.
- Partly covered passes at AA (fully visible is AAA, 2.4.12), but if the
  ring is what's covered, check 2.4.7 too.
- Menus, tooltips and pickers the user opened don't fail, as long as they
  close when focus moves on. A panel that stays open (chat, a non-modal
  sheet) fails if it covers the focused element and the user can't move it
  away without moving focus.
- Usual fix: `scroll-padding` on the scroll container equal to the sticky
  bar's height (WCAG technique C43), or making the bar static at small sizes.

## 4. Target size (2.5.8) and obvious's 44px

2.5.8 Target Size (Minimum), AA: pointer targets at least 24 by 24 CSS px,
unless one of these applies:

- **Spacing:** a 24 px circle centred on the small target doesn't touch
  another target or another small target's circle.
- **Equivalent:** another control on the same page does the same thing and
  is big enough.
- **Inline:** it's a link in a sentence or otherwise held to the line height
  of the text around it.
- **User agent control:** it's the browser's own control, unstyled.
- **Essential:** the size is essential or legally required.

The pass lists everything under 44 px and marks what's under 24. For each
one under 24, check the exceptions by eye on the screenshot before calling it
a failure: a 20 px tall wordmark link with clear space around it passes on
spacing. axe's `target-size` rule does the circle maths, so where axe ran and
didn't flag it, the spacing exception probably holds.

obvious sets `--ds-control-tap-min: 44px`, which matches 2.5.5 Target Size
(Enhanced), a AAA criterion. Treat 44 px as obvious's own standard for
phones: report a target between 24 and 43 px as a design system issue
(moderate at most). It isn't a WCAG AA failure. Note that obvious's
`--ds-control-height-sm` is 32 px times `--ds-density`, under 44, so small
controls on phone screens need checking.

## 5. Dragging (2.5.7) and gestures (2.5.1)

Find everything that works by dragging: sliders, drag to reorder, drag to
dismiss sheets, swipe actions on rows, carousels, maps, colour pickers,
crop handles.

- Passes: the same result can be had with single taps or clicks, without
  dragging (a close button for a sheet, up and down buttons for a list,
  tapping the track of a slider, arrow buttons for a map).
- Keyboard support alone doesn't pass 2.5.7. It needs a pointer way too.
- Scrolling the page is the browser's and isn't in scope, unless the page
  has taken it over.
- 2.5.1 Pointer Gestures (A): anything that needs a path (swipe, two
  fingers, pinch) also works with a single pointer without a path.
- obvious's `Sheet` drags down to dismiss on phones. It passes when it has a
  title, because the title row has a Close button. Without a `title` prop
  there's no button; check how the app closes it then.

## 6. Redundant entry (3.3.7)

Go through each multi-step task. Anything the user already entered, or was
given, in the same process must be filled in for them or offered to pick.

- Fails: asking for the delivery address again at billing with no "same as
  delivery" option; asking for the email again on step 3; a reference number
  shown on one screen that must be typed on the next.
- Browser autocomplete doesn't count; the site has to do it.
- Allowed: confirming a new password, re-entering for security, or when the
  earlier value is no longer valid.
- A new session or a return visit is out of scope.

## 7. Accessible authentication (3.3.8)

Go through sign-in, sign-up, password reset and any verification step.

- Fails: blocking paste into a password or code field
  (`onpaste` returning false, `autocomplete="off"` on the password with
  scripts that clear pasted values); splitting a one-time code into boxes
  that won't take a paste; a puzzle or "type the characters" CAPTCHA with no
  alternative; asking for characters 3 and 7 of a password.
- Passes: a password field that password managers can fill and paste works
  in; email magic links; signing in with Google or another OAuth provider;
  passkeys, Touch ID and similar device methods; a CAPTCHA that only asks to
  recognise objects (allowed at AA).
- Check: do a real paste into each field. `insertText` types, so it won't
  catch a paste block:
  ```js
  const ctx = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  await page.goto(url); // http://localhost, so the clipboard API is allowed
  await page.evaluate(() => navigator.clipboard.writeText("123456"));
  await page.locator(sel).focus();
  await page.keyboard.press("ControlOrMeta+V");
  console.log(await page.locator(sel).inputValue()); // "" means paste is blocked
  ```
  Then confirm the password input has `autocomplete="current-password"` or
  `"new-password"` so managers can fill it.

## 8. Reflow at 320 CSS px (1.4.10)

320 CSS px wide is the same as a 1280 px window at 400% zoom. The pass loads
the page at 320 by 256 and reports sideways scroll and anything wider than
the screen.

- Passes: everything reads with vertical scrolling only, and nothing is cut
  off or overlapping. Data tables, maps, diagrams, video and games may
  scroll both ways; the rest of the page around them still has to reflow.
- Fails: sideways scroll of the whole page; text cut off at the edge; a
  fixed-width element; a sticky header or footer so tall at 320 that there's
  no room left to read (check with a screenshot at 320 by 256).
- Also check landscape: 256 CSS px tall.

## 9. Text spacing (1.4.12)

The pass applies the four values with `!important` (line height 1.5 times the
font size, paragraph spacing 2 times, letter spacing 0.12 times, word
spacing 0.16 times) at 390 wide and lists boxes that now clip their text.

- Open `text-spacing-390.png` and look for text cut off, overlapping the
  next block, or truncated with an ellipsis and no way to read the rest.
- Usual causes: a fixed `height` on a button, chip, badge or card; `overflow:
  hidden` on a text box; `white-space: nowrap` with no room.
- The page doesn't have to use these values, only survive them.

## 10. Zoom to 200% and 400% (1.4.4, 1.4.10)

- 200% (1.4.4 Resize Text): the pass checks 640 px wide, which is a 1280 px
  window at 200%. Also check the viewport meta allows zoom: no
  `maximum-scale=1` and no `user-scalable=no`
  (`grep -rn "maximum-scale\|user-scalable" --include=*.html --include=*.tsx --include=*.ts .`).
  axe's `meta-viewport` rule catches this when axe ran.
- Text-only zoom: in the probe, set
  `document.documentElement.style.fontSize = "200%"` and screenshot at 1280
  and 390. Text sized in `px` won't grow; that only fails if the browser's
  page zoom also can't get it to 200%, which it can, so report px-only text
  under worth doing.
- 400%: covered by the 320 px reflow check.

## 11. Motion (2.2.2, 2.3.1, and obvious's rule)

- 2.2.2 Pause, Stop, Hide (A): anything that moves, blinks or scrolls on its
  own for more than 5 seconds alongside other content (carousels, marquees,
  looping animations, live tickers) has a way to pause, stop or hide it.
- 2.3.1 Three Flashes (A): nothing flashes more than 3 times a second.
- Reduced motion isn't an AA requirement: 2.3.3 Animation from Interactions
  is AAA. obvious and the engineer skill require it anyway, so report
  ignoring it as a design system issue. The pass emulates
  `prefers-reduced-motion: reduce` and lists animations still running after
  1 second. An app that imports obvious's `base.css` gets the global
  reduce rule; JS animation (Framer, canvas, `requestAnimationFrame`) has to
  check the setting itself.

## 12. The accessibility tree (1.1.1, 1.3.1, 2.4.6, 2.5.3, 4.1.2)

This is what a screen reader is given. Read the pass's `aria-*.yml` from top
to bottom as if it were the page.

- Landmarks: one `banner`, `navigation` with a name if there's more than
  one, one `main`, `contentinfo`.
- Headings: one level 1, no skipped levels, and the headings alone tell you
  what's on the page (2.4.6).
- Every link, button and field has a name that says what it does (4.1.2).
  "button" with no name, "link: Read more" repeated, or an icon's file name
  are failures.
- Label in Name (2.5.3): the name starts with, or at least contains, the
  visible label, so a voice user saying what they see works. A button that
  shows "Send" and is named "Submit form" fails.
- States are there: `[expanded]`, `[pressed]`, `[checked]`, `[selected]`,
  `[disabled]`, `[invalid]`.
- Images: informative images have alt text with the information; decorative
  ones are absent from the tree. Text drawn in SVG or canvas has a text
  alternative.
- Things hidden on screen are hidden in the tree too, and the other way
  round: a closed sheet still in the tree, or a visible label marked
  `aria-hidden`, are both failures.

## 13. Forms (1.3.5, 3.3.2)

- Every field has a visible label tied to it (the tree shows the field with
  that name). A placeholder alone isn't a label.
- Required fields say so in text, not only with colour or an asterisk with
  no key.
- Instructions and format hints are visible before the user types and are
  tied to the field (`aria-describedby`).
- Fields about the user (name, email, phone, address, card) have the right
  `autocomplete` value (1.3.5 Identify Input Purpose).
- Groups of radios or checkboxes have a group label (`fieldset` and
  `legend`, or `role="group"` with a name).

## 14. Errors and status messages (3.3.1, 3.3.3, 4.1.3)

Submit each form empty, then with wrong values, then correctly.

- 3.3.1 Error Identification (A): the field in error is identified and the
  error is described in text. Colour or a red border alone fails.
- 3.3.3 Error Suggestion (AA): the message says how to fix it ("Enter a date
  like 27 3 2026", not "Invalid input").
- The error is tied to the field (`aria-describedby`, and `aria-invalid` set)
  so a screen reader reads it on focus.
- Focus moves to the first field in error or to an error summary; the user
  isn't left at the submit button with nothing announced.
- 4.1.3 Status Messages (AA): messages that appear without focus moving
  ("Saved", "3 results", "Added to basket", an error toast) are in a live
  region (`role="status"`, `role="alert"` or `aria-live`). Check the region
  exists in the page before the message is put in it: a region inserted
  already holding its text is often not read out (`role="alert"` is the
  exception). Check numbers that count up aren't inside a live region, or
  every step gets read.
- obvious's `shake()` on a field is decoration: the error still needs text.

## 15. Content on hover or focus (1.4.13) and timing (2.2.1)

Hover and focus every tooltip, popover and hover card.

- 1.4.13 (AA): it can be dismissed without moving the pointer or focus
  (Escape), the pointer can move onto it without it vanishing, and it stays
  until the user moves away or dismisses it.
- obvious's `t-tt` tooltip shows on hover and on `:focus-visible`, has
  `pointer-events: none` and no Escape handling in the CSS. Check whether the
  app adds Escape, and whether its content can be hovered. If it holds
  anything more than a repeat of the visible label, both matter.
- 2.2.1 Timing Adjustable (A): any time limit can be turned off, adjusted or
  extended. A toast that disappears is only in scope if the message isn't
  available anywhere else; obvious's `Toasts` dismiss after 2.8 seconds (6
  for errors), so check that whatever a toast says can be found again, or
  that the user can stop it going.
