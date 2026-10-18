# Writing it up

How to write the review for a designer who can't read code. They should be
able to read the first screen of it and know what to fix first. It follows
`write-like-trev`: plain, UK spelling, numerals, no em dashes.

## Rules

- Worst first, using the severity and order in `triage.md`.
- The headline of each finding is what happens to a person, in their terms.
  "The Save button can't be reached with a keyboard" works; "button-name
  violation" or "4.1.2 failure" doesn't.
- Say who it stops: keyboard users, screen reader users, people using voice
  control, people who zoom or use large text, people with low vision or
  colour blindness, people with tremors or using one hand, people who need
  less motion, people with memory or attention difficulties.
- Say exactly where: the screen, the state, the element as it's labelled on
  screen, and the width or theme if it only happens there.
- The fix is a design decision first ("give the icon button a visible label
  or a name: Delete photo"), with the token or component to use if obvious
  has one. No code unless they ask.
- The WCAG criterion goes once, at the end of the finding, as number and
  name ("1.4.3 Contrast (Minimum)").
- Attach or link the screenshot for every finding.
- No percentages of "how accessible" the page is, and no pass mark.

## Template

```markdown
# Accessibility review: <app or page>

<One or two sentences: what was reviewed, against WCAG 2.2 AA, and the
headline (for example "2 things stop people finishing sign-in; the rest is
smaller").>

Reviewed: <pages and states>, at 390 and 1280 wide<, light and dark>.
Tools: <axe-core version, or "no axe in this app, rule checks done by hand">,
keyboard walk, accessibility tree in Chromium, obvious's contrast script.

## Stops people (blockers)

### <What happens, in plain words>
<Where. Who it stops and at which step. What you saw.>
Fix: <the design change>.
<Screenshot.>
<WCAG number and name.>

## Serious
...

## Moderate
...

## Minor
...

## Design system
<obvious standards the page misses that aren't WCAG AA failures: targets
under 44px on phones, motion that ignores reduced motion, colours that went
around the tokens.>

## Worth doing
<Best practice that isn't a failure. One line each.>

## Not tested
<Pages, states or checks you couldn't do, and why. Always include the
screen reader line below.>

Checked what a screen reader is given (the accessibility tree in
Chromium); not tested with VoiceOver or NVDA. To try it on an iPhone:
Settings > Accessibility > VoiceOver, turn it on, open the page, swipe right
to move through each item and listen, double-tap to press the selected
item, and turn two fingers like a dial to open the rotor and jump by
headings. Settings > Accessibility > Accessibility Shortcut can put
VoiceOver on a triple-click of the side button.
```

## Worked example

From a trial run of this skill on obvious's own docs site (built with
`node web/build.mjs`, served locally), Overview and Field pages, 390 and
1280 wide, axe-core 4.14.

```markdown
# Accessibility review: obvious docs, Overview and Field

Nothing stops anyone finishing a task on these 2 pages. The main problem is
small grey text on 3 of the theme cards that's too faint to read for people
with low vision.

Reviewed: Overview and Field, at 390 and 1280 wide.
Tools: axe-core 4.14, keyboard walk, accessibility tree in Chromium,
obvious's contrast script.

## Serious

### The app name and font names on 3 theme cards are too faint
On Overview, the Condimental, Routine and Parchment cards show their app
name and font pair in each theme's muted grey. On Condimental it measures
3.55 to 1 against the card; normal-size text needs 4.5 to 1. People with low
vision, or anyone reading on a phone outside, may not be able to read it.
Fix: these are the known theme failures in docs/contrast.md. Either use
each theme's text-dim colour on the cards, or take the suggested muted
colours there (Condimental #7A6F62) when you decide on the themes.
1.4.3 Contrast (Minimum)

## Moderate

### The code examples on Field can't be scrolled with a keyboard in some browsers
At phone width all 3 code examples (Markup, Behaviour, CSS) are wider than
the screen and scroll sideways. Chrome lets you Tab to each one and scroll
with the arrow keys; browsers that don't make scroll boxes focusable by
themselves leave keyboard users unable to see the end of the lines.
Fix: make each code box a focusable, named region, so every browser can
reach it.
2.1.1 Keyboard

## Design system

### Most links and controls are smaller than 44px
On Overview, 43 links and controls at desktop and 12 at phone width are
between 24 and 43px tall. They pass WCAG AA (24px) but are under obvious's 44px tap size.

## Worth doing

- The site menu at phone width opens with Enter, but Escape doesn't close
  it.

## Not tested

- Other docs pages; the theme switcher's effect on every page.
- Checked what a screen reader is given; not tested with VoiceOver or NVDA.
```

What the example shows: axe flagged only the Markup example, the widest;
checking the other 2 by hand found the same problem, so the finding covers
all 3. The 20px tall wordmark link was left out because it
passes on the spacing exception; the dark run was identical to light because
the docs site sets its own theme, so it isn't mentioned; reflow, text
spacing and reduced motion were clean and get no section, because the
"Reviewed" line already says what was covered.
