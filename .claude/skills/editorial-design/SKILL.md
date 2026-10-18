---
name: editorial-design
description: Lay out printed and on-screen editorial documents to a professional standard in HTML and CSS - newsletters, magazines, reports, books, posters with lots of text. Covers grids, margins, baselines, type sizes and pairing, hierarchy, story packaging, page furniture, pacing across pages, image handling, copy-fitting and print-ready PDF. Use whenever you design or review a page that people will read rather than click through, including the Brookwood News newsletter, and whenever someone asks for a layout to look "editorial", "like a proper magazine" or "less amateur".
---

# Editorial design

This is how to lay out a document so it reads like a good editor and a good typographer made it. It comes from Müller-Brockmann, Bringhurst, Tschichold, Gerstner, Vignelli, Butterick, the Guardian's 2005 redesign, Bloomberg Businessweek, NYT Magazine, twen, Poynter's eye-tracking studies and UK print guidance. The detail and sources are in `references/`. Where something is a rule of thumb with no source behind it, the references say so. Treat those as starting points and check them by eye.

Two things matter more than everything else here. The content has to be ranked before anything is placed, and nothing is done until you've checked it and looked at it.

## How to work

1. **Read all the content first.** Count words per item. Note what has a photo and how big the photo really is in pixels.
2. **Rank it.** One lead per page, two or three secondary pieces, the rest briefs, listings and notices. Mix lengths: a page of all middling pieces is the dullest page there is. Group things that belong together (several events on one day, three pieces about the same place) into one package with one headline.
3. **Plan the pages before drawing them.** A flatplan in a few lines: what goes on each page, which page is busy and which is calm, where the ads go. Think in spreads when pages face each other.
4. **Set up the page.** Format, margins, grid and baseline, from `references/grids-and-proportion.md`. Derive the grid from the body text, not the other way round.
5. **Set up the type.** One text family (ideally with optical sizes), at most one companion, a fixed set of named roles. See `references/text-typography.md`.
6. **Lay out each page** with one dominant element, using the furniture in `references/editorial-practice.md`.
7. **Check it.** Run `scripts/check-layout.mjs` and fix every failure. Then open the screenshots and look at every page.
8. **Fix fit problems in this order:** edit the copy, swap which story goes in which slot, change an image's size or crop, and only then nudge type by tiny amounts. Never fix a page by shrinking text below the minimum, stretching leading or squeezing letters.
9. **For print**, follow `references/print-production.md` and ask the printer the three questions in it before promising a print-ready file.
10. **Report** what you decided on the reader's behalf: cuts to copy, which photos are too low-res, anything you moved.

## The rules that matter most

### Page

- **Every gap is a whole number of lines.** Pick the body leading (say 16px) and make every margin, image height, heading block and gap a multiple of it. That's what keeps neighbouring columns lined up. (Bringhurst 2.2.2; Müller-Brockmann)
- **Margins differ.** Bottom deeper than top. Equal margins all round look undecided. (Müller-Brockmann)
- **Keep text 10mm inside the trim** on print (5mm is the floor). Bleed is 3mm. Nothing important within 5mm of a fold.
- **Gutter about one line of type.** (Vignelli)
- **Choose a grid width that divides several ways**, so the same grid serves 2, 3, 4 and 6 column layouts. (Gerstner) On A4 a 680px live width with 12 columns of 42px and 16px gutters does this.
- **Asymmetric by default** for documents made of many parts: a strong left edge, pictures and text on the grid, white space gathered on purpose rather than left over. Centre only a single formal item (a masthead, an invitation). (Tschichold, *The New Typography*)

### Text

- **Measure: 45 to 75 characters**, 66 ideal for one column; 40 to 50 in multi-column work. Never over 90. (Bringhurst 2.1.2; Butterick)
- **Under about 40 characters, don't justify.** Set ragged right. (Bringhurst) For older readers, set ragged right everywhere and don't hyphenate automatically (RNIB clear print, via Sensory Trust).
- **Body 10 to 12pt in print**, 15 to 25px on screen. For older readers, clear print guidance says 12pt minimum, 14pt ideal. When a fixed page count makes that impossible, 11pt with a large x-height is the floor, captions and fact blocks 10pt or more, and you tell the editor what full clear print would cost in content.
- **Leading 120 to 145%** of the type size. More for longer lines and for older readers (1.35 or more).
- **Indent or space paragraphs, never both.** No indent after a heading. In CSS: `p { margin: 0 } p + p { text-indent: 1em }`.
- **Sentence case for headings.** All caps only for less than one line, letterspaced 5 to 10%.
- **Real typographic characters:** curly quotes, proper apostrophes, en dash for ranges in tables, "to" in running text, one space after a full stop, non-breaking spaces in "10 am" style pairs that mustn't split.
- **Figures:** tabular for anything in columns (dates, times, prices in a diary), proportional in running text.
- **Never hyphenate headings.** Balance them with `text-wrap: balance`. Use `text-wrap: pretty` on body text to cut down single-word last lines.

### Hierarchy and packaging

- **One dominant element per page.** Readers enter print pages through the biggest picture, then the biggest headline, then captions, then text (Poynter EyeTrack). Put one of them clearly in charge.
- **Contrast of scale is what makes a page look edited.** A few sizes, far apart, rather than lots of sizes close together.
- **Keep a story's parts together:** headline, standfirst, picture, caption and text in one rectangle. No doglegs.
- **The standfirst carries information the headline doesn't.** (Matt Willey: the dek often carries more than the headline.)
- **Captions are read, so make them add something** the picture can't show: who, where, when, why it matters. Never repeat the headline.
- **Fact blocks for notices:** When, Where, Cost, Contact, always in that order, set in a consistent small style.
- **A strict, plain base lets the few broken moments register.** Break the grid rarely and on purpose. (Richard Turley)
- **Ads go in their own area,** clearly separate from editorial, never in the middle of a story.

### Images

- **Crop hard when the picture can take it,** to the person or thing that matters. One big picture and smaller supports, never a contact sheet of equal sizes.
- **300ppi at the printed size**, 250 is acceptable, under 200 shows. A weak or low-res photo runs small with a good caption rather than large.
- **Full bleed only for a strong photo.**
- **No image is fine.** A text-only lead gets a big headline, a standfirst and a pull quote as its entry points. No clip art, ever.

## Things that make a layout look amateur

Everything centred. More than two families. All-caps serif headlines. Justified narrow columns with rivers and bad hyphens. Boxes round everything. Equal-sized pictures scattered about. Inconsistent gaps. Tiny text because "it all has to fit". Ads mixed into editorial. Several colours used for decoration rather than meaning.

And the generated-site look, which is just as bad in print: gradient washes, coloured stripes down the side of boxes, a small label above every heading, icons in coloured squares, numbered 01/02/03 on things that aren't steps, a drop shadow on every box.

## Trev's apps

When the document belongs to one of Trev's apps that takes an obvious theme, the obvious rules in that repo's CLAUDE.md win: no monospace, no eyebrows, the theme's display and text faces, colours and radius from the tokens. Brookwood is not on obvious: use its own colours and fonts, and its voice (`write-like-brookwood-news`).

## Checking

```sh
node .claude/skills/editorial-design/scripts/check-layout.mjs page.html --pages ".page" --safe 10
```

It reports text that's cut off or past the page edge, text inside the safe margin, runts, text under the size floor, low contrast, fonts that didn't load as web fonts, and photos below 300ppi at the size they're placed. Mark full-bleed elements `data-bleed` and story boxes `data-fit="name"`. It saves a screenshot per page: look at all of them. Passing the script means nothing is broken. It doesn't mean the page is good.

For the PDF itself, `scripts/export-pdf.mjs` exports at the CSS page size with backgrounds on. Then run `pdffonts` to check every font is embedded and is the one you meant (Chromium swaps missing fonts silently), and `pdfimages -list` to check image resolution.

## References

- `references/grids-and-proportion.md`: measure, leading, scales, grids, margins, baseline procedures, symmetry.
- `references/text-typography.md`: paragraphs, hyphenation, caps, figures, typefaces, headings, UK style, older readers, CSS support in Chromium.
- `references/editorial-practice.md`: what Porter, Turley, Willey, Fleckhaus and others did; furniture sizes; packaging; pacing; images; awards.
- `references/print-production.md`: fixed or flowing pages, bleed, printer specs, colour, PDF checks, copy-fitting, templates.
- `references/a4-newsletter.md`: a worked set-up for a 4-page A4 community newsletter, with grid numbers, type roles and story slots.
