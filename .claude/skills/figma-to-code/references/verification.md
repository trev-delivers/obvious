# Verifying the build against the frame

## Contents

- What you're comparing
- Get the Figma image at the right size
- Screenshot the build
- Compare
- Reading the result
- When to stop
- Then the wider checks

## What you're comparing

Two renders of the same screen: Figma's, and Chromium's of the built page.
They will never match pixel for pixel. Figma and browsers rasterise text
differently, and Playwright's own docs say screenshots differ between
browsers, platforms and machines. The aim is to find the differences that a
designer would see (a gap, a size, a colour, a missing part, a different
order) and either fix them or explain them.

## Get the Figma image at the right size

`Figma:get_screenshot` scales the image so its longest edge is no more
than `maxDimension`, which defaults to 1024. Its response gives the
rendered size and the frame's `original_width` and `original_height`.

- For a 1:1 comparison, ask again with `maxDimension` equal to the larger
  original dimension. A 390 by 844 phone frame needs `maxDimension: 844`;
  a 1280 by 2400 desktop frame needs 2400.
- Download the PNG with the curl command in the response straight away;
  the link is short-lived. Save it in your scratchpad as `figma.png`.
- Use the screenshot only as the target. Never put it in the page.

## Screenshot the build

Run the app the way its CLAUDE.md says (dev server, or a production build
and `start`/`preview`), on a port nobody else is using. Then screenshot it
with the app's own Playwright. Write this to your scratchpad as
`shoot.mjs` and run it from the app's folder, so `playwright` resolves to
the app's copy:

```js
// node shoot.mjs <url> <out.png> <width> <height> [light|dark] [scale]
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/");
const { chromium } = require("playwright");

const [url, out, w, h, scheme = "light", scale = "1"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));
await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, animations: "disabled", caret: "hide" });
const sideways = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
console.log(JSON.stringify({ out, errors, sideways }));
await browser.close();
```

- Width and height: the frame's. The screenshot is the viewport, which is
  what the frame shows. For a frame that's the whole long page, pass the
  frame's full height.
- Scale: 1 if you asked Figma for the natural size. If the Figma PNG is
  2x, either pass 2 or let `compare-png.mjs` scale the larger image down
  (it does that by itself for whole-number ratios).
- `animations: "disabled"` finishes finite animations and resets infinite
  ones, and reduced motion stops entrance effects, so the page is at rest.
- Wait for `document.fonts.ready`, or text may be captured in a fallback.
- Put the page in the state the frame shows: signed in or out, the same
  data, the same tab open. If the app has a fake backend for its browser
  tests, use that. If the content can't match (real data, other names),
  compare layout and say the content differs.
- Never run `playwright install`. If the app has no Playwright, say so in
  the report and compare by eye from screenshots taken another way.

## Compare

```sh
node /path/to/obvious/.claude/skills/figma-to-code/scripts/compare-png.mjs figma.png built.png --diff diff.png
```

It prints the share of pixels that differ, the bands of rows where they
sit (biggest first, with their x range), and notes about any size
mismatch. `--diff` writes the Figma image faded to grey with each
differing pixel in red. `--region x,y,w,h` compares one area, for
checking a section once the rest is settled. `--json` gives the same for a
script. The per-pixel test is the same idea as pixelmatch (the library
behind Playwright's screenshot assertions): a perceptual colour distance
in OKLab, with the same default threshold of 0.1. Unlike pixelmatch it
doesn't skip anti-aliased edges, so text always contributes some red.

Then open `figma.png`, `built.png` and `diff.png` with the Read tool and
look. The script tells you where to look; you decide what it is.

## Reading the result

| What the diff shows | Usually means |
|---|---|
| A whole band of red from some point down | Something above is the wrong height: a gap, a line height, an extra or missing element. Fix the first band; the rest often goes with it. |
| Text drawn twice, slightly offset | Different font, weight, size or tracking. Check the type role and face. If the build uses the theme's face and the frame used another, it's a kept difference. |
| Red outline round a box | Radius, border or shadow. Check the token. |
| A solid red block | A colour difference or a missing part. |
| Red at the right edge only | Width or horizontal padding. Or the page has sideways scroll. |
| Scattered single pixels on text edges | Renderer noise. Leave it. |
| A size note | The page is longer or shorter than the frame, or captured at a different width or scale. Fix the capture before reading anything else. |

A worked example: a card with a heading, a line of body text and a button,
built from tokens against a frame that used plain values, came out with
2.86% of pixels different. The bands were the heading (doubled letters:
the frame had no letter spacing, the h1 role has -0.03em), the button
label (the ui role's weight 500 against the frame's 400) and the body text
(it wrapped one word earlier). All three were the type roles doing their
job, so they were kept and listed.

There's no pass mark. A screen of mostly text can sit at a few percent
when it's right; a screen with one big wrong-coloured panel can be 10%
from one mistake. The bands and the images matter more than the total.

## When to stop

Repeat build, screenshot and compare until each remaining band is one of:

- renderer noise on text edges;
- a difference you're keeping because of a rule (token instead of literal,
  type role, theme face, no eyebrow, system component as it is);
- content that can't match (real data).

If 3 rounds in a row don't shrink the differences, stop and report what's
left and what you tried. Don't loosen `--threshold` or crop a stubborn
area out to make the number smaller. A smaller number from a looser test
proves nothing.

## Then the wider checks

The frame comparison only covers one width and one state. After it:

1. Screenshot at 390 and 1280 (and 768) with the same script. Check
   `sideways` is false and `errors` is empty at each.
2. Dark, if the theme has a dark set: compare with the dark frame if
   there is one, otherwise just look for contrast and anything that stayed
   light.
3. Tab through the screen and check focus is visible and in order.
4. Run the app's checks (`npm run check` or what its CLAUDE.md says) and
   obvious's audit. Report the audit's bypass number before and after.
5. Put the Figma image and the built screenshots side by side in the
   report. A designer judges with their eyes.
