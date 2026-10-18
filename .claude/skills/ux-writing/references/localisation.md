# Writing for translation and other locales

Even an English-only product is read by people whose first language isn't
English, and by browser translation. Writing for translation makes the
English clearer too [MS-global]. Source tags in brackets point to
`sources.md`.

## Contents

- Write translatable English
- Leave room: string expansion
- Never build sentences from pieces
- Plurals
- Placeholders
- Dates, times, numbers and money
- Notes for translators
- Checking a codebase

## Write translatable English

From Microsoft's global writing tips [MS-global]:

- Short, simple sentences in subject, verb, object order.
- Keep "that" and "who" and articles ("the"); they show the structure of the
  sentence to translators and to machine translation.
- In short labels, include a verb when it helps: "Access is denied" reads
  better in translation than "Access denied".
- No idioms, colloquial phrases, culture-specific references or sentence
  fragments where a full sentence works.
- No stacks of modifiers ("extremely well thought-out project migration
  plan").
- One word for one concept, used every time (see `term-list.md`).
- Be careful with words ending -ing and -ed that could be a verb, an
  adjective or a noun.
- Only common abbreviations, and none used just to make text fit; another
  language may not abbreviate the same way [W3C-textsize].

## Leave room: string expansion

Translations from English are usually longer, and short strings grow the
most. IBM's guidance, as quoted by the W3C [W3C-textsize]:

| English length | Typical expansion |
|---|---|
| Up to 10 characters | 200 to 300% |
| 11 to 20 | 180 to 200% |
| 21 to 30 | 160 to 180% |
| 31 to 50 | 140 to 160% |
| 51 to 70 | 151 to 170% (as printed; the W3C notes this row may be a typo) |
| Over 70 | 130% |

IBM's own platform guidance is gentler for long messages: allow 20 to 30%
more space, and up to 100% in some cases [IBM-messages]. The short-string
figure is the one that bites: a 4-letter button can double or triple.

What to do:

- Let buttons, tabs and labels grow and wrap. No fixed widths on text. In
  obvious, control heights (`--ds-control-height-*`) are minimums for touch
  and should be paired with padding that lets text grow, and body copy
  should sit within `--ds-measure` (68ch) so lines reflow.
- Scripts like Thai, Arabic, Devanagari, Chinese, Japanese and Korean can
  need more height and line spacing; CJK characters are wider
  [W3C-textsize].
- No text in images. If you must, keep the source file editable.
- Test with a long string: double the English, or use a pseudo-locale that
  pads and accents every string, at 390 wide.
- Database and API fields that hold copy need room for the longest
  translation [W3C-textsize].

## Never build sentences from pieces

Word order changes between languages, so a sentence glued together in code
can't be translated correctly [Mozilla-l10n].

- Bad: `"You have " + n + " new messages"`, or `t("you_have") + n +
  t("messages")`.
- Good: one string with a named placeholder: `"You have {count} new
  messages"`, with the plural handled (below).
- Don't split one sentence across several keys, and don't build a sentence
  around a link from 3 strings. Put the link inside one string as markup or
  a placeholder [Mozilla-l10n].
- Don't reuse one string in 2 places because the English happens to match.
  "Bookmark" as a button (verb) and as a heading (noun) can be different
  words in other languages [Mozilla-l10n].
- Don't hard-code separators, spaces or commas between pieces of text
  [Mozilla-l10n].

The string script flags literals joined with `+` ("joined with +").

## Plurals

- English has 2 plural forms (one, other). Others have up to 6: Arabic has
  zero, one, two, few, many and other; Polish and Russian have 4; Japanese
  has 1 [CLDR-plurals].
- So `n === 1 ? "item" : "items"` only works for English. Use the i18n
  library's plural support, or `Intl.PluralRules` in plain JS
  [MDN-pluralrules].
- If plurals can't be handled, rephrase to avoid them: "Files copied: 3"
  rather than "3 files were copied" [Mozilla-l10n].

## Placeholders

- Use named placeholders like `{name}` and `{count}`, so translators can
  reorder them; several `%s` look like a fixed order [Mozilla-l10n].
- Tell translators what each placeholder holds (see Notes for translators).
- A placeholder for a noun can break grammar in languages with gender or
  case. Where possible, write the full phrase per case [Mozilla-l10n].

## Dates, times, numbers and money

- Format with `Intl.DateTimeFormat`, `Intl.NumberFormat`,
  `Intl.RelativeTimeFormat` and `Intl.ListFormat` (or the i18n library's
  equivalents), never by hand [MDN-intl] [Mozilla-l10n].
- A server and a phone can format the same date differently, so in a
  server-rendered app format dates in one place with a fixed locale and
  time zone, or on the client only. If the app has a date helper, use it.
- Write unambiguous dates in copy: "3 March 2026", not "03/03/26".
- Say the currency when it isn't obvious from context.

## Notes for translators

Translators often see one string at a time with no screen [Mozilla-l10n].
Give each non-obvious string a comment in the format the i18n tool reads:

- What it is and where it appears ("Button on the checkout page").
- What each placeholder holds at run time ("{name} is a person's first
  name").
- Any length limit, and whether it's a verb or a noun.

## Checking a codebase

1. Run `scripts/strings.mjs <src> --flags` and look for "joined with +".
2. Search for hard-coded plurals: `=== 1 ?`, `> 1 ?`, `s"` after a count.
3. Search for `toLocaleDateString`, `toLocaleString` and hand-built date
   strings; check they go through one helper.
4. Check `aria-label` and `title` values are in the translation files too
   (`accessibility-text.md`, aria-label and translation).
5. Open the busiest screens at 390 wide with every string doubled, if the
   app makes that possible, and look for clipping and overflow.
