# Print production

From HTML and CSS to a PDF a printer will accept. "Tested" means it was run in Chromium 141 through Playwright 1.56 with poppler tools and pypdf in October 2026. Nothing involving Ghostscript was run: those commands come from its documentation.

## Fixed pages or flowing text

| | Fixed pages | Flowing text |
|---|---|---|
| What | Each page is an element of exact size; you place everything | One long document; the engine breaks it into pages |
| Good for | Newsletters, posters, magazines with a designed layout per page | Reports, books, long articles |
| Fails by | Silent overflow (clipped text) unless you check | Bad breaks: a heading at the foot, a figure pushed on |
| Checking | Per box, easy to automate | Page by page in the PDF |
| Engine | Plain Chromium | Chromium for simple books; Paged.js, Vivliostyle, WeasyPrint or Prince for running heads from content, footnotes, cross-references |

For a short publication with a different layout on each page, use fixed pages. Flow text only inside a slot (a story across 2 columns of the same page). For long documents use flow with `@page` and `break-*` rules, and only reach for Paged.js when Chromium can't do what the design needs.

## What Chromium does and doesn't do

- `@page { size; margin }`: yes. (MDN)
- `bleed` and `marks`: **ignored** (tested). Build the bleed into the page size instead.
- Margin boxes (`@top-center`, `@bottom-right`) with `counter(page)` and `counter(pages)`: yes from Chrome 131 (Chrome developer blog; tested). They need a non-zero page margin. On fixed pages with `margin: 0`, draw folios in the HTML.
- Named pages (`page: name`): yes.
- `orphans`, `widows`: yes in Chromium, not Firefox.
- `break-after: page` on page elements works (tested); add `.page:last-child { break-after: auto }` or you get a blank last page.
- No TrimBox or BleedBox in the PDF (tested). Add them afterwards if the printer's preflight wants them.
- Fonts embed as subsets (tested). **Missing fonts are swapped silently**: a request for Georgia embedded Liberation Serif (tested). Always run `pdffonts`.
- Images aren't downsampled (tested): good for print, but check the file size.
- `document.fonts.check()` returns true for fonts that aren't installed (tested), so it proves nothing. Self-host fonts with `@font-face` and check `[...document.fonts]` status, then `pdffonts` on the PDF.
- A4 comes out as 594.96 × 841.92pt, 0.1mm off true A4 (tested). Harmless, but read the real size with `pdfinfo -box`.

### Playwright `page.pdf()`

- `preferCSSPageSize: true`, always, or the page is scaled to default paper.
- `printBackground: true`, always, or backgrounds vanish.
- Put `* { print-color-adjust: exact; -webkit-print-color-adjust: exact }` in the CSS.
- Print media CSS is used by default. Run layout checks after `page.emulateMedia({ media: 'print' })` so they match the PDF.
- Don't use `displayHeaderFooter`: its templates can't see your styles.

(playwright.dev, `page.pdf`)

## Fixed A4 page with 3mm bleed

A4 trim is 210 × 297mm; with 3mm bleed all round the page is 216 × 303mm. Work in mm for page boxes. A4 is 793.7 × 1122.5 CSS px (the 794 × 1123 figure is rounded).

```html
<style>
  :root { --bleed: 3mm; --safe: 10mm; }
  @page { size: 216mm 303mm; margin: 0; }
  * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  html, body { margin: 0; }
  .page { position: relative; width: 216mm; height: 303mm; overflow: hidden; break-after: page; background: #fff; }
  .page:last-child { break-after: auto; }
  .trim { position: absolute; inset: var(--bleed); }           /* the finished page */
  .live { position: absolute; inset: var(--safe); }            /* text stays in here */
  .bleed-photo { position: absolute; left: 0; top: 0; width: 216mm; height: 110mm; object-fit: cover; }
</style>
<section class="page" data-page>
  <img class="bleed-photo" data-bleed src="hero.jpg" alt="">
  <div class="trim"><div class="live">…</div></div>
</section>
```

- Anything that touches a trimmed edge goes all the way to the 216 × 303 edge, as a direct child of `.page`.
- Text, logos and folios stay inside the live area: 5mm from trim is the floor (Orphans Press), 10mm is better (University of Cambridge print guide).
- No thin border following the trim: cutters drift about 1mm and it will look off-centre. If you must, keep it 10mm or more in.
- If the printer wants trim-size pages with no bleed (fine when every page has white margins), export a second version at 210 × 297mm.
- Overlap neighbouring background blocks by 0.2mm, or some viewers show a hairline gap.

### Add TrimBox and BleedBox (tested)

```python
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject
b = 3 * 72 / 25.4
r = PdfReader("newsletter.pdf"); w = PdfWriter()
for p in r.pages:
    W, H = float(p.mediabox.width), float(p.mediabox.height)
    p.trimbox = RectangleObject([b, b, W - b, H - b])
    p.bleedbox = RectangleObject([0, 0, W, H])
    w.add_page(p)
w.write("newsletter-boxed.pdf")
```

## Ask the printer three things first

UK printers' published specs disagree, so ask before promising a print-ready file:

1. Which PDF do you want: PDF/X-1a, X-3, X-4, or any press-quality PDF?
2. Will you take an RGB PDF and convert it yourselves?
3. What bleed, safe area and ink limit do you want?

If they'll take RGB and convert, send Chromium's RGB PDF: their conversion is tuned to their press. No source was found saying a particular UK printer accepts RGB; Orphans Press says they'll convert but the proof may shift.

| Item | Typical | Source |
|---|---|---|
| Bleed | 3mm each side | Orphans Press; Cambridge |
| Safe area | 5mm inside trim (10mm ideal) | Orphans Press; Cambridge |
| Images | 300ppi at printed size; one printer won't guarantee below 240 | UK printer pages |
| Colour | CMYK preferred; RGB converted by some | Orphans Press |
| PDF | PDF/X-3 (Orphans), X-1a (others), unspecified (Imprint Digital) | Printer pages |
| Fonts | Embedded | Orphans Press |
| Black text | 100% K only | Orphans Press |
| Ink limit | 300 to 320% | Vendor pages; ask |

Minimum sizes have no UK standard. Working defaults (rule of thumb): body 9pt or more (higher for older readers), nothing at 7pt or below, lines 0.5pt or heavier, reversed text 9pt or more in a regular weight or heavier.

**Black:** Chromium writes black text as RGB 0,0,0. Converted carelessly it becomes four-colour black, which goes fuzzy on small text if the plates are slightly out. Check any conversion.

## Colour

- Chromium's PDF is RGB. The printer's conversion to CMYK is where colours move. Dark greens print darker and duller than on a lit screen; saturated blues, greens and oranges shift most.
- To check without a human: convert a swatch from sRGB to the printer's CMYK profile and back, and compare. A delta E above about 5 is a visible shift (rule of thumb).
- Profiles: PSO Coated v3 (FOGRA51) for coated offset, FOGRA39 for the older condition. Digital presses often have their own. Ask the printer which to proof against. Profiles are licensed: download from ECI, don't redistribute.
- Convert photos once, or leave them sRGB for the printer. Never twice.

## Ghostscript to CMYK or PDF/X (only if the printer insists; not run)

From ghostscript.readthedocs.io (VectorDevices, Use, Colour management):

```
gs -dPDFX=3 -dBATCH -dNOPAUSE -sColorConversionStrategy=CMYK -sDEVICE=pdfwrite -sOutputFile=out-x3.pdf PDFX_def.ps input.pdf
```

- Edit `PDFX_def.ps` first so its `/ICCProfile` points at the printer's profile. No profile is bundled.
- `-dPDFX` forces PDF 1.3 and needs Gray or CMYK conversion; RGB isn't allowed.
- The docs contradict themselves on PDF/X-4 support. Prefer X-3 or X-1a.
- Don't use `-dPDFSETTINGS=/screen` or `/ebook` (they downsample images).
- `-dBlackText` and `-dBlackVector` force black text and vectors; whether that gives K-only black in CMYK output wasn't confirmed. Check with a render.
- X-1a flattens transparency: avoid soft shadows and blend modes in print designs.
- WeasyPrint can write PDF/X and CMYK directly, and Vivliostyle's `--press-ready` targets X-1a, but both are different layout engines: check the design again.

## Checks

Run on the HTML before export, in the same browser that lays it out:

1. **Overflow:** `scrollHeight > clientHeight` on every box with `overflow: hidden` or a fixed height. Mark story slots `data-fit`.
2. **Safe area:** text rects inside the margin, skipping `data-bleed` elements.
3. **Image resolution:** effective ppi = 96 ÷ (CSS px per image px), using the larger scale for `object-fit: cover`. Under 300 flag, under 240 fail. A 12MP phone photo (4032 × 3024) is 300ppi up to about 341 × 256mm, so it's fine at any size on A4 unless heavily cropped. Photos sent through messaging apps are often shrunk: check `naturalWidth`.
4. **Runts:** compare the last word's line rect with the word before.
5. **Contrast:** computed colour against the nearest opaque background, WCAG ratio; 4.5:1 for body.
6. **Fonts:** every `@font-face` loaded.
7. **Screenshots** of every page, and look at them.

`scripts/check-layout.mjs` does 1 to 7. Then on the PDF:

```sh
pdfinfo -box newsletter.pdf      # page count and MediaBox (and TrimBox if added)
pdffonts newsletter.pdf          # every font embedded and the one you meant
pdfimages -list newsletter.pdf   # x-ppi and y-ppi of each image
pdftoppm -r 100 -png newsletter.pdf pg   # render the PDF itself and look
```

## Copy-fitting

In order of preference:

1. **Edit the text.** Cut by sentence. 10 to 15% is routine.
2. **Swap slots.** Short story into the small slot, long one into the lead. The biggest lever, and free.
3. **Change the picture:** crop tighter, or make it smaller.
4. **Nudge type**: size by up to 0.25pt, leading by up to 0.5pt, the same for every story on the page. (Rule of thumb) Beyond that, neighbouring stories look different.
5. **Change the page template.**

Never scale text with `transform`, go below the size floor, or let a story run into the safe area.

**An automatable loop:** for each `data-fit` box, overflow in lines = (scrollHeight − clientHeight) ÷ line-height. Positive means cut that many lines; more than 3 lines spare means report the space. Edit, re-run, repeat. Adobe InCopy works the same way: the designer sets frames, the writer sees red with a count to cut or blue with space to fill (Adobe InCopy help, "Copyfitting text").

**Automatic layout research:** Hennig and Strecker treat newspaper layout as cutting and packing, with automatic summarisation so articles shrink to fit (DAI-Labor). DocEng papers use dynamic programming over guillotine layouts. These fill pages from a pool of articles. For a short newsletter with known stories, trying every story-to-slot assignment across a few templates and scoring each with the overflow check is cheap and realistic. A general layout engine isn't.

## Templates from structured content

No published example of an organisation doing this was found, so this is a design suggestion.

- **Typed stories, not pages:** `lead` (headline, standfirst, body, photo, caption), `news` (headline, body, optional photo), `notice` (title, facts: when, where, cost, contact), `diary` (date, time, title, place), `ad` (fixed size), `letter`, `masthead`. Each has a word range per slot size.
- **Page templates** are CSS grids with named slots, each accepting certain types and sizes.
- **A content file** lists stories in priority order. A planner assigns stories to slots, renders, runs the checks, and reports failures by slot as lines to cut or add.
- **Diary rows and notices** have a fixed shape, rarely need fitting, and fill gaps well at the foot of a page.

## Sources

Read: MDN (`@page`, `page`, `orphans`); Chrome developer blog, "Print margins"; Playwright `page.pdf` docs; Paged.js docs ("How Paged.js works", supported features); Ghostscript docs (VectorDevices, Use, Colour management); WeasyPrint API docs; pdf-lib `PDFPage`; Orphans Press printing guidelines; Imprint Digital artwork guidelines; University of Cambridge print guide; Hennig and Strecker abstract (DAI-Labor).

Search summaries only: Vivliostyle CLI; Prince output intent and colour docs; Adobe InCopy copyfitting; WoodWing layout automation; PDF/X-1a versus X-4 (Hybrid Helix); ECI PSO Coated v3, Fogra and FOGRA39; DocEng 2012 guillotine layout.
