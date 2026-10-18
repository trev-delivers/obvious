# Worked set-up: a 4-page A4 community newsletter

A starting point built from the other references, for something like Brookwood News: four A4 pages, a mix of council news, club notices, a diary and a couple of ads, read mostly by older people, printed by a local digital printer. The numbers are worked out, not handed down. Change them if the content or the printer needs it.

## Page

- A4, 210 × 297mm, 794 × 1123 CSS px at 96 per inch. 3mm bleed if anything runs to the edge (216 × 303mm page).
- Margins: 15mm sides (57px), 12.7mm top (48px), 17.7mm bottom (67px, includes the folio). Bottom deeper than top. Everything is comfortably past the 5mm floor; text that sits nearer than 10mm to the trim should be the exception and checked.
- Live area 680 × 1008px, which is 63 lines of 16px.
- Grid: 12 columns of 42px with 16px gutters. Spans: 2 = 100px, 3 = 158px, 4 = 216px, 6 = 332px, 12 = 680px.
- Baseline: 16px (12pt). Picture fields of 7, 15 or 31 lines with one-line gaps divide the 63 lines into 8, 4 or 2.
- If pages 2 and 3 are printed as a spread on a folded A3 sheet, keep text 5mm clear of the fold: widen the centre gutter rather than the outer margins.

## Type

For older readers, start at the larger set. The numbers in brackets are a tighter general-purpose set.

| Role | Size and leading | Notes |
|---|---|---|
| Body | 11/15pt, about 14.7/20px (10/12pt) | Ragged right, no automatic hyphens for older readers. Indent 1em, no paragraph space. Full clear print is 12pt, which costs about a fifth of the content on 4 pages. |
| Caption, fact block | 9/12pt minimum, 10pt or more for older readers | Sans companion is fine here. |
| Standfirst | 13 to 14pt italic | One or two sentences. |
| Subhead in text | Body size, semibold, a line of space above | |
| Notice headline | 16 to 18pt | |
| Secondary headline | 21 to 24pt | |
| Lead headline | 36 to 44pt, tight leading | Sentence case, balanced. |
| Masthead | 60 to 84pt | Same family as headlines, or the publication's own lettering. |

If you change the body leading, redo the baseline arithmetic: everything else hangs off it.

One serif family with optical sizes for everything (Newsreader, Source Serif 4 or Literata) plus at most one sans for dates, labels and fact blocks. Tabular figures in the diary.

Measure check at 10pt: 6 columns (332px) is about 54 characters, good for body. 4 columns (216px) is about 35: ragged right only, fine for notices and sidebars. 12 columns is about 110: headlines only.

## Flatplan

| Page | What | Character |
|---|---|---|
| 1 | Masthead, lead story with the best photo, editor's note, contents, how to send news and the deadline, sponsor's ad at the foot | Opener: one dominant element |
| 2 | Council and civic news, schools, appeals | Calmer, column-based |
| 3 | The month's feature or package (several events on one day, a big anniversary), with pictures | The busy, picture-led page |
| 4 | Village diary, short club notices, ads, contacts and colophon | Reference page |

Pages 2 and 3 face each other, so balance them as a spread: if 3 is busy, keep 2 quiet.

## Story types and slots

| Type | Parts | Typical length |
|---|---|---|
| Lead | Headline, standfirst, photo, caption, body, optional pull quote | 250 to 400 words |
| News | Headline, body, optional photo, sign-off | 120 to 250 words |
| Notice | Headline, 40 to 80 words, fact block (When, Where, Cost, Contact) | 60 to 120 words |
| Package | One headline and standfirst over 2 to 4 short items with their own subheads and fact blocks | 300 to 500 words in all |
| Diary | Rows of date, title, time, place; grouped "Every week", then by month | 10 to 20 rows |
| Editor's note | Short, signed | 50 to 80 words |
| Ad | Supplied artwork at a fixed size (at least a quarter page on the back) | |

Ask for, or cut to, these lengths. A 4-page issue holds roughly 1,800 to 2,400 words plus the diary, depending on pictures and ads.

## Diary from the website

The diary is the part that should come straight from data. Each event already has a title, date, time, venue and whether it repeats. Sort repeating events into "Every week" (or "Every month"), then list one-off events by date for the issue's month and the first weeks of the next. Several events on one day go under one date. Keep it to one line per event where possible: name in semibold, then time and place.

## Before it goes to the printer

1. `scripts/check-layout.mjs` passes, and you've looked at every screenshot.
2. No photo under 250ppi at its printed size, or the editor knows and has accepted it.
3. Every story fits its slot by editing, not by shrinking type.
4. Facts in house style: day, date, time, place, cost, contact.
5. The printer's three questions answered (`print-production.md`), PDF exported at the right size, `pdffonts` and `pdfimages -list` checked.
