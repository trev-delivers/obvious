# Triage: real or not, and how bad

## Contents

- Confirming a finding
- Common false positives
- Common false negatives
- Severity
- Ordering the report

## Confirming a finding

A finding goes in the report only when all of these are true:

1. You've seen it in the browser yourself, in a screenshot or by doing the
   thing, at the width and theme where it happens.
2. You can say which WCAG 2.2 A or AA criterion it fails, and the failure
   isn't covered by one of that criterion's exceptions. If it fails nothing
   at AA but still gets in people's way, it goes under "worth doing".
3. You can say who it stops and at which step of which task.
4. It still happens in the production build, with no dev overlay, hot
   reload or probing of your own involved.

Group repeats: one finding for "the 12 icon buttons in the toolbar have no
name", with the count and where, rather than 12 findings.

## Common false positives

| Tool says | Often actually | How to tell |
|---|---|---|
| axe `color-contrast` on text over an image, gradient or blur | Can't measure, or measured the wrong layer | axe usually puts these under needs review. Take the real colours from computed styles, or sample the darkest and lightest parts of the background under the text, and measure with `contrast.mjs`. |
| axe `color-contrast` on disabled controls | Exempt: inactive controls have no contrast requirement | Check the control really is disabled (not just styled grey). |
| axe `color-contrast` "no value" on an empty field | Needs review only | Type a value and measure the typed text and the placeholder. |
| Pass: target under 24 px | Passes on the spacing, inline or equivalent exception | Look at the screenshot: a 24 px circle centred on it touching nothing else passes. axe's `target-size` (when it ran) already did the circle maths. |
| Pass: target 24 to 43 px | Passes AA | Below obvious's 44 px only. A design system issue, moderate at most. |
| axe `scrollable-region-focusable` | Chromium 130 and later make a scroll box with no focusable children focusable by itself | The keyboard walk will show the box as a stop. Still worth fixing (`tabindex="0"` and a name) for browsers that don't; rate it moderate. |
| Pass: `no visible change on focus` on a covered element | The element was hidden under something, so both screenshots showed the cover | Read it as the 2.4.11 finding instead. |
| Pass: `no visible change on focus` on a page with transitions | The ring was still fading in | The pass runs with reduced motion on; if the app ignores that, re-check with a longer wait. |
| Pass: off screen focus stop | A skip link that's off screen until focused | Fine if it appears on focus; the screenshot at that stop shows it. |
| Pass: text spacing clip on a code block or a deliberately truncated row | Truncation with a way to see the full text passes | Check the full text is reachable (on focus, in a detail view, a title). |
| Reflow: sideways scroll caused by a data table, map or code block inside its own scroll box | Allowed: two-dimensional content may scroll | The pass ignores elements inside a scrolling parent; if the page itself scrolls, that's real. |
| axe `region` or other `best-practice` rules | Not WCAG failures | The pass doesn't run best-practice tags. If you do, put them under "worth doing". |

## Common false negatives

Clean results that hide real problems. Always check these by hand:

- A name that exists but is wrong or useless ("button", "icon-close-svg",
  "Click here", the same "Edit" ten times with nothing to tell them apart).
- Focus order that's technically complete but makes no sense.
- Focus visible but at 1.2:1 against the background.
- Error messages that are present but appear only in colour, or only after
  focus has moved on, or are never announced.
- A dialog that axe scans happily because it was closed when axe ran. Open
  every overlay and run the checks again in that state.
- A custom control with the right role and none of the keyboard behaviour.
- Content that only appears on hover.
- Text in images, SVG or canvas.
- Anything behind sign-in or past step 1 of a flow.
- The siblings of something a rule flagged. Rules have thresholds: on
  obvious's docs, axe flagged the widest of 3 sideways-scrolling code boxes
  and passed the other 2, which had the same problem. When a rule fires,
  check every element like it.

## Severity

Rate each confirmed finding by what it does to a person trying to finish a
task, then adjust for how many people meet it. These follow the shape of
Deque's impact levels, with the deciding question made explicit.

| Severity | The deciding question | Examples |
|---|---|---|
| Blocker | Does it stop someone finishing a core task with no workaround? | Sign-in button not reachable by keyboard; dialog that traps focus with no way out; form that can't be submitted without dragging; paste blocked on the one-time code; the main action has no name for a screen reader. |
| Serious | Does it stop them on a secondary task, or make a core task very hard, with only a costly workaround? | Body text at 3.2:1; errors shown in colour only; focus invisible on most controls; content cut off at 320 px; a sheet Tab escapes from; status messages never announced. |
| Moderate | Can they get through, with effort or confusion? | Headings out of order; a skipped landmark; a target at 20 px with crowded neighbours on one secondary screen; a toast that disappears but whose message appears elsewhere too. |
| Minor | Is it an annoyance that doesn't change the outcome? | A redundant title attribute; one decorative image announced; a focus ring a bit tight to the edge. |

Adjustments:

- Move it **up** one level if it's on every page (header, navigation, a
  shared component) or on the path to money, data or sign-in.
- Move it **down** one level if it's on a rarely used screen and a clear
  alternative path exists on the same page.
- A Level A failure that blocks a task is never below Serious.
- obvious design system issues that aren't WCAG AA failures (a 32 px
  control on a phone, no reduced-motion handling) are Moderate at most and
  go in their own group.
- Never rate by how hard the fix is. Fix effort goes in the fix line.

## Ordering the report

1. Blockers, most-used task first.
2. Serious, then Moderate, then Minor, the same way.
3. Design system issues.
4. Worth doing (best practice that WCAG doesn't require).
5. What wasn't tested.
