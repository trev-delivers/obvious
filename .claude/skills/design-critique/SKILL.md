---
name: design-critique
description: Runs a structured design critique of screenshots, a URL or a running app the way a senior product designer runs a crit. Establishes the goal, user and task first, captures its own screenshots with Playwright at 390 and 1280 wide in light and dark, then reviews against the goal across hierarchy, layout and spacing, type, colour and contrast, consistency with obvious and platform conventions, every state, flows, IA and labels, feedback, motion, content and responsive behaviour. Returns findings ranked by impact on the task, what's working, and taste notes kept apart. Use when asked to critique, review, give feedback on, "crit", sense-check or "tell me what's wrong with" a design, screen, page, flow, prototype or app, or "does this work", "what would a designer say", "is this any good".
---

# Design critique

A critique asks 1 question: does this design do what it's for, for the
person it's for? It isn't a usability test, a code review or a list of
preferences. Everything below serves that question.

Copy this checklist into your working notes and tick it off:

```
Critique progress:
- [ ] 1. Goal, user and task written down (asked or assumed, and said so)
- [ ] 2. Screenshots captured and looked at, every view
- [ ] 3. System context found (theme, ds/, audit, known exceptions)
- [ ] 4. First pass: do the task as the user, judge nothing
- [ ] 5. Second pass: every lens in references/lenses.md
- [ ] 6. States and flows exercised in the browser
- [ ] 7. Each finding verified on a screenshot, then ranked
- [ ] 8. Report written in plain words, worst first
```

## 1. Goal, user and task

Before looking for problems, write 3 lines:

- **Goal:** what this screen or flow is meant to achieve.
- **User:** who uses it, where, on what device, how often.
- **Task:** the 1 or 2 things they came to do, in their words.

Get them from the person if they've said, then the repo's README, CLAUDE.md
or handoff docs. If you still don't know, infer them from the product and
put them at the top of the report as **assumptions** so they can be
corrected. Ask instead of assuming only when the answer would change the
ranking (a dashboard for daily use and one for a monthly review get very
different crits).

If they've said what they want feedback on ("just the empty state", "is the
nav clear"), scope to that and say what you left out.

## 2. Capture and look

Never critique from code alone. Run the capture script from the app's own
folder (so it finds that app's Playwright, or the global one). It installs
nothing and uses the preinstalled Chromium. The script sits in this skill's
`scripts/` folder; in an app without its own copy of the skill, use
obvious's (`<obvious checkout>/.claude/skills/design-critique/scripts/`):

```sh
node <skill folder>/scripts/capture.mjs <url> \
  --paths /,/settings,/item/1 --out <scratchpad>/crit
```

Defaults are 390 and 1280 wide, light and dark. Add `--early` to catch
loading states and flashes, `--reduced-motion` to compare, and
`--steps steps.json` to click through a flow and shoot each step (format in
the script header and `references/states.md`).

It needs a running app. If there's no URL:

- A static site: serve its built folder on port 4353
  (`npx serve -l 4353 <dir>` or the repo's own serve script with `PORT=4353`).
- An app with a dev or preview server: start it on 4353 and stop it when
  you're done. Read the repo's CLAUDE.md first: some apps have a fake
  backend for tests, and a crit must never point at live data.
- Screenshots only: critique what's there and list what you couldn't see
  (states, motion, other widths) under "Not reviewed".

Then **open every PNG with the Read tool and look at it**. The script's
printed facts (console errors, sideways scroll, small targets, type sizes,
faces, approximate low contrast) are leads to follow up. A finding exists
only once you've seen it in a screenshot or reproduced it.

Know the artefacts: fixed and sticky elements can look cut off or repeated
in the `full-N` slices, so check the `fold` shot before calling it a bug.
The contrast count skips text over images and gradients; judge those by eye.

## 3. System context

If the app uses obvious, find out which theme and what's allowed:

1. Theme: look for `ds/css/themes/<name>.css` or
   `obvious/css/themes/<name>.css` imports
   (`grep -rn "css/themes/" --include=*.css --include=*.ts* --include=*.html .`
   outside `node_modules`). The theme's colours, faces, radius and density
   are in obvious's `src/themes/<name>.json`.
2. `ds/` folder: vendored by `scripts/sync-ds.mjs`; `--check` says if it's
   stale. An npm install shows as `obvious` in `package.json`.
3. Exceptions: the app's `.ds-audit.json` lists deliberate breaks with a
   reason. Don't report those as new problems; mention them only if the
   reason no longer holds.
4. Known contrast failures: obvious's `docs/contrast.md` lists theme pairs
   that fail and are waiting on a decision. Report them as known, once.
5. Optional evidence: from the obvious repo,
   `node scripts/audit-ds.mjs <app path>` counts values that go around the
   system. Use it as evidence; it doesn't replace looking.

The design rules themselves (no monospace, no eyebrows, the theme's 2 faces,
no generated-site furniture) are in obvious's CLAUDE.md. The token scale to
judge spacing and type against is in `references/lenses.md`.

## 4. First pass: be the user

Walk the main task once, start to finish, at 390 wide, without judging.
Note where you hesitated, had to look twice, or weren't sure what would
happen. This is the pass that keeps the crit tied to the task instead of
the pixels.

## 5. Second pass: the lenses

Go through every lens in `references/lenses.md`:

hierarchy and scanning, layout and spacing rhythm, type roles, colour and
contrast, consistency with obvious and the platform, states, flows, IA and
labelling, feedback and affordances, motion, content, responsive.

For each lens the file has what to check, the obvious tokens that apply and
the principle behind it. Skip a lens only if it can't apply (no motion on a
static page) and say so in "Not reviewed".

## 6. States and flows

Most of a product's problems live in the states nobody designed. Exercise
them; `references/states.md` shows how to make each one appear with
Playwright (empty, loading, error, partial, long content, first use,
offline, signed out). If a state can't be produced, list it under "Not
reviewed". Don't describe what it probably looks like.

## 7. Verify and rank

For each candidate finding:

1. Point to the screenshot (file name) or the steps that show it.
2. Decide if it's a **problem** (it gets in the way of the goal, breaks a
   standard the product has adopted, or fails WCAG 2.2 AA) or a **taste
   note** (you'd do it differently, but nothing measurable suffers). If you
   can't name what happens to the person, it's taste.
3. Rate problems by impact on the task, using frequency, how hard it is to
   get past, and whether it keeps happening (Nielsen's severity factors):

| Rank | Meaning | Nielsen |
|---|---|---|
| Blocks | Someone can't finish the task, loses work, or is excluded | 4 |
| Hurts | They finish, but slower, unsure, or after a mistake | 3 |
| Snags | Noticeable friction or inconsistency | 2 |
| Polish | Only a designer would notice | 1 |

Drop anything you rated 0 (not a problem). Merge duplicates: one cause
shown on 5 screens is one finding with 5 places.

## 8. The report

Written for a designer who doesn't read code: plain words, worst first, no
code, no CSS names unless asked. Follow `write-like-trev` for the wording
when it's for Trev. Use this shape (full example in
`references/example-crit.md`):

```
Critique: <what was reviewed>
Assumed goal, user and task: <3 lines, marked as assumed if they are>
Looked at: <pages, widths, schemes, states>

Findings, worst first
1. <Short name> (Blocks | Hurts | Snags | Polish)
   Where: <screen, width, state; screenshot file>
   What happens: <what the person experiences>
   Why it matters: <the principle, named once>
   Try: <one concrete change, in obvious's terms where it applies>

What's working
- <specific things to keep, and why they work>

Taste notes (not problems)
- <preferences, clearly labelled>

Not reviewed
- <states, widths, flows you couldn't see, and why>
```

Rules for findings:

- One finding, one cause. Name the principle once (Fitts's law, proximity,
  visibility of system status); don't lecture on it.
- "Try" is one direction to take, kept short, and uses the system: a token, a
  type role, a registry component (Sheet, Toasts, PlusMenu) before anything
  new.
- Praise is specific and earned. Aim for roughly 2 things working to every
  problem when that's honest; never pad it.
- No invented numbers. "Most users will..." needs research behind it; say
  "people who..." and describe the mechanism instead.
- Never say something passed, loaded or looked right unless you saw it.

## Hand-offs

- Fixing what the crit found is a separate job: `engineer`, with its
  `references/standards/design.md`. Token and audit work goes to
  `design-system-guardian` if it's installed.
- A full accessibility audit goes beyond this skill's contrast, target and
  reflow checks: use `a11y-review`.
- Rewriting the words: `write-like-trev`. Tuning motion:
  `transitions-polish`.

## References

- `references/lenses.md`: what to check under each lens, with obvious's
  tokens and the principle behind each check.
- `references/states.md`: producing every state and flow with Playwright.
- `references/method.md`: critique practice (goal first, critique versus
  reaction and direction, severity, phrasing, taste versus problem).
- `references/example-crit.md`: a worked example of the report.
- `references/sources.md`: where every rule and number comes from.
