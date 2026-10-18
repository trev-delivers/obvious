# Sources

All read on 2026-10-18. Each line says what in this skill it supports.

## Standards

- **Web Content Accessibility Guidelines (WCAG) 2.2**, W3C Recommendation,
  12 December 2024. https://www.w3.org/TR/WCAG22/ (W3C). The target standard;
  the list of criteria new in 2.2 and their levels; 4.1.1 Parsing marked
  obsolete and removed; the wording of 1.4.4, 1.4.10, 1.4.11, 1.4.12,
  1.4.13, 2.2.2 and 2.4.11.
- **Understanding SC 2.4.11 Focus Not Obscured (Minimum)**.
  https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
  (W3C WAI). "Entirely hidden" versus partly covered; sticky headers,
  banners, non-modal dialogs; user-opened content; technique C43
  (scroll-padding); the test steps in `manual-checks.md` section 3.
- **Understanding SC 2.5.8 Target Size (Minimum)**.
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
  (W3C WAI). 24 by 24 CSS px, the 5 exceptions and the 24 px circle test;
  links in sentences excused.
- **Understanding SC 2.5.5 Target Size (Enhanced)**.
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html
  (W3C WAI). 44 by 44 CSS px is AAA, which is why obvious's
  `--ds-control-tap-min` is treated as a design system standard and not an
  AA failure.
- **Understanding SC 2.5.7 Dragging Movements**.
  https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
  (W3C WAI). Single-pointer alternative required; keyboard support alone
  doesn't meet it; browser scrolling out of scope; slider, list and map
  examples.
- **Understanding SC 3.3.7 Redundant Entry**.
  https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html (W3C WAI).
  Same process only, so sessions are out of scope; browser autocomplete
  isn't enough;
  "same as" checkbox and pick-from-earlier examples; the exceptions.
- **Understanding SC 3.3.8 Accessible Authentication (Minimum)**.
  https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html
  (W3C WAI). Paste and password managers count as a mechanism; blocking
  paste fails; email links, OAuth and device authentication pass; object
  recognition CAPTCHA allowed at AA.
- **Understanding SC 1.4.10 Reflow**.
  https://www.w3.org/WAI/WCAG22/Understanding/reflow.html (W3C WAI). 320 CSS
  px equals 1280 px at 400%; 256 px tall; two-dimensional content excused
  but the content around it isn't; sticky bars at small sizes.
- **Understanding SC 1.4.12 Text Spacing**.
  https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html (W3C WAI).
  The 4 values; authors need not use them, only survive them; clipping,
  overlap and truncation as the usual failures.
- **Understanding SC 1.4.3 Contrast (Minimum)**.
  https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
  (W3C WAI). Large text as about 18.5 px bold or 24 px; ratios are never
  rounded (4.499 fails); disabled controls, logos and incidental text exempt;
  measure against the real background.
- **Understanding SC 2.2.1 Timing Adjustable**.
  https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html
  (W3C WAI). A disappearing toast is only in scope when its information
  isn't available another way; turn off, adjust or extend.
- **Understanding SC 2.3.3 Animation from Interactions**.
  https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
  (W3C WAI). Reduced motion is AAA, with C39 (prefers-reduced-motion) as a
  sufficient technique; why ignoring it is reported as a design system issue.
- **WCAG-EM 2.0: Website Accessibility Conformance Evaluation Methodology**,
  W3C Group Note, 23 July 2026. https://www.w3.org/TR/WCAG-EM/ (W3C). Scope,
  structured sample of common screens, essential functionality and complete
  processes, used in SKILL.md step 1.

## WAI-ARIA Authoring Practices Guide (W3C WAI)

- **Read Me First**. https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/
  "No ARIA is better than bad ARIA"; roles add no keyboard behaviour; the
  examples need testing with assistive technology before use.
- **Dialog (Modal) Pattern**. https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
  Initial focus choices, Tab wrapping, Escape, focus return, `aria-modal`
  only when the page behind is really blocked, naming.
- **Disclosure (Show/Hide) Pattern**. https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
  Button, Enter and Space, `aria-expanded`; the disclosure navigation menu
  example.
- **Menu Button Pattern**. https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
  `aria-haspopup`, `aria-expanded`, opening keys.
- **Menu and Menubar Pattern**. https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
  Arrow keys, Home and End, Escape returns focus, Tab leaves and closes.
- **Tabs Pattern**. https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
  Roles, `aria-selected`, Tab into the active tab, arrows, automatic versus
  manual activation.
- **Switch Pattern**. https://www.w3.org/WAI/ARIA/apg/patterns/switch/
  `aria-checked`, Space, a label that doesn't change with state.
- **Combobox Pattern**. https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
  Referenced for custom selects; the checks listed are the pattern's core
  keyboard and state requirements.

## Tools

- **axe-core API documentation**. https://github.com/dequelabs/axe-core/blob/develop/doc/API.md
  (Deque Systems). The `runOnly` tags (`wcag2a`, `wcag2aa`, `wcag21a`,
  `wcag21aa`, `wcag22aa`, `best-practice`); violations versus incomplete
  ("needs review"); axe aims to minimise false positives.
- **axe-core rule descriptions** (version 4.14).
  https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
  (Deque Systems). `target-size` is the only `wcag22aa` rule and is off by
  default, which is why the pass names the tag; no rule for focus visible,
  focus order or traps; `region` is best practice.
- **axe Auditor: Impact Levels**. https://docs.deque.com/auditor/2.29/en/impact_levels
  (Deque Systems). The shape of the severity scale in `triage.md`.
- **Playwright: Accessibility testing**. https://playwright.dev/docs/accessibility-testing
  (Microsoft). Automated tests find only some problems and need manual
  testing alongside; the WCAG tags; the risks of `exclude` and
  `disableRules`, which this skill forbids for getting a clean run.
- **Playwright: ARIA snapshots**. https://playwright.dev/docs/aria-snapshots
  (Microsoft). `locator.ariaSnapshot()` and its YAML format, used by the
  pass for the accessibility tree.
- **Keyboard focusable scrollers**. https://developer.chrome.com/blog/keyboard-focusable-scrollers
  (Chrome for Developers). From Chrome 130, scroll boxes with no focusable
  children are focusable by default; why axe's
  `scrollable-region-focusable` can flag something Chromium users can reach.
- **ARIA live regions**. https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions
  (MDN). Put the live region in the page before updating it; `role="alert"`
  is usually read even when inserted with content; `aria-atomic`.
- **The dialog element**. https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
  (MDN). `showModal()` makes the rest of the page inert and closes on
  Escape; `autofocus` for first focus.

## How much automated tools find

- **"Automated testing study identifies 57 percent of digital accessibility
  issues"**, 10 March 2021.
  https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues
  (Deque Systems). 57% of issues by count across over 2,000 audits, 13,000
  pages and nearly 300,000 issues, using axe. A vendor study counting issues
  by volume, which is why the skill names who measured it and how.
- **"What we found when we tested tools on the world's least-accessible
  webpage"**, Mehmet Duran, 24 February 2017.
  https://accessibility.blog.gov.uk/2017/02/24/what-we-found-when-we-tested-tools-on-the-worlds-least-accessible-webpage/
  (GOV.UK Accessibility blog). 143 barriers; best single tool 41%; all 10
  tools together 71%; tools work best with manual testing.
- **The WebAIM Million, 2026 report**. https://webaim.org/projects/million/
  (WebAIM). The most common detected failures (low contrast text on 83.9% of
  home pages, missing alt text, missing labels, empty links and buttons);
  pages with ARIA averaged more detected errors; no detected errors doesn't
  mean accessible. Background for the false negatives list.

## Screen reader steps

- **Turn on and practise VoiceOver on iPhone**.
  https://support.apple.com/en-gb/guide/iphone/iph3e2e415f/ios (Apple).
  Settings > Accessibility > VoiceOver; the Accessibility Shortcut.
- **Learn VoiceOver gestures on iPhone**.
  https://support.apple.com/en-gb/guide/iphone/iph3e2e2281/ios (Apple).
  Swipe right for the next item, double tap to activate.
- **Use the VoiceOver rotor on iPhone**.
  https://support.apple.com/en-gb/guide/iphone/iph3e2e3a6d/ios (Apple).
  Rotate two fingers like a dial.

## Skill format

- **Skill authoring best practices**.
  https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
  (Anthropic). Name and description rules (third person, what and when),
  SKILL.md kept short with references one level deep, tables of contents in
  long references, copyable checklists, scripts for deterministic checks.

## obvious (this repo)

- `src/primitives.json`: `control.tap-min` (44px), control heights times
  `--ds-density`, the focus ring width, offset and style.
- `src/base.css`: the shared `:focus-visible` ring in `--ds-color-accent` and
  the global reduced-motion rule.
- `scripts/contrast.mjs` and `docs/contrast.md`: the theme pairs measured,
  their thresholds, the failing pairs and suggested colours.
- `registry/obvious/Sheet.tsx`, `PlusMenu.tsx`, `Toasts.tsx` and
  `src/components/tooltip.css`: what `patterns.md` says to check in each.
- `.claude/skills/engineer/references/standards/accessibility.md`: the
  building rules this skill builds on and doesn't repeat.

## Trial run

The pass and the manual snippets were run on obvious's built docs site
(`node web/build.mjs`, served on port 4352) on 2026-10-18, with axe-core
4.14.0 and Playwright 1.56.1 borrowed read-only from another app's
`node_modules`, and on a local test page built to fail each check (no focus
ring, a sticky footer covering a button, 16 px buttons side by side, a fixed
900 px box, a clipped fixed-height box, an infinite animation, a field that
blocks paste). Every check reported what the test page was built to fail.
