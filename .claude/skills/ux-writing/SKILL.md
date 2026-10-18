---
name: ux-writing
description: Writes and reviews interface copy the way a senior content designer would. Covers buttons, links, labels, hints, placeholders, error messages, empty states, confirmations and destructive actions, success messages and toasts, onboarding, notifications, permission requests, settings and toggles, loading text, and accessibility text (alt text, accessible names, aria-labels, link text, status messages). Applies plain-language and readability research, inclusive language, writing for translation and string expansion, and a term list for consistency. Includes a script that lists every user-facing string in a folder of HTML, JSX, TSX or JS so a whole app can be reviewed. Defers to the product's own voice guide. Use when writing or changing any words in a UI, when asked for "UX copy", "microcopy", "UX writing", "content design", "button label", "error message", "empty state", "alt text", "aria-label", "make this clearer", "tidy the copy", a copy review, a content audit or a terminology check.
---

# UX writing

Interface copy is part of the design. It's judged by whether the person can
do the thing, first time, without having to think about the words. This skill
has no voice of its own: it gives structure, evidence and checks, and the
product's voice guide decides how it sounds.

## 1. Find the voice before writing anything

Look, in this order, and use the first that exists:

1. The product's own voice or content guide: `CONTENT.md`, `VOICE.md`,
   `docs/content*`, a style guide linked from the README, or a writing
   section in `CLAUDE.md` or `AGENTS.md`.
2. A writing skill in the repo's `.claude/skills/`. In apps that use the
   obvious design system this is `write-like-trev` (synced by
   `scripts/sync-skills.mjs`). It wins on voice, banned words and tone.
   This skill adds the structure and checks it doesn't cover.
3. The words already on screen. Match their person ("you", "we"), their
   capitalisation, and their terms.
4. None of the above: use the defaults below and say in your report that
   you chose them.

Where this skill and the voice guide disagree, the voice guide wins, unless
following it would break an accessibility requirement (see
`references/accessibility-text.md`). Say so if that happens.

If asked to write a voice guide, base it on a voice chart: for each product
principle, the concepts to keep coming back to, the vocabulary to use and
avoid, how many words (verbosity), grammar, and punctuation and
capitalisation (Torrey Podmajersky, Strategic Writing for UX). Voice stays
the same everywhere; tone shifts with the person's situation (Mailchimp's
content style guide).

Defaults when there's no guide: sentence case, "you" for the reader, active
voice, contractions are fine, UK or US spelling to match the codebase,
numerals for numbers, no exclamation marks, no humour in errors or anything
about money, health, safety or loss.

## 2. Writing a string

Work through these for every string. Most fail on step 1 or 2.

1. **Know the moment.** What is the person trying to do, what just happened,
   how are they likely to feel (rushed, worried, pleased)? Tone follows the
   moment; the voice stays the same.
2. **Pick the pattern.** Button, link, label, hint, error, empty state,
   confirmation, toast, notification, permission, setting, alt text,
   accessible name. Each has a shape in `references/patterns.md`. Load it
   when writing more than a couple of strings.
3. **Front-load.** The words that let someone decide go first. People scan
   the first 2 or so words of a line before choosing to read on.
4. **Use the term list.** One word per thing, the same word everywhere,
   matching what's in the code's UI already. Build one if there isn't one
   (`references/term-list.md`).
5. **Write it plain.** Everyday words, short sentences, one idea per
   sentence, active voice, the reader as "you". See
   `references/readability.md` for the evidence and limits.
6. **Check it works without sight, colour or English.** It doesn't point at
   a place or colour on screen, it makes sense read alone by a screen
   reader, and it survives translation (no sentences glued together from
   pieces). See `references/accessibility-text.md` and
   `references/localisation.md`.
7. **Cut.** Remove anything the person doesn't need to act. Don't explain
   the interface the screen already shows.

### Quick shapes

| Pattern | Shape | Example |
|---|---|---|
| Button | Verb + object, says what happens | "Save note", "Delete list" |
| Link | Says where it goes; makes sense alone | "Read the setup guide" |
| Label | Short noun, always visible, no colon | "Email address" |
| Hint | 1 short line under the label, before the field | "We'll only use it to send your receipt" |
| Placeholder | An example at most; never the only label | "name@example.com" |
| Field error | What's wrong and how to fix it, in the field's words | "Enter a date in the past" |
| System error | What happened, what it means, what to do | "Your note wasn't saved. Check your connection and try again." |
| Empty state | Why it's empty + the action that fills it | "No saved recipes yet" + "Find a recipe" |
| Destructive confirm | Name the thing and the consequence; button repeats the verb | "Delete 'Weekend bakes'?" / "Delete list", "Cancel" |
| Success toast | Past tense, names the thing | "Recipe saved" |
| Toggle | Describes the on state | "Show prices" |
| Permission ask | Why, in one sentence, at the moment it's needed | "Use your location to show nearby shops." |
| Alt text | The meaning of the image here, or empty if decorative | "Sales doubled between May and June" |
| Icon button name | The action, verb first, no role word | "Close", "Edit Sam's details" |

## 3. Reviewing copy

When asked to review, audit or tidy the words in an app or a change, follow
`references/review.md`. In short:

1. Find every string. Run the script from the app's root, or point it at the
   folders that hold UI:

   ```sh
   node <this-skill>/scripts/strings.mjs src app components --flags --terms
   ```

   In obvious it lives at `.claude/skills/ux-writing/scripts/strings.mjs`.
   It prints each string with its file, line and kind (button, link, label,
   alt, aria-label, placeholder, toast, error and so on). `--flags` adds a
   "look at" note where a string matches a known problem; a note is a
   prompt to read it, never a verdict. `--terms` lists competing words
   (sign in and log in, delete and remove). `--all` adds every other
   literal that reads like prose, for hand-written pages where copy is
   passed to helper functions. `--json` for anything that needs to read
   the result.
2. Fill the gaps the script can't see: copy in JSON, Markdown, a CMS or
   translation files, strings built at run time, server error messages that
   reach the screen, emails, and the page `<title>`. Search for them.
3. Read the strings by screen and by pattern, against
   `references/patterns.md`, the term list and the voice guide.
4. Open the app and see the words in place (Playwright with the
   preinstalled Chromium, `executablePath: '/opt/pw-browsers/chromium'`,
   never `playwright install`), at 390 and 1280 wide, including empty,
   error and loading states. Copy that reads fine in a list can be wrong
   on screen: truncated, next to a contradicting heading, or repeating the
   title.
5. Report worst first, in plain words a designer can act on. Use the
   template in `references/review.md`. No code in the report unless asked.

Never say a string was checked in place unless you opened the screen that
shows it. If you couldn't reach a state (an error that needs a server
failure), say so.

## 4. What goes wrong most

Fix these on sight; they're the most common faults in real apps.

- Generic buttons ("OK", "Submit", "Yes") where a verb says what happens.
- Placeholders standing in for labels, so the label vanishes on typing.
- Errors that say "Invalid" or "Something went wrong" and stop.
- Errors that only show in colour, or only in a toast that disappears.
- Link text like "Click here" or "Learn more" that means nothing alone.
- Icon buttons with no accessible name, or a name that doesn't match the
  visible text (speech users say what they see).
- The same thing called 2 names ("sign in" on one screen, "log in" on the
  next), or 1 name used for 2 things.
- Sentences glued from pieces (`"You have " + n + " items"`), which can't
  be translated and break plurals.
- Confirmation dialogs for routine actions, and none for the one that
  destroys work.
- Copy that narrates the interface, or points at it ("the button on the
  right", "the green link").

## 5. In an app that uses obvious

- Voice comes from `write-like-trev`, which is stricter than these defaults
  (its banned words, no em dashes, numerals, UK spelling).
- obvious's design rules are partly copy rules: labels are sentence case
  with no capitals and letter-spacing, no eyebrows above headings, no
  arrows tacked onto links, no middle-dot strings of metadata. They're in
  obvious's `CLAUDE.md` under "Design rules for every app that uses this".
- The app's copy of obvious is in `ds/` or `node_modules/obvious`. Copy
  lives in the app, not there.
- Field errors go in the `t-input` component's `.t-error-msg`, under the
  field, and stay until fixed.
- The `toasts` registry component removes an ok toast after 2.8 s and an
  error toast after 6 s. Use toasts for confirmations people don't have to
  act on. An error the person must fix belongs next to the thing that
  failed. The engineer skill's `design.md` says the same.
- `Toggle`, `Tabs`, `Check` and `SearchField` in the `motion` registry
  item take a `label` prop that becomes the accessible name. Write it as
  you would a visible label.

## Related skills

- `write-like-trev`: voice, in Trev's apps. Always load it there.
- The engineer skill's `references/standards/accessibility.md`: the build
  rules for labels, names and live regions. This skill covers the words.
- `a11y-review`: a full WCAG 2.2 audit of a live page. This skill feeds it
  the wording findings.
- `design-critique`: a whole-screen crit, where copy is one lens of many.

## References

- `references/patterns.md`: every pattern, with rules, templates and before
  and after.
- `references/readability.md`: plain language, reading age, scanning,
  sentence length, and what readability scores can't tell you.
- `references/accessibility-text.md`: alt text, accessible names, link
  purpose, errors, status messages, and the WCAG 2.2 criteria behind them.
- `references/inclusive-language.md`: people, disability, gender, idioms.
- `references/localisation.md`: expansion, concatenation, plurals,
  placeholders, dates and numbers, notes for translators.
- `references/term-list.md`: how to build and keep a term list, with a
  starter.
- `references/review.md`: the full review procedure and report template.
- `references/sources.md`: where each rule comes from.
