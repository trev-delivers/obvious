# Accessibility text

The words people hear from a screen reader, say to voice control, or read
when an image doesn't load. WCAG 2.2 (a W3C Recommendation since 5 October
2023) is the current standard; WCAG 3 is a draft [WCAG-new22]. Source tags
in brackets point to `sources.md`.

The build side (which element, which attribute, focus) is in the engineer
skill's `references/standards/accessibility.md`. This file is about what the
words say.

## Contents

- The criteria that are about words
- Alt text
- Accessible names for controls
- Label in name
- Links
- Forms and errors
- Status messages
- Sensory and position words
- Language of the page
- aria-label and translation

## The criteria that are about words

| Criterion | Level | What it asks of the copy |
|---|---|---|
| 1.1.1 Non-text Content | A | Images and icons have a text alternative that does the same job |
| 1.3.3 Sensory Characteristics | A | Instructions don't rely on shape, colour, size, position or sound alone |
| 1.4.1 Use of Color | A | Colour isn't the only way to tell (an error, a required field, a link) |
| 2.4.2 Page Titled | A | Each page has a title that says what it is |
| 2.4.4 Link Purpose (In Context) | A | The link's text, with its sentence, says where it goes |
| 2.4.6 Headings and Labels | AA | Headings and labels describe the topic or purpose |
| 2.5.3 Label in Name | A | The accessible name contains the visible label text |
| 3.1.1 Language of Page / 3.1.2 Language of Parts | A / AA | The page and any passages in another language are marked with their language |
| 3.1.5 Reading Level | AAA | A simpler version when text needs more than lower secondary reading |
| 3.2.4 Consistent Identification | AA | Things that do the same job are named the same way across pages |
| 3.3.1 Error Identification | A | Errors are described to the person in text |
| 3.3.2 Labels or Instructions | A | Fields have labels or instructions |
| 3.3.3 Error Suggestion | AA | If a fix is known, the error says it |
| 4.1.2 Name, Role, Value | A | Controls have a name assistive tech can read |
| 4.1.3 Status Messages | AA | Status updates reach assistive tech without moving focus |

WCAG 2.2 removed 4.1.1 Parsing and added 9 criteria; the new ones are about
focus, dragging, target size, consistent help, redundant entry and
authentication, so they affect copy only at the edges [WCAG-new22].

## Alt text

Work through W3C's decision tree in order [W3C-alt]:

1. Does the image contain text? If the same text is on the page, or the
   text is only decoration, use `alt=""`. If it's an icon doing a job, name
   the job. Otherwise the alt is the text in the image.
2. Is it in a link or button where the action would be unclear without it?
   The alt says where the link goes or what the button does.
3. Does it add meaning here? Write a short description of that meaning.
   For a chart or diagram, put the data or explanation in the page and keep
   the alt brief.
4. Is it decorative, or repeating nearby text? `alt=""`.

Writing it:

- Describe what the image means in this context. The same photo can need
  different alt text on 2 pages.
- Don't start with "Image of" or "Picture of"; screen readers already say
  it's an image.
- No file names, no "logo.png". For a logo that links home, the alt is the
  name of the site.
- Keep it to a sentence or so. Longer explanations go in the page or a
  caption [W3C-alt].
- `alt=""` (empty) is correct for decoration. A missing `alt` is a bug:
  screen readers may read the file name.
- Text in SVG or canvas needs the same treatment: a title or label carrying
  the actual information.

Before: `alt="chart.png"`. After: `alt="Orders rose from 120 in May to 260
in June"`.

## Accessible names for controls

From the WAI-ARIA Authoring Practices [APG-names]:

- Name what it does: "Close", not "X"; "Search", not
  "Magnifying glass".
- Put the distinguishing word first, usually the verb: "Edit Sam's
  details", "Delete photo 3 of 8". In a list of 20 "Delete" buttons, each
  needs to say what it deletes.
- 1 to 3 words where possible.
- Don't include the role. "Close button" is heard as "Close button,
  button".
- Start with a capital, no full stop at the end.
- Prefer visible text as the name. It's easier to maintain, gets
  translated with the rest of the page, and helps everyone. Use
  `aria-labelledby` to point at text that's there, and `aria-label` only
  when there's no visible text.
- `aria-label` on a plain `div` or `span` with no role is not allowed and
  is ignored by many screen readers.

## Label in name

Voice control users say what they see. If a button shows "Send" and its
accessible name is "Submit form", "click Send" does nothing [WCAG-2.5.3].

- The accessible name must contain the visible text, and it's best when it
  starts with it: visible "Search", name "Search recipes".
- Case and punctuation don't matter. Symbols used as icons ("x", ">") aren't
  labels; name the function.

## Links

- The link text plus its sentence must say where it goes [WCAG22]; on
  its own is better, because screen reader users often list links out of
  context [NNg-learnmore].
- See the Links section of `patterns.md`.

## Forms and errors

- Every field has a label in text, connected to the field [WCAG22].
  Placeholders don't count as labels [GDS-textinput] [NNg-placeholders].
- Errors are described in text, not only shown in red or with an icon
  [WCAG22] [WCAG22].
- Errors say how to fix it when that's known [WCAG22].
- GOV.UK prefixes error messages with visually hidden "Error:" so screen
  reader users know what they're hearing; translate that prefix with
  everything else [GDS-error].

## Status messages

"5 results", "Saved", "3 items in your basket", "Uploading" are status
messages. They need to be announced without moving focus: `role="status"`
for results and confirmations, `role="alert"` for errors and warnings
[WCAG-4.1.3].

- Write them to make sense heard alone, without the screen: "Recipe saved",
  not "Done".
- Announce the result once. A number counting up inside a live region gets
  read out over and over.

## Sensory and position words

- Don't write instructions that need sight, colour or layout: "the button on
  the right", "the green link", "the round icon" [WCAG22]
  [Mailchimp-a11y]. Use the control's name: "Select Save".
- Device verbs: "click" is wrong on a phone and "tap" is wrong with a
  keyboard. "Select" or "choose" works for both, or name the control
  [Apple-writing]. Match the platform when the product only runs on one.

## Language of the page

- Set `lang` on `<html>` (`en-GB`, `en-US`) so screen readers use the right
  pronunciation, and `lang` on any passage in another language
  [WCAG22].

## aria-label and translation

Browser translation doesn't reliably translate `aria-label`. Adrian
Roselli's tests, last updated July 2025, found every major browser missing
some labels, especially ones set by script [Roselli-arialabel]. So:

- Prefer visible text, `aria-labelledby`, or visually hidden text in the
  page over `aria-label` for anything that must be translated.
- Make sure accessible names are in the same translation files as the rest
  of the copy. The string script lists them so you can check.
