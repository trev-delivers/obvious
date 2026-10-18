# Text typography

Running text at book standard, in HTML and CSS. Bringhurst is cited by section (Richard Rutter's webtypography.net quotes the book by the same numbers). Butterick is *Practical Typography* (practicaltypography.com). "Rule of thumb" means no source was found.

## Size, measure, leading

1. **Body 10 to 12pt in print, 15 to 25px on screen.** Adjust by eye in half-point steps for the face. (Butterick, "Point size")
2. **Measure 45 to 75 characters, 66 ideal; 40 to 50 for multi-column.** Butterick allows up to 90, "two to three alphabets". Use 75 as the target ceiling and 90 as the hard one. (Bringhurst 2.1.2; Butterick, "Line length")
3. **Set measure in `ch` or `em`, not percent.** A character averages about 0.5em, so 33em or 66ch gives about 66 characters. (Rutter on 2.1.2)
4. **Leading 120 to 145% of the size.** 110% is too tight, 170% too loose. Use unitless `line-height`. (Butterick, "Line spacing")
5. **Longer lines need more leading.** About 1.3 at 45 characters, 1.45 at 75. (Bringhurst 2.2.1; figures are a rule of thumb)
6. **Keep a vertical rhythm:** heading sizes, paragraph gaps and block margins as multiples of the line-height. Block quotes take margins equal to the line-height. (Rutter on 2.2.1 and 2.3.3)

## Paragraphs

7. **Indent or space between paragraphs, never both.** Indent 1 to 4 times the type size, or 4 to 10pt between paragraphs. (Butterick, "First-line indents")
8. **Indent at least an en**; 1em is standard. Smaller for narrow columns. (Bringhurst 2.3.2)
9. **No indent after a heading or at the start.** (Bringhurst 2.3.1)
10. **CSS:** `p { margin: 0 } p + p { text-indent: 1em }`. Paragraphs after headings, figures and quotes then aren't indented.
11. **Block quotations must be visibly distinct** from the text before and after. (Bringhurst 2.3.3)

## Justification, hyphenation, rag

12. **If you justify, hyphenate.** (Butterick, "Hyphenation")
13. **Ragged right, hyphenation is optional.** It smooths the rag but doesn't help reading. (Butterick)
14. **The shorter the line, the more hyphenation matters**, whichever alignment. (Butterick)
15. **Don't justify below about 9 words (roughly 50 characters) a line.** (MyFonts, "The Font Manual: justified and rag right")
16. **Browsers justify one line at a time**, so their justified text is worse than InDesign's. Default to ragged right on screen. In print, justify only at 45 characters or more, with `hyphens: auto`. (Butterick left-aligns on the web; the line-at-a-time point is a rule of thumb)
17. **Hyphen breaks: at least 2 letters before, 3 after.** CSS `hyphenate-limit-chars: 6 2 3`. (Bringhurst 2.4.1; MDN)
18. **No more than 3 hyphenated lines in a row.** No CSS for this in Chromium: check by eye or use `&shy;` by hand. (Bringhurst 2.4.3)
19. **Set the language**: `lang="en-GB"` on `<html>`, or the hyphenation dictionary is wrong. (Bringhurst 2.4.5)
20. **Never hyphenate headings.** (Butterick, "Headings")
21. **Put extra justification space between words, never between letters.** (Butterick, "Justified text")
22. **Rivers** come from wide gaps lining up in consecutive lines, worst in short measures. Fix with a wider column, hyphenation, smaller type or ragged setting. (MyFonts)
23. **A good rag is "a soft ripple"**, not a wedge, staircase or hollow. `text-wrap: pretty` helps. (MyFonts)
24. **One space after a full stop.** (Bringhurst 2.1.4; Butterick)

## Widows, runts, non-breaking spaces

25. **Widows** (a paragraph's last line stranded at the top of a column) are worse than orphans (a first line stranded at the foot). Fix widows. (Bringhurst, reported in secondary sources)
26. **Runts** (one short word alone on a last line): fix with `text-wrap: pretty` or an edit.
27. **Non-breaking spaces** keep "10 am", "page 3", "6.2 mm" together. (Bringhurst 2.4.6)

## Caps, small caps, figures, emphasis

28. **Letterspace capitals and small caps 5 to 10%** (`letter-spacing: 0.05em` to `0.1em`). Butterick says 5 to 12%. (Bringhurst 2.1.6)
29. **Don't letterspace lower case**, and don't squeeze letters. `letter-spacing: -0.1em` on a heading is Rutter's example of damage. (Bringhurst 2.1.7, 2.1.9)
30. **Leave the font's kerning on**; add none by hand. (Bringhurst 2.1.8; Butterick)
31. **All caps for less than one line only, always letterspaced.** (Butterick, "All caps")
32. **Real small caps or none.** Faked ones from scaled capitals look poor. Use `font-synthesis: none` to stop the browser faking bold, italic or small caps. (Butterick, "Small caps"; Bringhurst 3.2.2)
33. **Figures:** lining with capitals; text (oldstyle) figures in running text if the face has them; proportional in text; tabular in columns. (Bringhurst 3.2.1; Butterick, "Alternate figures")
34. **Bold or italic as little as possible, never both; never underline** except links. Curly quotes, real apostrophes, a proper ellipsis. Centre sparingly. (Butterick, "Summary of key rules")

## Typefaces

35. **Avoid goofy fonts, monospaced fonts, most free fonts and system fonts**, especially Times New Roman and Arial. (Butterick) The free faces below are the exceptions worth using because they have optical sizes, proper italics and a full weight range.
36. **Use a family with an optical size axis** for text and display together, with `font-optical-sizing: auto`. Small sizes get sturdier strokes and bigger serifs; large sizes get finer detail. (MDN, `font-optical-sizing`)
37. **One text family, at most one companion.** Regular, italic and bold cover running text; add a display cut or semibold only if used. (Rule of thumb; Spiekermann suggests one well-chosen face per template)
38. **Pair on contrast of structure, not mood**; match x-height at body size; never pair two near-identical faces. A single family with optical sizes avoids the problem. (Rule of thumb)
39. **Serif for long text in print and sans for labels and tables is convention, not a finding.** No experimental evidence was found either way. RNIB-linked guidance prefers sans, so for older readers use a sturdy serif with a large x-height at a generous size, or a clear sans.

Good free choices on Google Fonts (axes from Google's own font metadata, Oct 2026):

| Family | Use | Axes |
|---|---|---|
| Newsreader | Text and display, news feel | opsz 6 to 72, wght 200 to 800, italic |
| Source Serif 4 | Text and display, sturdy small | opsz 8 to 60, wght 200 to 900, italic |
| Literata | Long reading | opsz 7 to 72, wght 200 to 900, italic |
| Merriweather | Sturdy text, large x-height | opsz 18 to 144, wdth, wght 300 to 900, italic |
| Fraunces | Display with character | opsz 9 to 144, wght 100 to 900, italic |
| Libre Caslon Text and Display | Classic book pair | static |
| Instrument Serif, DM Serif Display | Display only | static |
| Public Sans, Source Sans 3, Work Sans | Sans companions | wght |
| Atkinson Hyperlegible | Sans for low vision | static |

Guardian Egyptian (Barnes and Schwartz, commissioned by Mark Porter, 2004 to 2005) is the model for a news text face, but it's paid. Faces made for news tend to be sturdier, with bigger x-heights and lower contrast than book faces (rule of thumb). Newsreader, Source Serif 4 and Literata are the closest free options. Check a face has the italics, weights and figure styles you need before committing.

## Headlines and furniture

40. **In-text subheads: the smallest visible step up**, e.g. 12.5 or 13pt over 12pt body. Space above and below does most of the work. Two levels, three at most. (Butterick, "Headings")
41. **Sentence case for headlines and subheads.** (Butterick)
42. **Display type: tighten slightly as it grows**, about −0.01em to −0.02em at 48px and above; line-height 1.0 to 1.2. (Rule of thumb; Fleckhaus asked for display letters "a scalpel-blade width apart")
43. **Balance headlines, captions and pull quotes** with `text-wrap: balance` (6 lines or fewer in Chromium). Body text gets `text-wrap: pretty`. (MDN, `text-wrap-style`)
44. **Hanging punctuation** has no Chromium support. Fake it for a quote that opens a paragraph or pull quote with a small negative `text-indent` (about −0.4em; test per face). (caniuse)
45. **Drop caps:** `initial-letter: 3` is 3 lines tall sitting on line 3. Chromium supports it from 110, but not the alignment controls; use `@supports (initial-letter: 1 1)` with a float fallback and check the cap top against the first line's cap height. One per article opener at most. (MDN; Chrome developer blog)
46. **Pull quotes and captions:** no sourced sizes. Pull quotes 1.25 to 1.75× body, one per spread at most; captions about 2pt under body, never under 9pt in print for general readers (11pt for older readers). (Rule of thumb)

## UK conventions

47. **Quotes:** single is the traditional British default with doubles inside (New Hart's Rules, via Shelter's style guide and publisher guides). Newspapers and many houses use doubles. Pick one and keep to it; follow the publication's own habit where it has one.
48. **Dashes:** the spaced en dash ( – ) is the British norm for a break (CUP, Penguin); OUP uses the closed em dash. Trev's projects ban em dashes, so use the spaced en dash, or better a comma or colon.
49. **Ranges:** "to" in running text ("10 to 12 June"), en dash in tables. (GOV.UK style guide)
50. **Dates:** "2 June", no ordinals, no comma before the year. **Times:** pick one style and keep to it. GOV.UK writes "5:30pm"; Brookwood News writes "7.30pm". (GOV.UK; write-like-brookwood-news)
51. **Numbers:** numerals in Trev's projects; commas over 999; "per cent" in running text, % in tables. (GOV.UK; house rule)

## Older readers

The RNIB clear print page itself wasn't reachable; these come from Sensory Trust and RNIB documents found through search.

52. **Clear print: 12pt minimum, 14pt ideal**, including captions, page numbers and footers; large print is 16pt or more. The figures are for Arial, so compare x-heights. (Sensory Trust; RNIB product design guide)
53. **Line spacing at least 150%** on screen (RNIB app guidelines). In print, 1.35 or more.
54. **Contrast at least 4.5:1, ideally 7:1.** Dark on light. Reversed type only for headings and short blocks. (RNIB; Sensory Trust)
55. **Regular or semibold weights**, never light. Bold, caps and italics only occasionally. (Sensory Trust)
56. **Left-aligned, no hyphenation at line ends.** (RNIB clear print via Sensory Trust) For a community newsletter with older readers, this overrides the justified-and-hyphenated rules: ragged right, `hyphens: manual`.
57. **Headings at least 20% bigger than body.** (Sensory Trust)

## CSS support in Chromium (checked against MDN and caniuse, Oct 2026)

| Property | What it does | Chromium |
|---|---|---|
| `hyphens: auto` | Dictionary hyphenation; needs `lang` | 88 |
| `hyphenate-limit-chars` | Min word, before, after | 109 |
| Consecutive hyphen limit | | Not shipped |
| `text-wrap: balance` | Even line lengths, 6 lines max | 114 |
| `text-wrap: pretty` | Avoids short last lines | 117 |
| `orphans`, `widows` | At page or column breaks | Yes (not Firefox) |
| `font-variant-numeric` | tabular, oldstyle, lining, proportional | 52 |
| `font-variant-caps` | Real small caps if the face has them | Yes |
| `font-kerning` | Pair kerning, on by default | 29 |
| `font-optical-sizing` | Uses the opsz axis | Yes |
| `hanging-punctuation` | | No (Safari only) |
| `initial-letter` | Drop caps | 110, partial |
| `text-align-last` | Last line of justified text | 47 |

## Starter CSS

```css
html { /* set lang="en-GB" on the element */ }
body {
  font-family: "Newsreader", Georgia, serif;
  font-optical-sizing: auto;
  font-synthesis: none;
  font-kerning: normal;
  text-align: left;
  hyphens: manual;            /* older readers; use auto only when justifying */
  text-wrap: pretty;
}
.prose p { margin: 0; }
.prose p + p { text-indent: 1em; }
h1, h2, h3, figcaption, blockquote { text-wrap: balance; hyphens: none; }
.diary, table { font-variant-numeric: tabular-nums; }
.justified { text-align: justify; hyphens: auto; hyphenate-limit-chars: 6 2 3; }
```

## Sources

Read: Butterick, practicaltypography.com (summary of key rules, line length, line spacing, point size, first-line indents, justified text, all caps, headings, hyphenation, small caps, alternate figures, page margins); Rutter, webtypography.net (Bringhurst sections 2.1.1 to 2.1.9, 2.2.1, 2.3.1 to 2.3.3, 2.4.1, 2.4.3, 2.4.5, 2.4.6, 3.2.1, 3.2.2); MDN (`hyphenate-limit-chars`, `text-wrap-style`, `hanging-punctuation`, `initial-letter`, `font-optical-sizing`); caniuse and MDN browser-compat-data; Chrome developer blog, "Control your drop caps with CSS initial-letter"; MyFonts Font Manual; GOV.UK A to Z style guide; Sensory Trust, "Access to information: print"; Google Fonts metadata.

Secondary: RNIB product design and app guidelines (via search); Wikipedia on leading, widows and orphans, Guardian Egyptian; Scribbr on dashes; Shelter and Sacristy Press style guides on quotes.

Not read: Hochuli, *Detail in Typography*; Tschichold, *The Form of the Book*; Lupton, *Thinking with Type*; New Hart's Rules. Worth getting for numbers this file lacks.
