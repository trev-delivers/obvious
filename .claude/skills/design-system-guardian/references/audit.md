# Reading the audit, and writing exceptions

## Contents

- Commands
- What each line of the output means
- What it counts as a bypass
- What it doesn't see
- `.ds-audit.json`: format and how it's matched
- What makes an exception good enough
- Budgets
- Measuring adoption across apps
- Worked examples from real apps

## Commands

All from anywhere, with paths. Every one here was run against obvious and
against apps that use it.

```sh
node <obvious>/scripts/audit-ds.mjs <app>            # summary, 3 examples per category
node <obvious>/scripts/audit-ds.mjs <app> --detail   # every finding with file:line
node <obvious>/scripts/audit-ds.mjs <app> --max 11   # exit 1 if the total is over 11
node <obvious>/scripts/audit-ds.mjs <app> --json     # the same numbers as JSON
node <obvious>/scripts/audit-ds.mjs <app-a> <app-b>  # several, with a roll-up line
```

In obvious itself, `npm run check` runs the audit with `--max 113` (the
current budget, set in `package.json`). `npm run audit` is the bare audit.

Run it with obvious's copy. An app keeps its own `scripts/audit-ds.mjs`,
and that copy isn't kept in step automatically, so it can be missing
categories added since. `ds-context.mjs` says when the two differ.

## What each line of the output means

```
app                 files  tokens  components  bypass  theme
eye-for-type        10     44      0/12        11      specimen
```

- **files**: source files read (`.css .scss .ts .tsx .js .jsx .mjs .html`).
- **tokens**: distinct `--ds-*` names the app mentions anywhere, ignored
  files included. Adoption, so exceptions never lower it.
- **components**: `t-*` families used, out of how many obvious ships
  (read from the built CSS, so a new component counts automatically).
- **bypass**: the number that matters. Values and patterns that went around
  the system, after exceptions.
- **theme**: themes imported via `ds/css/themes/<name>.css` or
  `obvious/css/themes/<name>.css`.

Below the table, per app: the `ds/.version` stamp or npm pin, the
`.ds-audit.json` note, components used, registry items installed and how
many `ob-*` classes are used, any `.ds-audit.json` problems, one line per
category with a count, and one `excused ...` line per exception with how
many findings it covered.

A line starting `.ds-audit.json:` is a config problem. The two common ones:
`has no note, so it doesn't count` and `names no paths, so it doesn't
count`. Those exceptions are being ignored; fix them.

## What it counts as a bypass

| Category (key) | Flags |
| --- | --- |
| literal colours (`colour`) | hex, `rgb()`, `rgba()`, `hsl()`, `hsla()`. Also a hex used as a `var()` fallback. |
| literal durations (`duration`) | `s`/`ms` inside `transition` or `animation` (and their `-duration`, `-delay`) |
| literal easing curves (`easing`) | `cubic-bezier()` and `linear()` |
| literal font stacks (`font`) | `font-family` with no `var()` in it |
| literal radii (`radius`) | px in `border-radius` or `borderRadius`, a bare number in JS, `rounded-[..px]`. Not `0`, `%`, or a `var(--ds-radius-md, 8px)` fallback. |
| px font sizes (`font-size`) | px in `font-size`, `fontSize`, the `font` shorthand, `text-[..px]`. Not `calc(n * 1px)`. |
| monospace (`mono`) | `monospace`, `font-mono`, `--ds-font-mono`, `var(--mono)`, named mono faces |
| eyebrows (`eyebrow`) | `uppercase` and non-zero `letter-spacing` in one rule, or `uppercase` with `tracking-*` |
| gradient text (`gradient-text`) | `background-clip: text`, `bg-clip-text` |
| fonts loaded outside the theme (`font-loading`) | Google Fonts, `@font-face`, `next/font`, `@fontsource` loading a face the theme doesn't name |

The key in brackets is what goes under `exceptions` in `.ds-audit.json`.

It skips `node_modules`, `ds`, `dist`, `build`, `out`, `.next`, `scripts`,
`.claude`, `.agents`, `fixtures`, `__fixtures__` and `*.min.*` files.
Registry files in `components/obvious/` are obvious's, so they never count
against the app.

## What it doesn't see

Checked on a scratch file: none of these is flagged.

- Spacing literals: `padding: 13px`, `gap: 10px`, `margin: 0 18px`.
- Line height and weight: `line-height: 1.45`, `font-weight: 650`.
- Font sizes in `rem` or `em`: `font-size: 0.8rem`.
- Shadow offsets and blur (`0 3px 11px`). Only a colour inside the shadow is flagged.
- Layout, hierarchy, the furniture list, and whether it looks right.

So a falling number is good news but doesn't prove the page is on-system. Step 4 in SKILL.md covers the
rest. `ds-nearest.mjs` accepts a line height or weight with `--as leading`
or `--as weight` to find the matching token.

## `.ds-audit.json`: format and how it's matched

At the app's root:

```json
{
  "ignore": ["tools/"],
  "note": "Why every path in ignore is excused.",
  "exceptions": {
    "gradient-text": {
      "ignore": ["src/hero.css"],
      "note": "Why this one category is allowed in these files."
    }
  }
}
```

- `ignore` excuses every category in those paths. It's for code that isn't
  the app's UI: a preview harness, a pasted third-party snippet, a server
  that draws an SVG and can't read CSS.
- `exceptions.<key>` excuses one category in its paths. It only counts with
  a non-empty `note` and at least one path.
- Paths are matched as substrings of the file's path from the app root. So
  `"ignore": ["src"]` excuses everything under `src/` and also
  `resources/`. Write the narrowest path that works,
  usually the file rather than its folder.
- Exceptions only hide findings. Tokens used in an excused file still count
  toward adoption.

Prefer, in order: fix it; a category exception on one file; an `ignore` on
one file; an `ignore` on a folder.

## What makes an exception good enough

The note is read by someone deciding whether the exception can go. It must
let them decide without reopening the code. A good one says:

1. **What** the value is and where (`#E8E9E5` in `index.html`'s
   `theme-color`).
2. **Why no token works**, with the measurement: the nearest token, the gap,
   and what would change if it were swapped. `ds-nearest.mjs` gives you the
   numbers.
3. **Whose call it was**, if it was a choice rather than a constraint.

Real notes from apps that use obvious, and why they pass:

- "`#E8E9E5` is `--ds-color-bg` copied by hand because a meta tag can't read a
  custom property." Names the token it mirrors and the constraint.
- "`--color-ink-faint` is pinned to `#6b5a3c` instead of
  `--ds-color-text-muted`, which lands at about 4.1:1 on this paper." A
  measured contrast reason. This is the model.
- "The duration tokens stop at 900ms, and the loops are uneven so they don't
  line up." Says why the scale can't hold it.

Not good enough: "design choice", "legacy", "needed for layout", or a note
that covers a whole folder without saying what's in it.

When an exception's file no longer has the finding, the `excused` line says
0. Remove the exception.

## Budgets

The budget is the `--max` number in the app's checks: in `package.json`
scripts (`ds:audit`, `ds:audit:ci`) or a shell script such as
`scripts/check.sh`. CI fails above it.

- It only goes down. When your work lowers the total, set `--max` to the
  new total in the same change.
- If obvious's copy of the audit finds more than the app's copy (new
  categories), don't raise anything. Report both numbers; updating the app's
  copy and its budget is a separate, visible change.

## Measuring adoption across apps

The README's "Is it actually being used?" table is this command:

```sh
node <obvious>/scripts/audit-ds.mjs <app-a> <app-b> <app-c> --json
```

Each result has `tokens`, `components`, `catalogue`, `registry`,
`registryCatalogue`, `obClasses`, `themes`, `bypass` (per category, with
file and line) and `excused`. Use it for trends over time, two readings at
least, and read the counts together: tokens used and components used say how
much of the system an app takes; bypass says how much went around it. A high
token count with a high bypass usually means the theme is loaded but new
screens were written by hand. Don't present any one count as a score.

## Worked examples from real apps

**An app passing its own budget of 0 while obvious's audit finds 52.** Its
copy of `audit-ds.mjs` predates the radius and px font size categories.
Report: "Its own check says 0; obvious's current audit finds 19 literal
radii and 33 px font sizes in `src/styles/app.css`." Then, if asked to fix,
run `ds-nearest.mjs` over the values. `12.5px` matches `--ds-text-mono`
exactly, but that size belongs to the mono role, which the rules don't
allow. Use the nearest real role (`label` is 14px, `--ds-text-xs` is 13px)
and list the change as a call you made. Radii of `26px` on
a 13px base sit between `--ds-radius-lg` (19.5px) and `--ds-radius-xl`
(32.5px), which is a design call for the owner to make.

**A static site with 11 findings, all excused in the note.** Ten px font
sizes are the specimens being judged and headline sizes with no type role at
that size. The note lists each with the reason. That's a correct use: the
number is small, known and explained.
