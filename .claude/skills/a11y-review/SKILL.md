---
name: a11y-review
description: Reviews a live page, flow or app against WCAG 2.2 AA and reports to a designer, worst first, in plain words, with who is affected and a suggested fix for each finding. Runs a measured pass (axe-core when the app has it, a keyboard walk, target sizes, reflow at 320 px, text spacing, reduced motion, the accessibility tree), then the manual checks no tool can do (focus order and visibility, Focus Not Obscured, dragging, redundant entry, accessible authentication, forms and errors, dialogs and menus against the WAI-ARIA APG, live regions, zoom), checks contrast with obvious's contrast script, and separates real failures from tool false positives before anything is reported. Use when asked for an accessibility review, audit or check, "is this accessible", "WCAG", "a11y", "screen reader", "keyboard only", "contrast", "tap targets", "does this pass AA", or before shipping a new screen, form, dialog or flow.
---

# Accessibility review

You're reviewing a live page or app for a designer who can't read code. The
output is a short report they can act on: what's broken, who it stops, how
bad it is and what to change. Everything in it is something you saw happen
in the browser.

This skill is the full review. The day-to-day rules for building are in the
engineer skill's `references/standards/accessibility.md`; follow those when
fixing, and don't repeat them in the report as findings unless the page
breaks them.

The standard is WCAG 2.2 Level AA (W3C Recommendation, 12 December 2024).
4.1.1 Parsing is obsolete and removed in 2.2, so never report it. WCAG 3 is a
draft; don't review against it.

## What tools can and can't tell you

Automated rules find a real share of problems, but nowhere near all of them.
Deque's own study of its axe audits put it at 57% of issues by count, because
the common problems (contrast, missing names, missing labels) are the ones
rules catch. GOV.UK tested 10 free tools on a page with 143 known barriers:
the best found 41% and all 10 together found 71%. No rule can judge whether
focus order makes sense, whether an error message helps, whether a name
describes the control, or whether a flow can be finished with a keyboard. A
clean axe run only means the rules found nothing. Don't put a percentage in
the report.

## Workflow

Copy this into your notes and tick it off as you go:

```
Review progress:
- [ ] 1. Scope: pages, states and the tasks that matter
- [ ] 2. Find the theme and the tools
- [ ] 3. Measured pass (scripts/a11y-pass.mjs) per page
- [ ] 4. Manual checks (references/manual-checks.md)
- [ ] 5. Patterns: dialogs, menus, tabs, toasts (references/patterns.md)
- [ ] 6. Contrast with real values
- [ ] 7. Verify every finding (references/triage.md)
- [ ] 8. Rate severity, write the report (references/writing-it-up.md)
```

### 1. Scope

Agree what's being reviewed before testing. Follow the WCAG-EM idea of a
structured sample: the screens most people use, every distinct kind of
screen, and every step of the tasks that matter (sign in, the main form,
checkout, settings). A task is reviewed end to end or not at all, because a
flow that fails on step 4 fails. Include the states: empty, loading, error,
success, signed out, a dialog open, dark mode if the app has it.

Ask for a test account if the task is behind sign-in. Never use real
credentials you find in the repo, and never submit real orders, payments or
messages to finish a flow; stop at the last safe step and say so.

### 2. Find the theme and the tools

For an app that uses obvious:

- **Theme:** `grep -rhoE "(ds|obvious)/css/themes/[a-z]+\.css" --include=*.css --include=*.html --include=*.tsx --include=*.ts --include=*.jsx --include=*.js . --exclude-dir=node_modules`
  or look for `data-ds-theme` on `<html>`. The synced copy lives in `ds/`
  (`ds/css/themes/<name>.css`, `ds/js/tokens.json`); npm apps import
  `obvious/css/themes/<name>.css`.
- **Known contrast failures:** the rows for that theme in obvious's
  `docs/contrast.md`. Read them first so you recognise them on the page.
- **Does the app import `base.css`?** It gives the shared focus ring
  (`--ds-focus-width` 2px, `--ds-focus-offset` 3px, in `--ds-color-accent`)
  and the global reduced-motion rule. Without it, both are the app's job.
- **axe-core:** `ls node_modules/axe-core/axe.min.js`. It's often there only
  because eslint-plugin-jsx-a11y pulled it in, which is fine: the pass
  borrows it. If it isn't there, don't install it; the pass skips it and you
  do those checks by hand (step 4 covers them).
- **Playwright:** `ls node_modules/playwright node_modules/@playwright/test`.
  Use the preinstalled Chromium at `/opt/pw-browsers/chromium`. Never run
  `playwright install`.

Build and start the app the way its CLAUDE.md says, on a port nothing else is
using. Review the production build where you can; dev servers add overlays
and warnings that aren't in the real thing.

### 3. Measured pass

```bash
node <this skill's folder>/scripts/a11y-pass.mjs http://localhost:PORT/page --from <app dir> --out <scratch>/a11y/<page> [--dark] [--storage <state.json>]
```

`--from` is the folder whose `node_modules` has Playwright (usually the app).
It installs nothing. Per width (390 and 1280 by default) it runs axe with the
WCAG 2.0, 2.1 and 2.2 A and AA tags (`wcag22aa` is passed on purpose because
axe leaves `target-size` off by default), walks the page with Tab, measures
targets and saves the accessibility tree as YAML. Once per page it checks
320 px reflow, 640 px (200% zoom), the 1.4.12 text spacing values and
reduced motion. It writes `report.json`, `aria-*.yml` and screenshots.
For pages behind sign-in, sign in with a test account in a probe script,
save `context.storageState({ path })` and pass it with `--storage`.

Read the screenshots and the YAML yourself. Every line the script prints is
a lead you confirm before it becomes a finding. For states the script can't
reach (an open dialog, a form with errors), drive the page there with a short
Playwright script and run the same checks; `references/manual-checks.md` has
the snippets.

### 4. Manual checks

Work through `references/manual-checks.md` for each page in scope. It covers,
in this order: keyboard only, focus order and visibility, 2.4.11 Focus Not
Obscured, 2.5.8 Target Size against obvious's `--ds-control-tap-min` (44px),
2.5.7 Dragging Movements, 3.3.7 Redundant Entry, 3.3.8 Accessible
Authentication, reflow at 320 CSS px, text spacing, zoom to 200% and 400%,
reduced motion and things that move, the accessibility tree, forms, errors
and status messages, timing.

### 5. Patterns

Any dialog, sheet, menu, disclosure, tabs, combobox, tooltip or toast gets
checked against its WAI-ARIA APG pattern: `references/patterns.md` has the
keys, focus rules and roles for each, plus what to check in obvious's own
registry pieces (`Sheet`, `PlusMenu`, `Toasts`) and the `t-tt` tooltip.

### 6. Contrast

- Theme tokens: in an obvious checkout, `node scripts/contrast.mjs` measures
  every theme pair and rewrites `docs/contrast.md`. Don't run `--record`;
  that rewrites the exceptions file, which is the design system owner's call.
- Any pair on the page (a custom colour, text on an image, a state colour):
  ```bash
  node -e "import('/path/to/obvious/scripts/contrast.mjs').then(({ratio,parse,over})=>{const fg=parse('#8c8071'),bg=parse('#faf5ee');const r=ratio(fg.a<1?over(fg,bg):fg,bg);console.log(r.toFixed(3), r>=4.5?'passes 4.5':'fails 4.5', r>=3?'passes 3':'fails 3')})"
  ```
  Take the colours from computed styles, because a screenshot's pixels are
  blended. Never round up: 4.499 fails 4.5.
- Thresholds: 4.5:1 for text, 3:1 for text at 24px or more, or bold at about
  18.5px or more (1.4.3); 3:1 for focus rings, control edges and icons that
  carry meaning (1.4.11). The focus ring is the theme's accent, so a theme
  whose `accent on bg` row fails in `docs/contrast.md` fails 1.4.11 for every
  focus ring that sits on the page background.
- Don't change theme colours to make a pair pass. Report it; the suggested
  colour in `docs/contrast.md` goes in the fix.

### 7. Verify

Before anything goes in the report, confirm it by hand in the browser, and
drop or downgrade what doesn't hold up. `references/triage.md` lists the
common tool false positives (and the false negatives) and how to tell.

### 8. Report

Rate each finding with the severity rules in `references/triage.md`, then
write it up with `references/writing-it-up.md`. Worst first. Plain words, no code,
no rule IDs in the headline. Each finding says what happens, who it stops,
where, the WCAG criterion (number and name, once, at the end), the severity
and a suggested fix in design terms.

Say what you couldn't test. You can read the accessibility tree; you can't
hear a screen reader here. Say "checked what a screen reader would be given;
not tested with VoiceOver or NVDA" and add the short VoiceOver steps from
`references/writing-it-up.md` for the designer to try on their phone.

## Rules

- Never claim a check passed that you didn't run. If a page needed sign-in
  you didn't have, or a tool wasn't available, say so in the report.
- Never weaken a check, disable an axe rule or add an exclusion to make a
  page come out clean.
- Review and report. Fix only if asked, and then follow the engineer skill,
  with a test that fails without the fix.
- Best practice that isn't a WCAG failure (for example Escape closing a
  disclosure, or a landmark around every region) goes in a separate short
  "worth doing" list, kept apart from the failures.
- Words in the report follow `write-like-trev`.

## Files

- `scripts/a11y-pass.mjs`: the measured pass. Run it; you don't need to read it.
- `references/manual-checks.md`: step by step, per criterion, with Playwright snippets.
- `references/patterns.md`: APG patterns and obvious's registry pieces.
- `references/triage.md`: severity rules, false positives, false negatives.
- `references/writing-it-up.md`: the report template and a worked example.
- `references/sources.md`: where every rule and number here comes from.
