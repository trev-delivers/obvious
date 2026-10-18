# Grids, proportion, margins and the baseline

Sources are given beside each rule. "Rule of thumb" means no source was found and it's working practice to test by eye. Book references are by section so they can be checked in any edition.

## Measure and leading

1. **One column: 45 to 75 characters, 66 ideal**, counting spaces and punctuation. (Bringhurst, *The Elements of Typographic Style*, 2.1.2)
2. **Multi-column: 40 to 50 characters.** (Bringhurst 2.1.2)
3. **Justified text needs about 40 characters at least.** Below 38 to 40, word spaces go erratic or hyphens pile up, so set ragged right. Even ragged looks starved below about 30, except short marginal notes. (Bringhurst 2.1.2)
4. **Over 75 is too long for continuous reading**, whatever the leading. 85 to 90 is tolerable for discontinuous text like lists. (Bringhurst 2.1.2; Butterick's ceiling is 90)
5. **Measure is usually about 30 times the type size**, with 20 to 40 times the normal range. At 10pt, a 300pt measure gives about 65 characters in a face with a 118pt lowercase alphabet. Use that to estimate: characters per line ≈ width in points × 65 / 300 at 10pt, adjusted for the face. (Bringhurst 2.1.2)
6. **Müller-Brockmann's version: 7 to 10 words a line.** (*Grid Systems in Graphic Design*, "Width of column")
7. **Leading is baseline to baseline, and it is the unit of vertical space.** Routine settings: 9/11, 10/12, 11/13, 12/15. Longer lines, darker faces, large x-heights and sans serifs want more. (Bringhurst 2.2.1)
8. **Everything that interrupts the text adds up to whole lines.** At 11/13, "intrusions to the text should equal some multiple of 13 points". A bold subhead at 11/13 might take 8pt above and 5pt below. (Bringhurst 2.2.2)
9. **Two columns of short lines carry more than one column of long ones.** A book page holds 300 to 500 words; a two-column page about 750. (Bringhurst 2.2.3)
10. **Don't fix a bad page end by stretching leading or paragraph space.** Run a column a line short, resize an image or edit. For a short document, redesign to fit the text. (Bringhurst 8.8.3)

## Type sizes

11. **The traditional scale, in points:** 6 7 8 9 10 11 12 14 16 18 21 24 36 48 60 72. Use it or your own scale, but keep to "a modest set of distinct and related intervals". (Bringhurst 3.1.1)
12. **A modular scale** multiplies a base by one or two ratios. Two ratios give more useful steps than one. (Tim Brown, "More Meaningful Typography", A List Apart; Bringhurst 8.6.1) For print, whole-point sizes from the traditional scale are easier to keep on a baseline.
13. **When a page has three or more sizes, adjust their leadings so they share the same lines.** Müller-Brockmann's own book: 12pt semibold titles, 9/12 text, 7/8 captions. (*Grid Systems*)
14. **Vignelli: few sizes, contrasted hard**, such as text with a headline twice its size. (*The Vignelli Canon*, via secondary summaries) Treat "two sizes" as his personal austerity. A newsletter needs about six roles.

## Grids

15. **How many columns.** One gives too little freedom. Two can hold text and pictures and split into four. Three give variety and split into six but need smaller type. Four suit lots of text and pictures and split further. "As a rule the narrower the column, the smaller the typeface." (Müller-Brockmann, "Construction of the grid")
16. **Fields are measured in whole lines with one empty line between them.** Take the column depth in lines, subtract the gaps, divide by the number of fields, round down, recompute the depth. His example: 57 lines, 4 fields → (57 − 3) / 4 = 13.5 → 13 → 4 × 13 + 3 = 55. Picture edges then line up with the text. (Müller-Brockmann)
17. **Captions and headings fit whole lines too.** Three lines of 7/8, two of 10/12 and one of 20/24 all measure 24pt. (Müller-Brockmann)
18. **Gutter: "ideally the size of a line of type".** (Vignelli, *Canon*, "Grids for books")
19. **Match the grid to the shape of most of the pictures**, so they need less cropping. Type and pictures follow the same grid. (Vignelli)
20. **Too coarse a grid gives too few options; too fine is the same as no grid.** (Vignelli)
21. **Gerstner's mobile grid.** For *Capital*, a 10pt unit (the body size with its leading), 58 units wide, 2-unit gutters, so 1, 2, 3, 4, 5 and 6 columns all divide exactly. Choose a total width that divides several ways. (Gerstner, *Designing Programmes*)
22. **Müller-Brockmann offers grids of 8 to 32 fields.** His own book is a 32-field grid on A4, with 2 text columns of 9pt and 4 caption columns of 7pt.
23. **The text comes first.** "The text takes precedence over the purity of the design." (Bringhurst 8.8.3) Expect the first fit to be wrong and adjust field heights by a line.
24. **Newspapers:** the Guardian's 2005 Berliner used 5 columns, replacing 8. (Rick Poynor, Design Observer; D&AD case study) No published baseline values were found for the Guardian, NYT or Monocle.

## Margins and page shape

25. **Van de Graaf canon as Tschichold used it:** inner:top:outer:bottom = 2:3:4:6 on a 2:3 page; inner 1/9 of the width, outer 2/9, top 1/9 of the height, bottom 2/9. The text block has the page's proportions. (Wikipedia, "Canons of page construction"; not checked against *The Form of the Book*)
26. **A tighter variant, 1:1:2:3.** Secondary sources disagree on which canon uses which numbers. Use 2:3:4:6 as the book default.
27. **Equal margins "always create an impression of indecision and dullness".** Bottom deeper than top: set too low the block looks as if it's falling out, too high it floats. Too small feels overfull and puts thumbs on text; too large feels extravagant. (Müller-Brockmann, "Margin proportions")
28. **Margins have a technical floor.** Trimming drifts 1 to 3mm, often up to 5mm. (Müller-Brockmann)
29. **Page proportions:** books run from 5:9 to 4:5. A4 is 1:√2 (1:1.414), so use the general form of a canon, not 2:3 numbers. (Bringhurst 8.3)
30. **"Perhaps fifty per cent of the character and integrity of a printed page lies in its letterforms. Much of the other fifty per cent resides in its margins."** Folios go best at the foot, outside corner. (Bringhurst 8.5)
31. **Van de Graaf on A4 wastes more than a third of the sheet.** Right for a book, wrong for a newsletter carrying many items. Keep the proportions (inner:outer about 1:2, top:bottom deeper at the foot) at a third of the size.

## Symmetry and asymmetry

32. **Tschichold argued against the central axis** (*The New Typography*, 1928, and "New Life in Print", 1930): it's illogical because the distance from centre to line ends varies line by line. "Asymmetry is the rhythmic expression of functional design." (*The New Typography*)
33. **He later softened this for books**, keeping asymmetry for industrial and promotional work and traditional, simplified methods for books. (Secondary sources)
34. **The text decides** whether it suggests "perpetual symmetry, perpetual asymmetry, or something in between". (Bringhurst 1.2.5)
35. **Practical reading:** a document of many unrelated parts (a newsletter, a magazine section, a report) suits asymmetry: one strong left edge, variable-width pictures on the grid. Centre only a single formal statement. (Rule of thumb built on 32 to 34)
36. **Active white space** has no citable definition. In practice: white left on purpose at the head or side of a page, or a whole column left empty beside a feature, to give the eye a way in and separate groups, as opposed to white left over where the text ran out. Leave one span empty on purpose on a busy page. (Rule of thumb)

## Procedures

### A. Derive the grid from the type

1. Pick body size and leading from the scale, e.g. 10/12pt. The leading is the vertical unit.
2. Make caption leading divide into or multiply the body leading: 8/12 puts one caption line on each baseline.
3. Make heading leadings multiples of it: 18/24, 24/24 or 24/36, 36/36, 48/48.
4. Count how many lines the live area holds.
5. Divide into picture fields with one-line gaps: n × h + (n − 1) = total lines. Choose the total so it divides cleanly.
6. Choose the live width so 2, 3, 4 and 6 columns divide with a fixed gutter (Gerstner).
7. Check the measure for each column width (rule 5). Under 40 characters, set ragged or drop a size.
8. Put image tops and bottoms on baselines with one empty line before the caption.
9. Test with real copy and adjust by a line.

### B. A width that divides

With gutter g and column count c, the live width W must give a whole column for each count you want. For A4 in CSS px with a 16px gutter, W = 680 gives 12 columns of 42px: spans of 2 = 100, 3 = 158, 4 = 216, 6 = 332, 12 = 680. A span of n twelfths is 58n − 16 px.

### C. Headings and images on a baseline in CSS

1. Give each heading a line-height that is a whole multiple of the baseline: a one-line 24/24, a two-line 36/36.
2. If the size forces an awkward line-height, round up to the next multiple and let the margin make the total a whole number of lines.
3. Split odd space asymmetrically, more above than below (Bringhurst's 8 + 5 = 13; Rutter's 1.5 lines above and 0.5 below, "Compose to a vertical rhythm", 24 ways).
4. Crop images with `object-fit: cover` to a height of n × baseline, then one baseline of space.
5. Boxes: border + padding totals one line (1 + 7 + 7 + 1 = 16).
6. Columns only line up if every non-text element adds up to whole lines. If a column ends short, let it end short. Don't stretch.

## Sources

Read in full: Müller-Brockmann, *Grid Systems in Graphic Design* (Niggli, 1981); Bringhurst, *The Elements of Typographic Style* (Hartley & Marks), sections 1.2.5, 2.1.2, 2.2.1 to 2.2.3, 3.1.1, 8.3, 8.5, 8.6, 8.8.3, also at webtypography.net; Vignelli, *The Vignelli Canon* (Lars Müller, 2010); Gerstner, *Designing Programmes* (1964), "Programme as Grid"; Tschichold, *The New Typography* excerpt; Tim Brown, "More Meaningful Typography", alistapart.com; Richard Rutter, "Compose to a Vertical Rhythm", 24ways.org; "Setting Type on the Web to a Baseline Grid", alistapart.com; Rick Poynor, "The Guardian's New European Look", designobserver.com; University of Cambridge print guide (pdn.cam.ac.uk).

Secondary only: Wikipedia, "Canons of page construction"; Tschichold's *The Form of the Book* (not read).

Not found: Villard's figure margins as numbers; Guardian, NYT or Monocle baseline values; a sourced definition of active white space.
