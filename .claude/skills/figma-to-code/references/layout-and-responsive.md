# Layout and responsive behaviour

## Contents

- Read the layout
- Auto layout to CSS
- Frames without auto layout
- One frame or two
- 390, 1280 and the widths between
- Height, scrolling and fixed bars
- Checks that come from WCAG

## Read the layout

A frame is drawn at one fixed width. Its numbers are true at that width
and nowhere else. `get_design_context` returns React and Tailwind with
the frame's sizes in it, sometimes with absolute positions. Treat that as
a description of intent: what sits next to what, what stretches, what
stays put. Then write layout that does the same thing at any width.

Before building, say in a sentence or two how the screen behaves as it
widens: "single column on phones, cards go 2 across from about 700px and
3 across at desktop, text column capped at the measure". If you can't,
the frame doesn't say, and that's a question for the designer or a
decision you list.

## Auto layout to CSS

| Figma | CSS |
|---|---|
| Vertical or horizontal auto layout | `display: flex` with `flex-direction: column` or `row` |
| Gap between items | `gap: var(--ds-space-*)` |
| Padding | `padding` with space tokens |
| Alignment (top left, centre, space between) | `justify-content` and `align-items` |
| Wrap | `flex-wrap: wrap`, or a grid if the items should line up in columns |
| Hug contents | Leave the size to the content (`width: auto`, `fit-content` for a button) |
| Fill container | `flex: 1 1 0` on the main axis, `align-self: stretch` across it, `min-width: 0` so long text can shrink |
| Fixed width or height | Ask why. An icon, avatar or control height is truly fixed (use a control token). A card or column is fixed only because the frame is: make it fluid with a max. |
| Min and max width | `min-width`, `max-width` |
| Ignore auto layout (absolute position) | `position: absolute` inside a `position: relative` parent, only for real overlaps: a badge on an icon, a close button on an image |

Flex items won't shrink below their content by default, which is why a
long word or URL can push a "fill" column off screen. `min-width: 0` on
the item, plus `overflow-wrap: anywhere` on text that may hold long
strings, fixes it.

Use grid when items share columns across rows (a card grid, a form with
aligned labels). `repeat(auto-fill, minmax(<min>, 1fr))` gives a grid that
reflows with no breakpoints. Take the minimum from the frame's card width,
rounded to something the content needs.

## Frames without auto layout

Hand-placed layers come back as absolute positions. Rebuild them in normal
flow: group by rows, read the gaps between groups as spacing steps, and
check the order makes sense when read top to bottom. Screen readers and
the Tab key follow the source order, whatever the picture shows.

Figma constraints give hints: left and right means stretch, centre means
centre, scale means a proportion. Don't copy `left: 137px`.

## One frame or two

- **Phone frame only.** Build mobile first from it. For wider screens,
  cap text at `--ds-measure`, the page at `--ds-container`, use
  `--ds-gutter` for side margins, and let grids reflow. List what you
  decided for desktop.
- **Desktop frame only.** Work out the phone layout yourself: one column,
  side-by-side groups stacked in reading order, tables either reflowed or
  scrolled inside their own box. Show the designer the 390 screenshot
  first; it's the one most likely to need their eye.
- **Both.** They're two snapshots of one design. Find what changes between
  them and put the switch at the width where the content needs it.
  Device widths are a poor guide. Check the app's CSS for breakpoints it already uses (the registry
  `Sheet` switches at 640px) and reuse one if it fits.

## 390, 1280 and the widths between

- Fluid tokens do a lot of the work: h1 to h3, lead, `--ds-space-fluid-*`
  and `--ds-gutter` all grow with the viewport. Use them for the sizes
  that should grow, and fixed steps for the ones that shouldn't (padding
  inside a button).
- Prefer intrinsic layout (`min()`, `clamp()` with tokens, `auto-fill`
  grids, `flex-wrap`) over a stack of media queries.
- Images keep their shape with `aspect-ratio` and `object-fit`.
  `base.css` already gives images `max-width: 100%`.
- After it works at 390 and 1280, drag through the widths between (or
  screenshot 768 and the width either side of each switch). That's where
  orphaned buttons, half-empty rows and cramped labels show up.

## Height, scrolling and fixed bars

A phone frame is usually 844px tall because that's the height of a
phone. The content carries on and the page scrolls. Compare the Figma screenshot
with the top of the page at the same height and say whether the page is
longer.

Headers, tab bars and action bars that stay put are `position: sticky` or
`fixed`, on `--ds-z-sticky` or `--ds-z-nav`. A bar at the bottom of a
phone screen needs `padding-bottom: env(safe-area-inset-bottom)` so it
clears the home indicator, and the page needs room underneath it so the
last item isn't hidden. A sticky bar must not cover the focused element
(WCAG 2.4.11); `scroll-padding` on the page fixes that for keyboard users.

## Checks that come from WCAG

- **Reflow (1.4.10):** nothing lost and no sideways scroll at 320 CSS px
  wide, which is a 1280 screen at 400% zoom. If it works at 390, try 320.
- **Resize text (1.4.4):** text can go to 200% without breaking the
  page. Don't fix the height of anything holding text.
- **Text spacing (1.4.12):** people can raise line height to 1.5, paragraph
  spacing to 2, letter spacing to 0.12 and word spacing to 0.16 times the
  font size without losing content. Fixed heights and `overflow: hidden`
  on text boxes are what break this.
