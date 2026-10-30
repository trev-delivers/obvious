/**
 * Every page on the site, as data. build.mjs wraps each one in the layout.
 *
 * A page is { path, group, nav, title, description, body }. Pages without a
 * nav label still get built, they just don't appear in the sidebar.
 */

import { esc, code, head, section, table } from "./html.mjs";
import { pixelPages } from "./pixel.mjs";
import { effectsPage } from "./effects.mjs";

const tok = (name) => `<code>${esc(name)}</code>`;
const entries = (o) => Object.entries(o).filter(([k]) => k !== "$comment");

/* The colour tokens in the order a reader thinks about them. */
const COLOUR_GROUPS = [
  ["Ground", ["bg", "bg-alt", "surface", "surface-raised", "surface-hover"]],
  ["Line", ["border-subtle", "border", "border-strong"]],
  ["Ink", ["text", "text-dim", "text-muted", "text-inverse"]],
  ["Accent", ["accent", "accent-hover", "accent-alt", "accent-contrast", "accent-gradient"]],
  ["Signal", ["success", "warning", "danger", "info"]],
  ["Shadow and selection", ["shadow-color", "shadow-highlight", "selection-bg", "selection-text"]],
];

/* ---- components ------------------------------------------------------ */

const INLINE_LOADING = (id, label = "Checking") => `<span class="ob-inline-loading" id="${id}" data-state="active" role="status" aria-label="${label}">
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle class="ob-inline-loading-track" cx="12" cy="12" r="10"/>
    <circle class="ob-inline-loading-arc" cx="12" cy="12" r="10" pathLength="100"/>
    <circle class="ob-inline-loading-disc" cx="12" cy="12" r="11"/>
    <path class="ob-inline-loading-tick" d="M7.5 12.5l3 3 6-6.5" pathLength="1"/>
  </svg>
</span>`;

const SPINNER = `<span class="ob-spinner" role="status" aria-label="Loading">
  <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
</span>`;

const ARROW = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;

const COMPONENTS = [
  {
    slug: "button",
    cls: "ob-button",
    title: "Button",
    what: "Primary for the one thing you want people to press, secondary beside it, and ghost for quiet actions. Height follows the theme's density and the corners follow its radius.",
    demo: `<button class="ob-button" type="button">Save changes</button>
<button class="ob-button ob-button--secondary" type="button">Cancel</button>
<button class="ob-button ob-button--ghost" type="button">Skip</button>
<button class="ob-button ob-button--icon" type="button" aria-label="Next">${ARROW}</button>
<button class="ob-button" type="button" id="busyBtn"><span>Send</span>${INLINE_LOADING("busyLoading", "Sending")}</button>`,
    hint: "Press Send to see it loading.",
    usage: `<button class="ob-button" type="button">Save changes</button>
<button class="ob-button ob-button--secondary" type="button">Cancel</button>
<button class="ob-button ob-button--ghost" type="button">Skip</button>
<button class="ob-button ob-button--icon" type="button" aria-label="Next"><svg>…</svg></button>

<!-- sizes -->
<button class="ob-button ob-button--sm">…</button>
<button class="ob-button ob-button--lg">…</button>

<!-- loading: the label keeps its space -->
<button class="ob-button" aria-busy="true">
  <span>Send</span>
  <span class="ob-inline-loading" data-state="active">…</span>
</button>`,
    notes: "Every size is at least 44px tall so it's easy to tap. Use a real <code>&lt;button&gt;</code>, or an <code>&lt;a&gt;</code> when it goes somewhere. The inline loading inside only shows while <code>aria-busy</code> is true.",
  },
  {
    slug: "field",
    cls: "ob-field",
    title: "Field",
    what: "A label, a text input or select, and a message underneath. On a wrong answer the box shakes and the message turns into the error, then it clears after 3 seconds.",
    demo: `<form class="demo-form" id="gateForm" autocomplete="off" novalidate>
  <div class="ob-field" id="gateField">
    <label class="ob-field-label" for="gatePw">Password</label>
    <div class="ob-input">
      <input id="gatePw" type="password" autocomplete="off" spellcheck="false" aria-describedby="gateErr gateHint">
      <button type="submit" class="ob-button ob-button--icon ob-button--sm" id="gateBtn" aria-label="Enter">
        <span id="gateArrow">${ARROW}</span>
        ${INLINE_LOADING("gateLoading")}
      </button>
    </div>
    <p class="ob-field-message ob-field-message--error" id="gateErr">Not that one.</p>
    <p class="ob-field-message" id="gateHint">It's the name of this thing.</p>
  </div>
  <div class="ob-field">
    <label class="ob-field-label" for="clocks">Clocks</label>
    <div class="ob-select">
      <select id="clocks">
        <option>Anywhere with DST</option>
        <option>The UK and Europe</option>
        <option>Nowhere, thankfully</option>
      </select>
    </div>
  </div>
</form>`,
    usage: `<div class="ob-field">
  <label class="ob-field-label" for="pw">Password</label>
  <div class="ob-input">
    <input id="pw" type="password" aria-describedby="pw-error">
  </div>
  <p class="ob-field-message ob-field-message--error" id="pw-error">Not that one.</p>
</div>

<div class="ob-field">
  <label class="ob-field-label" for="clocks">Clocks</label>
  <div class="ob-select"><select id="clocks">…</select></div>
</div>`,
    js: `import { shakeField } from "obvious/behaviours";

shakeField(fieldEl); // on a wrong answer`,
    notes: "Add <code>.is-invalid</code> to the field yourself if you'd rather it stayed red until fixed. The error colour is <code>--ob-field-error</code>, the theme's danger by default.",
  },
  {
    slug: "inline-loading",
    cls: "ob-inline-loading",
    title: "Inline loading",
    what: "A small spinner that turns into a tick when it's done, in the same spot, so the answer lands where the tap was. The tick is the theme's success colour.",
    demo: `${INLINE_LOADING("soloLoading")}
<button class="ob-button ob-button--secondary ob-button--sm" id="replay-check" type="button">Finish</button>`,
    usage: INLINE_LOADING("saving", "Saving"),
    js: `import { inlineLoading } from "obvious/behaviours";

const loading = inlineLoading(el);
loading.start();
loading.finish(2000); // tick for 2s, then back to the spinner. 0 keeps the tick.`,
  },
  {
    slug: "spinner",
    cls: "ob-spinner",
    title: "Spinner",
    what: "8 dots in a ring with a bright one running round. It's a line of text tall and takes the text colour.",
    demo: `${SPINNER}
<span class="demo-inline">${SPINNER} Loading your finds</span>`,
    usage: SPINNER,
    notes: "It's all CSS, so there's nothing to start or stop. Remove it when the thing has loaded.",
  },
  {
    slug: "loading-text",
    cls: "ob-loading-text",
    title: "Loading text",
    what: "A line that says what's happening while you wait, with a brighter band passing through it. Pair it with the spinner.",
    demo: `<span class="demo-inline">${SPINNER}<span class="ob-loading-text" id="think" role="status">
  <span class="ob-loading-text-sizer" aria-hidden="true"></span>
  <span class="ob-loading-text-phrase">Thinking…</span>
</span></span>`,
    usage: `<span class="ob-loading-text" role="status">
  <span class="ob-loading-text-sizer" aria-hidden="true"></span>
  <span class="ob-loading-text-phrase">Thinking…</span>
</span>`,
    js: `import { cycleLoadingText, shuffle } from "obvious/behaviours";

const stop = cycleLoadingText(el, shuffle(phrases), { pool: phrases });`,
    notes: "The sizer holds the width of the longest phrase, so nothing beside it moves when the phrase changes.",
  },
  {
    slug: "gradient-text",
    cls: "ob-gradient-text",
    title: "Gradient text",
    what: "Gold, with the light moving slowly across it. It's the same gold in every theme. Use it on 1 or 2 words a page.",
    demo: `<p class="demo-display">I make complicated products feel <span class="ob-gradient-text">obvious</span>.</p>`,
    usage: `<span class="ob-gradient-text">obvious</span>`,
  },
  {
    slug: "confetti",
    cls: "ob-confetti",
    title: "Confetti",
    what: "Gold confetti that pops off a button, tumbles back down and settles on top of it. Each flake catches the light as it turns.",
    demo: `<span class="ob-confetti" id="confetti">
  <canvas class="ob-confetti-canvas" aria-hidden="true"></canvas>
  <button class="ob-button ob-button--lg" type="button" style="--ob-button-radius:var(--ds-radius-full)">Celebrate</button>
</span>`,
    hint: "Press it a few times.",
    usage: `<span class="ob-confetti">
  <canvas class="ob-confetti-canvas" aria-hidden="true"></canvas>
  <a class="ob-button" href="mailto:…">Email me</a>
</span>`,
    js: `import { mountConfetti } from "obvious/behaviours";

const stop = mountConfetti(el); // bursts on every click of the button inside`,
    notes: "The golds are the same as Gradient text's. It needs room above the button to rise into, which the canvas takes without moving anything. Under reduced motion it doesn't play.",
  },
  {
    slug: "link",
    cls: "ob-link",
    title: "Link",
    what: "Muted text with a fine underline, and both take the accent on hover.",
    demo: `<a class="ob-link" href="/tokens/colour">A text link</a>
<a class="ob-link ob-link--strong" href="/tokens/colour">A stronger one</a>
<a class="ob-link ob-gradient-text" href="/tokens/colour">A gold one</a>`,
    usage: `<a class="ob-link" href="…">A text link</a>
<a class="ob-link ob-link--strong" href="…">A stronger one</a>`,
    notes: "<code>--strong</code> is for a link that's the main thing to do on the page.",
  },
  {
    slug: "chip",
    cls: "ob-chip",
    title: "Chip",
    what: "One of a row of options where one is on, like filters or a picker. Type comes from wherever it sits.",
    demo: `<div class="demo-chips" data-chips>
  <button class="ob-chip" type="button" aria-pressed="true">Work</button>
  <button class="ob-chip" type="button" aria-pressed="false">About</button>
  <button class="ob-chip" type="button" aria-pressed="false">Contact</button>
</div>
<div class="demo-chips" data-chips>
  <button class="ob-chip ob-chip--outline" type="button" aria-pressed="true" style="--ob-chip-radius:var(--ds-radius-sm)">UK</button>
  <button class="ob-chip ob-chip--outline" type="button" aria-pressed="false" style="--ob-chip-radius:var(--ds-radius-sm)">Europe</button>
  <button class="ob-chip ob-chip--outline" type="button" aria-pressed="false" style="--ob-chip-radius:var(--ds-radius-sm)">US</button>
</div>`,
    usage: `<button class="ob-chip" type="button" aria-pressed="true">Work</button>
<button class="ob-chip" type="button" aria-pressed="false">About</button>

<button class="ob-chip ob-chip--outline" type="button" aria-pressed="false">UK</button>`,
    notes: "<code>aria-pressed</code> marks the one that's on, so screen readers hear it too. <code>.is-selected</code> works where that doesn't fit, like a link. <code>--ob-chip-radius</code> and <code>--ob-chip-pad</code> change the shape.",
  },
  {
    slug: "reveal",
    cls: "ob-reveal",
    title: "Reveal",
    what: "Things fading up as they scroll into view, a list arriving in order. If the script doesn't run, everything just shows.",
    demo: `<div class="demo-reveal" id="reveal-demo">
  <span class="ob-reveal">Ketchup</span>
  <span class="ob-reveal">Kewpie mayonnaise</span>
  <span class="ob-reveal">Henderson's Relish</span>
</div>
<button class="ob-button ob-button--secondary ob-button--sm" id="replay-reveal" type="button">Replay</button>`,
    usage: `<ul>
  <li class="ob-reveal">Ketchup</li>
  <li class="ob-reveal">Kewpie mayonnaise</li>
</ul>`,
    js: `import { revealOnScroll, splitWords, revealWords } from "obvious/behaviours";

const stop = revealOnScroll(document);
revealWords(splitWords(heading)); // a heading, word by word`,
  },
  {
    slug: "stagger",
    cls: "ob-stagger",
    title: "Stagger",
    what: "The contents of something that's just opened, arriving one after another, like the lines in a tooltip or the rows in a menu.",
    demo: `<div class="ob-stagger demo-stagger" id="stagger">
  <p>Hick's law</p>
  <p>More choices, slower decisions.</p>
</div>
<button class="ob-button ob-button--secondary ob-button--sm" id="replay-stagger" type="button">Open</button>`,
    usage: `<div class="ob-stagger is-open">
  <p>Hick's law</p>
  <p>More choices, slower decisions.</p>
</div>`,
    notes: "Add <code>.is-open</code> to play it. It staggers up to 7 children, and any after that arrive with the 7th.",
  },
  {
    slug: "badge",
    cls: "ob-badge",
    title: "Badge",
    what: "A count on a button or tab, like unread messages. It pops in when there's something new and shrinks away at zero.",
    demo: `<button class="ob-button ob-button--secondary ob-badge-host" type="button" id="inbox" aria-label="Inbox">Inbox <span class="ob-badge" id="badge" data-visible="false" aria-hidden="true">3</span></button>
<button class="ob-button ob-button--ghost ob-button--sm" id="replay-badge" type="button">New message</button>`,
    usage: `<button class="ob-badge-host" type="button" aria-label="Inbox, 3 unread">
  Inbox <span class="ob-badge" data-visible="true" aria-hidden="true">3</span>
</button>`,
    notes: "Set <code>data-visible</code> to <code>false</code> to take it away. Put the count in the button's accessible name too, because the badge itself is hidden from screen readers.",
  },
  {
    slug: "tooltip",
    cls: "ob-tooltip",
    title: "Tooltip",
    what: "A short label that shows on hover or keyboard focus, for icon buttons and anything else that needs a word of explanation.",
    demo: `<span class="ob-tooltip-host">
  <button class="ob-button ob-button--secondary" type="button" aria-describedby="tip-1">Inspect</button>
  <span class="ob-tooltip" role="tooltip" id="tip-1">Shows the tokens</span>
</span>`,
    usage: `<span class="ob-tooltip-host">
  <button type="button" aria-describedby="tip-1">Inspect</button>
  <span class="ob-tooltip" role="tooltip" id="tip-1">Shows the tokens</span>
</span>`,
    notes: "It sits above, centred. <code>.ob-tooltip--start</code> and <code>--end</code> line it up with an edge instead, for triggers near the side of the screen.",
  },
];

/* ---- pages ----------------------------------------------------------- */

/* The Claude skills I build with. Written out by hand because most of them
   live in other repos, and because their text stays private: it names the
   family and the gaps still open in each app. The page shows what each one
   is for and nothing else, so there's nothing in the page to download. */
const SKILLS = [
  {
    name: "engineer",
    title: "Engineer",
    what: "The senior engineer on my projects. I can't read code, so it does the reviewing and testing too: runs the checks before and after, opens every page at phone and desktop width, and reports back in plain words with screenshots. It can audit a whole app on its own and only tell me what it could prove.",
    inside: "standards for shipping, security, data, front end, accessibility and design, a page on each of my repos and what not to break in it, the audit routine, and a script that scans for broken design rules.",
    used: "Every app",
  },
  {
    name: "figma-to-code",
    title: "Figma to code",
    what: "I design in Figma and build with Claude, and the handoff was always where it went wrong: hex values copied from the frame, a layout that worked at one width, no idea what happens when a list is empty. This builds the screen from my design system instead. It matches every value in the frame to a token and tells me which ones have no match, makes it work on a phone and a laptop, then screenshots what it built next to Figma's render and fixes what's off.",
    inside: "a 9-step checklist, a script that matches Figma values to tokens, a script that compares screenshots, and notes on responsive layout, states and accessibility.",
    used: "Any app on obvious, with Figma's MCP server",
  },
  {
    name: "design-system-guardian",
    title: "Design system guardian",
    what: "Keeps new screens made from obvious. Before it writes any CSS it finds the app's theme and reaches for a token or a component that already exists. It runs my audit before and after, and every value that goes around the system is either swapped for its token or written down with a measured reason. The first time I ran it, it found an app passing its own audit at 0 that the current audit put at 52.",
    inside: "a checklist, the order to build from, the audit read line by line, rules for exceptions and budgets, when something belongs in obvious itself, and 2 scripts: one reads an app's setup, one finds the nearest token for a value.",
    used: "Every app on obvious",
  },
  {
    name: "a11y-review",
    title: "Accessibility review",
    what: "Checks a page against WCAG 2.2 AA the way a decent tester would. Automated tools find some of the problems and none of the judgement calls, so after the measured pass it goes through with a keyboard, a narrow screen, bigger text spacing and the screen reader's view, and checks dialogs and menus against how they're meant to behave. It throws out what the tools got wrong and tells me who each problem stops.",
    inside: "a measured pass script, the manual checks for WCAG 2.2 AA including everything new in 2.2, the ARIA patterns for common widgets, severity rules, known false positives and a report template.",
    used: "Before a new screen, form or flow ships",
  },
  {
    name: "design-critique",
    title: "Design critique",
    what: "Feedback the way a good design lead gives it in a crit. It writes down what the screen is for and who it's for first, and says when it's guessing. Then it opens the app at phone and desktop width, clicks through the flow and makes the empty, loading and error states appear. Findings are ranked by how much they get in the way of the task, with what's working and plain taste kept separate.",
    inside: "a goal-first procedure, 12 things to look at tied to obvious's tokens, a screenshot script, ways to make every state appear, and Nielsen's severity scale.",
    used: "Any screen, flow or prototype",
  },
  {
    name: "ux-writing",
    title: "UX writing",
    what: "Content design with no voice of its own, so it uses whatever voice guide a product already has. It covers what goes on a button, how an error says what went wrong and how to fix it, when a confirm dialog earns its place, alt text and labels that work with a screen reader, and copy that survives translation. A script pulls every string out of an app so the copy can be read without opening the code.",
    inside: "patterns for every common interface string, readability research, accessibility text, inclusive language, writing for translation, a term list and the string-finding script.",
    used: "Any app with words on screen",
  },
];

const PADLOCK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>`;

export function pages({ pkg, primitives, registry, themes, knobs }) {
  const core = themes.find((t) => t.name === "core");
  const tokenCount =
    Object.keys(core.dial).length + Object.keys(core.font).length + Object.keys(core.color).length;
  const family = themes.filter((t) => t.family);
  const outside = themes.filter((t) => !t.family);

  const themeCard = (t) => `<a class="theme-card" href="/themes/${t.name}" data-ds-theme="${t.name}">
  <span class="theme-card-top">
    <span class="theme-icon" aria-hidden="true">${t.icon}</span>
    <span class="theme-card-app">${esc(t.app)}</span>
  </span>
  <span class="theme-card-name">${esc(t.label)}</span>
  <span class="theme-card-strip" aria-hidden="true">${["surface", "text", "accent", "accent-alt"]
    .map((k) => `<span style="background:var(--ds-color-${k})"></span>`)
    .join("")}</span>
  <span class="theme-card-faces">${esc(t.fontName.display)} and ${esc(t.fontName.sans)}</span>
</a>`;

  const out = [];

  /* Overview -------------------------------------------------------- */
  out.push({
    path: "/",
    group: "",
    nav: "Overview",
    title: "Obvious",
    body: `
${head(
  "The design system behind everything I ship",
  `6 apps on 4 different stacks. They can't share a component library: one's a static site, one keeps its styles in a template string, two are Next on Tailwind, and one's a script that draws an SVG. So they share tokens instead.`,
)}
${section(
  "What every app shares",
  `<p>Spacing, the <a class="ob-link" href="/tokens/type">type scale</a>, line heights, <a class="ob-link" href="/tokens/motion">motion</a>, focus rings, shadow shape, control heights and z-index layers. These live in <code>src/primitives.json</code> and are identical in every app. Change one and all 6 sites change with it.</p>`,
)}
${section(
  "What each app changes",
  `<p>Colour, its type pair, <code>--ds-radius-base</code> and <code>--ds-density</code>. All 5 <a class="ob-link" href="/tokens/radius">radius steps</a> are worked out from the base, so Brookwood sets 4px and gets near-square paper while Condimental sets 16px and gets soft cards. Density does the same for control heights and padding.</p>
<p>Every theme declares the same ${tokenCount} tokens. The build fails if one is missing, so a theme can't drop a token and inherit whatever the last one left behind.</p>`,
)}
${section(
  "The themes",
  `<div class="theme-grid">${themes.map(themeCard).join("")}</div>`,
)}
${section(
  "What's in it",
  `<p>${themes.length} <a class="ob-link" href="/themes">themes</a>, ${COMPONENTS.length} <a class="ob-link" href="/components">CSS components</a> with a small behaviours module for the parts CSS can't do, and ${registry.items.length} <a class="ob-link" href="/react">React components</a> served as a shadcn registry. There's also a Tailwind v4 bridge, a shadcn bridge, a JS export of every token for canvas and OG images, and an <a class="ob-link" href="/audit">audit script</a> that counts how much of an app goes around the system.</p>
<p>The <a class="ob-link" href="/skills">Claude skills</a> I build with are here too.</p>
<p><a class="ob-link ob-link--strong" href="/start">Add it to an app</a></p>`,
)}`,
  });

  /* Getting started ------------------------------------------------- */
  out.push({
    path: "/start",
    group: "",
    nav: "Getting started",
    title: "Getting started",
    description: "Add obvious to an app: plain CSS, Tailwind v4, or the sync script.",
    body: `
${head("Getting started", "Every app loads the primitives and one theme. The rest is optional.")}
${section(
  "Apps built with npm",
  `<p>Install it from a pinned commit or tag, then import the primitives and the app's theme.</p>
${code(`import "obvious/css/primitives.css";
import "obvious/css/themes/core.css";
import "obvious/css/base.css";        // optional
import "obvious/css/components.css";  // optional`)}`,
)}
${section(
  "Apps that don't use npm",
  `<p>The static site and the README card generator carry a copy of <code>scripts/sync-ds.mjs</code> and a generated <code>ds/</code> folder. <code>ds/.version</code> does the job of a lockfile.</p>
${code(`node scripts/sync-ds.mjs               # pull main into ds/
node scripts/sync-ds.mjs --ref v0.2.0  # pin a tag
node scripts/sync-ds.mjs --check       # CI: fail if ds/ is stale
DS_LOCAL=../obvious node scripts/sync-ds.mjs   # from a local checkout`)}
${code(`<link rel="stylesheet" href="ds/css/primitives.css">
<link rel="stylesheet" href="ds/css/themes/core.css">
<link rel="stylesheet" href="ds/css/base.css">`)}`,
)}
${section(
  "Tailwind v4",
  `${code(`@import "tailwindcss";
@import "../../ds/css/primitives.css";
@import "../../ds/css/themes/parchment.css";
@import "../../ds/tailwind/theme.css";`)}
<p>The bridge only adds. It gives you <code>bg-surface</code>, <code>text-ink-muted</code>, <code>rounded-ds-lg</code>, <code>ease-ds-out</code> and <code>shadow-ds-md</code>, all reading <code>--ds-*</code> at runtime, and leaves Tailwind's own scales alone. The first version mapped onto <code>--spacing-*</code>, and <code>max-w-md</code> became 16px. Tailwind's spacing scale isn't mapped at all, so use <code>var(--ds-space-md)</code> when you want a step.</p>
<p>It does take over <code>--font-sans</code> and <code>--font-mono</code>, so the app's utilities use the theme's faces.</p>`,
)}
${section(
  "base.css",
  `<p>Opt-in, and sets no colour or layout. It's the behaviours every app was rewriting: box sizing, focus rings, <code>::selection</code>, balanced headings, and a reduced-motion block that zeroes delay as well as duration. Staggered entrances lean on delay, so zeroing only the duration leaves people looking at an empty screen.</p>`,
)}
${section(
  "Components",
  `${code(`@import "../ds/css/components.css";       /* all of them */
@import "../ds/css/components/field.css";  /* or just the one */`)}
<p>The parts CSS can't do are in one dependency-free module. Each function returns a teardown or a small control object, which is the shape a React effect wants.</p>
${code(`import { cycleLoadingText } from "obvious/behaviours";

useEffect(() => cycleLoadingText(ref.current, phrases), []);`)}`,
)}
${section(
  "Tokens in JS",
  `<p>For anything that can't read a stylesheet: the README card, OG images, canvas and WebGL.</p>
${code(`import { tokens } from "obvious/tokens";

tokens.themes.core["--ds-color-accent"]; // "${core.color.accent}"`)}`,
)}
${section(
  "Working on obvious itself",
  `${code(`npm run build   # regenerate dist/ and this site
npm run check   # fail if dist/ isn't committed up to date
npm run site:serve   # this site on localhost:4321`)}
<p><code>dist/</code> is committed because apps copy it with no build step of their own.</p>`,
)}`,
  });

  /* Colour ---------------------------------------------------------- */
  const swatch = (k) => `<div class="swatch" id="ds-color-${k}">
  <span class="swatch-fill" style="background:var(--ds-color-${k})"></span>
  <span class="swatch-cap"><span class="swatch-name">${k}</span><span class="swatch-val" data-token="--ds-color-${k}"></span></span>
</div>`;

  out.push({
    path: "/tokens/colour",
    group: "Tokens",
    nav: "Colour",
    title: "Colour",
    description: "The colour tokens every theme sets.",
    body: `
${head("Colour", `Every theme sets the same ${Object.keys(core.color).length} colours. These are the current theme's.`)}
${COLOUR_GROUPS.map(([title, keys]) =>
  section(title, `<div class="swatches">${keys.map(swatch).join("")}</div>`),
).join("")}
${section(
  "Across the themes",
  `<div class="table-wrap"><table class="matrix"><thead><tr><th scope="col">Token</th>${themes
    .map((t) => `<th scope="col"><a class="ob-link" href="/themes/${t.name}">${esc(t.label)}</a></th>`)
    .join("")}</tr></thead><tbody>${COLOUR_GROUPS.flatMap(([, keys]) => keys)
    .map(
      (k) =>
        `<tr><th scope="row">${tok(`--ds-color-${k}`)}</th>${themes
          .map(
            (t) =>
              `<td><span class="chip-swatch" style="background:${esc(t.color[k])}" title="${esc(t.color[k])}"></span></td>`,
          )
          .join("")}</tr>`,
    )
    .join("")}</tbody></table></div>`,
)}
${section(
  "The 2 that don't change",
  `<p>Gradient text keeps its own gold and the check badge keeps its green. The first should look the same everywhere it appears. The second is a success signal, and a tick that changes colour per app stops reading at a glance.</p>`,
)}`,
  });

  /* Type ------------------------------------------------------------ */
  const ROLES = [
    ["h1", "display", "I make complicated products feel obvious."],
    ["h2", "display", "How much of your time has gone missing?"],
    ["h3", "display", "A gallery of good taste"],
    ["lead", "sans", "Case studies, side projects and the design systems work. 12 years across fintech, broadcast and consumer apps."],
    ["body", "sans", "A calculator and a field guide to the hours that policy, physics and space weather have taken from you. Daylight saving takes an hour each spring and gives most of it back each autumn. Relativity takes much less, and keeps it."],
    ["ui", "sans", "Rate this condiment"],
    ["label", "sans", "Best before"],
    ["mono", "sans", "Current streak 41 days, longest 118"],
  ];
  const t = primitives.type;
  out.push({
    path: "/tokens/type",
    group: "Tokens",
    nav: "Type",
    title: "Type",
    description: "One type scale for every app, set by role.",
    body: `
${head("Type", "One scale for every app. Size, leading, tracking and weight come as a set per role, so a heading can't end up with body leading by accident.")}
${section(
  "The roles",
  `<div class="specimens">${ROLES.map(
    ([role, face, text]) => `<div class="spec">
  <p class="spec-meta"><span>${role === "mono" ? "figures" : role}</span> <span data-type-meta="${role}"></span></p>
  <p class="spec-sample" data-role="${role}" style="font-family:var(--ds-font-${face});font-size:var(--ds-type-${role}-size);line-height:var(--ds-type-${role}-leading);letter-spacing:var(--ds-type-${role}-tracking);font-weight:var(--ds-type-${role}-weight)${role === "mono" ? ";font-variant-numeric:tabular-nums" : ""}">${esc(text)}</p>
</div>`,
  ).join("")}</div>`,
)}
${section(
  "Values",
  table(
    ["Role", "Size", "Leading", "Tracking", "Weight"],
    ROLES.map(([role]) => [
      role === "mono" ? "figures (mono)" : role,
      tok(t[`${role}-size`]),
      t[`${role}-leading`],
      t[`${role}-tracking`],
      t[`${role}-weight`],
    ]),
  ) +
    `<p>Use the role, for example <code>--ds-type-h2-size</code> with <code>--ds-type-h2-leading</code>, rather than the loose sizes below.</p>`,
)}
${section(
  "Sizes",
  table(
    ["Token", "Value"],
    entries(primitives.text).map(([k, v]) => [tok(`--ds-text-${k}`), esc(v)]),
  ),
)}
${section(
  "Faces",
  `<p>Each theme has a pair: <code>--ds-font-display</code> for headings and <code>--ds-font-sans</code> for everything else. There's no monospace. The <code>mono</code> slot points at the text face so old code still renders, and figures use <code>font-variant-numeric: tabular-nums</code>.</p>
<p>Labels are sentence case, in the text face, at the label role, with no tracking. Positive tracking is for real acronyms set in capitals.</p>
${table(
  ["Theme", "Display", "Text"],
  themes.map((th) => [
    `<a class="ob-link" href="/themes/${th.name}">${esc(th.label)}</a>`,
    `<span style="font-family:${esc(th.font.display)}">${esc(th.fontName.display)}</span>`,
    `<span style="font-family:${esc(th.font.sans)}">${esc(th.fontName.sans)}</span>`,
  ]),
)}`,
)}`,
  });

  /* Space and size -------------------------------------------------- */
  out.push({
    path: "/tokens/space",
    group: "Tokens",
    nav: "Space and size",
    title: "Space and size",
    description: "Spacing, layout widths and control heights.",
    body: `
${head("Space and size", "A 4px scale, the same in every app. Pick the nearest step rather than adding a value.")}
${section(
  "Spacing",
  `<div class="scale">${entries(primitives.space)
    .map(
      ([k, v]) =>
        `<div class="scale-row"><span class="scale-key">${tok(`--ds-space-${k}`)}</span><span class="scale-bar" style="width:${v}"></span><span class="scale-val">${v}</span></div>`,
    )
    .join("")}</div>`,
)}
${section(
  "Fluid spacing",
  `<p>For vertical rhythm between sections. The phone size is already generous, and wider screens get a bit more.</p>` +
    table(["Token", "Value"], entries(primitives["space-fluid"]).map(([k, v]) => [tok(`--ds-space-fluid-${k}`), esc(v)])),
)}
${section(
  "Layout",
  table(
    ["Token", "Value"],
    [
      [tok("--ds-gutter"), esc(primitives.gutter)],
      [tok("--ds-measure"), esc(primitives.measure)],
      [tok("--ds-container"), esc(primitives.container)],
    ],
  ),
)}
${section(
  "Controls",
  `<p>Heights and padding are multiplied by the theme's <code>--ds-density</code>. A dashboard might set 0.9. Tap targets stay at least 44px whatever the density.</p>` +
    table(
      ["Token", "Value", ""],
      entries(primitives.control).map(([k, v]) => [
        tok(`--ds-control-${k}`),
        esc(v),
        k.startsWith("height")
          ? `<span class="control-demo" style="height:var(--ds-control-${k})"></span>`
          : "",
      ]),
    ),
)}
${section(
  "Borders and focus",
  table(
    ["Token", "Value"],
    [
      ...entries(primitives.border).map(([k, v]) => [tok(`--ds-border-${k}`), esc(v)]),
      ...entries(primitives.focus).map(([k, v]) => [tok(`--ds-focus-${k}`), esc(v)]),
    ],
  ) +
    `<p>One focus ring everywhere. It takes the theme's accent, so it's the same ring on parchment as on near-black. Tab through this page to see it.</p>`,
)}`,
  });

  /* Radius ---------------------------------------------------------- */
  const mult = { xs: 0.25, sm: 0.5, md: 1, lg: 1.5, xl: 2.5 };
  out.push({
    path: "/tokens/radius",
    group: "Tokens",
    nav: "Radius",
    title: "Radius",
    description: "5 radius steps worked out from one number per theme.",
    body: `
${head("Radius", `Each theme sets <code>--ds-radius-base</code> and the 5 steps are worked out from it, so the ratio between small and large is the same everywhere.`)}
${section(
  "Steps",
  `<p class="note">Base in this theme: <span data-token="--ds-radius-base"></span></p>
<div class="radii">${Object.keys(mult)
    .map(
      (k) =>
        `<div class="radius"><span class="radius-box" style="border-radius:var(--ds-radius-${k})"></span><span class="radius-key">${k}</span><span class="radius-val" data-radius="${mult[k]}"></span></div>`,
    )
    .join("")}</div>`,
)}
${section(
  "Values",
  table(["Token", "Value"], entries(primitives.radius).map(([k, v]) => [tok(`--ds-radius-${k}`), esc(v)])),
)}
${section(
  "Base by theme",
  table(
    ["Theme", "Base", ""],
    themes.map((th) => [
      `<a class="ob-link" href="/themes/${th.name}">${esc(th.label)}</a>`,
      th.dial["radius-base"],
      `<span class="radius-mini" style="border-radius:calc(${th.dial["radius-base"]} * 1.5)"></span>`,
    ]),
  ),
)}`,
  });

  /* Motion ---------------------------------------------------------- */
  out.push({
    path: "/tokens/motion",
    group: "Tokens",
    nav: "Motion",
    title: "Motion",
    description: "4 easing curves and 6 durations, the same in every app.",
    body: `
${head("Motion", "4 curves and 6 durations, the same in every app. Reduced motion is handled in base.css.")}
${section(
  "Curves",
  `<p><code>out</code> is the one for nearly everything. <code>spring</code> came from Brookwood, for things that should land with a bit of overshoot.</p>
<div class="runs" data-runs>${entries(primitives.ease)
    .map(
      ([k, v]) =>
        `<div class="run-row" id="ds-ease-${k}"><span class="run-key">${tok(`--ds-ease-${k}`)}</span><span class="track"><span class="puck" style="transition:transform var(--ds-duration-slower) var(--ds-ease-${k})"></span></span></div>`,
    )
    .join("")}</div>
<button class="demo-btn" type="button" data-run>Run the curves</button>
${table(["Token", "Value"], entries(primitives.ease).map(([k, v]) => [tok(`--ds-ease-${k}`), esc(v)]))}`,
)}
${section(
  "Durations",
  `<div class="runs" data-runs>${entries(primitives.duration)
    .map(
      ([k, v]) =>
        `<div class="run-row" id="ds-duration-${k}"><span class="run-key">${tok(`--ds-duration-${k}`)} <span class="run-val">${v}</span></span><span class="track"><span class="puck" style="transition:transform var(--ds-duration-${k}) var(--ds-ease-out)"></span></span></div>`,
    )
    .join("")}</div>
<button class="demo-btn" type="button" data-run>Run the durations</button>`,
)}`,
  });

  /* Shadow and layers ----------------------------------------------- */
  out.push({
    path: "/tokens/depth",
    group: "Tokens",
    nav: "Shadow and layers",
    title: "Shadow and layers",
    description: "Shadow shapes and z-index layers.",
    body: `
${head("Shadow and layers", "Every app shares the shadow shapes. The colour comes from the theme's <code>--ds-color-shadow-color</code>, which is why Brookwood's shadows are brown.")}
${section(
  "Shadows",
  `<div class="shadows">${entries(primitives.shadow)
    .map(
      ([k]) =>
        `<div class="shadow-item"><span class="shadow-box" style="box-shadow:var(--ds-shadow-${k})"></span>${tok(`--ds-shadow-${k}`)}</div>`,
    )
    .join("")}</div>` +
    table(["Token", "Value"], entries(primitives.shadow).map(([k, v]) => [tok(`--ds-shadow-${k}`), esc(v)])),
)}
${section(
  "Layers",
  table(["Token", "Value"], entries(primitives.z).map(([k, v]) => [tok(`--ds-z-${k}`), esc(v)])),
)}`,
  });

  /* Themes ---------------------------------------------------------- */
  out.push({
    path: "/themes",
    group: "Themes",
    nav: "All themes",
    title: "Themes",
    description: "Every theme in obvious, and the apps they're for.",
    body: `
${head("Themes", `${family.length} in the family and ${outside.length} outside it. A theme sets colour, a type pair, a radius base and a density. Everything else is shared.`)}
${section("The family", `<div class="theme-grid">${family.map(themeCard).join("")}</div>
<p>Family members take everything: the primitives, base.css, the type scale and the whole interaction layer.</p>`)}
${section("Outside the family", `<div class="theme-grid">${outside.map(themeCard).join("")}</div>
<p>Brookwood is the one app made for people who have never seen any of the others. It takes the primitives (spacing, type scale, motion, focus) and none of the shared components. No gradient text, no Pro button, no thinking shimmer, because those would make it look like part of a portfolio.</p>`)}
${section(
  "Dark sets",
  `<p>A theme can have a <code>dark</code> block. It can only override colours the theme already has, and it's used when the device is in dark mode. Set <code>data-ds-mode="light"</code> or <code>"dark"</code> on <code>&lt;html&gt;</code> to force one. ${
    themes.filter((x) => x.dark).map((x) => x.label).join(" and ") || "None"
  } has one so far.</p>`,
)}`,
  });

  for (const th of themes) {
    const swatchRow = (colors, mode = "") =>
      `<div class="scoped" data-ds-theme="${th.name}"${mode}>` +
      COLOUR_GROUPS.map(
        ([title, keys]) => `<div class="swatch-group"><p class="group-name">${title}</p><div class="swatches">${keys
          .map(
            (k) => `<div class="swatch">
  <span class="swatch-fill" style="background:${esc(colors[k])}"></span>
  <span class="swatch-cap"><span class="swatch-name">${k}</span><span class="swatch-val">${esc(colors[k])}</span></span>
</div>`,
          )
          .join("")}</div></div>`,
      ).join("") +
      `</div>`;

    out.push({
      path: `/themes/${th.name}`,
      group: "Themes",
      nav: th.label,
      title: `${th.label} theme`,
      description: th.description,
      body: `
${head(esc(th.label), esc(th.description))}
<div class="theme-actions">
  <button class="demo-btn" type="button" data-set-theme="${th.name}">Use ${esc(th.label)} for this site</button>
  ${th.family ? "" : `<span class="note">Outside the family</span>`}
</div>
<div class="stage" data-ds-theme="${th.name}">
  <div class="stage-icon" aria-hidden="true">${th.icon}</div>
  <p class="stage-app">${esc(th.app)}</p>
  <p class="stage-h">I make complicated products feel obvious.</p>
  <p class="stage-body">Daylight saving takes an hour each spring and gives most of it back each autumn.</p>
  <div class="stage-row">
    <button class="ob-button ob-button--sm" type="button">Save</button>
    <button class="ob-chip" type="button" aria-pressed="true">Work</button>
    <button class="ob-chip" type="button" aria-pressed="false">About</button>
    <a class="ob-link" href="#colours">A text link</a>
  </div>
</div>
${section(
  "Dials",
  table(
    ["Dial", "Value"],
    [
      [tok("--ds-radius-base"), th.dial["radius-base"]],
      [tok("--ds-density"), th.dial.density],
      [tok("--ds-font-display"), `<span style="font-family:${esc(th.font.display)}">${esc(th.fontName.display)}</span>`],
      [tok("--ds-font-sans"), `<span style="font-family:${esc(th.font.sans)}">${esc(th.fontName.sans)}</span>`],
    ],
  ),
)}
${section(th.dark ? "Light colours" : "Colours", swatchRow(th.color), "colours")}
${th.dark ? section("Dark colours", `<p>Used when the device is in dark mode.</p>${swatchRow({ ...th.color, ...th.dark }, ' data-ds-mode="dark"')}`) : ""}
${section(
  "Use it",
  code(`import "obvious/css/primitives.css";
import "obvious/css/themes/${th.name}.css";`) +
    (th.icon ? `<p>Its favicon is <code>icons/${th.name}.svg</code>.</p>` : ""),
)}`,
    });
  }

  /* Components ------------------------------------------------------ */
  out.push({
    path: "/components",
    group: "Components",
    nav: "All components",
    title: "Components",
    description: "The shared interaction layer: CSS components and the behaviours that drive them.",
    body: `
${head("Components", "The components every family app shares. Plain CSS with an <code>ob-</code> prefix, plus a small JS module for the parts CSS can't do.")}
<ul class="comp-list">${COMPONENTS.map(
      (c) =>
        `<li><a class="comp-name ob-link ob-link--strong" href="/components/${c.slug}">${esc(c.title)}</a> <code>.${c.cls}</code><p>${c.what}</p></li>`,
    ).join("")}</ul>
${section(
  "Loading them",
  code(`@import "obvious/css/components.css";          /* all of them */
@import "obvious/css/components/chip.css";     /* or one */`) +
    `<p>They're my own code, written on the tokens. Every behaviour reads its timing from the component's custom properties, so retiming one is a CSS change.</p>`,
)}`,
  });

  for (const c of COMPONENTS) {
    const k = knobs(c.slug);
    out.push({
      path: `/components/${c.slug}`,
      group: "Components",
      nav: c.title,
      title: c.title,
      description: c.what,
      body: `
${head(esc(c.title), c.what)}
<div class="stage stage--demo">
  <div class="demo">${c.demo}</div>
  ${c.hint ? `<p class="note">${esc(c.hint)}</p>` : ""}
</div>
${section("Markup", code(c.usage))}
${c.js ? section("Behaviour", code(c.js)) : ""}
${c.notes ? section("Notes", `<p>${c.notes}</p>`) : ""}
${section("CSS", code(`@import "obvious/css/components/${c.slug}.css";`))}
${
  k.length
    ? section(
        "Knobs",
        `<p>Set any of these on the component, or an ancestor, to change it.</p>` +
          table(["Property", "Default"], k.map(([n, v]) => [tok(n), esc(v)])),
      )
    : ""
}`,
    });
  }

  /* React ----------------------------------------------------------- */
  const items = registry.items;
  out.push({
    path: "/react",
    group: "React",
    nav: "Registry",
    title: "React components",
    description: "React components served as a shadcn registry.",
    body: `
${head("React components", `${items.length} components served as a shadcn registry. shadcn copies the source into your app, so each app owns its copy and takes updates when it runs <code>add</code> again.`)}
${section(
  "Adding one",
  code(`npx shadcn add ${registry.homepage}/r/sheet.json`) +
    `<p>Or add the registry to the app's <code>components.json</code> once and use the short name.</p>` +
    code(`"registries": { "@obvious": "${registry.homepage}/r/{name}.json" }`) +
    code(`npx shadcn add @obvious/sheet`) +
    `<p>Files land in <code>components/obvious/</code> and each <code>.tsx</code> imports its own CSS. Class names are <code>ob-*</code> and colours come from the theme. Size, radius and timing are <code>--ob-*</code> custom properties, so an app sets them on <code>:root</code> to match itself.</p>`,
)}
${items
  .map((it) =>
    section(
      esc(it.title),
      `<p>${esc(it.description)}</p>` +
        code(`npx shadcn add @obvious/${it.name}`) +
        (it.registryDependencies?.length
          ? `<p>Brings in ${it.registryDependencies.map((d) => `<code>${esc(d)}</code>`).join(", ")} too.</p>`
          : "") +
        "",
      it.name,
    ),
  )
  .join("")}
${section(
  "shadcn/ui",
  `<p>For dialogs, popovers and selects, use shadcn's own components. <code>obvious/shadcn/theme.css</code> points shadcn's variables at <code>--ds-*</code>, so they take the app's theme, dark set included. Import it after shadcn's globals. It needs a Tailwind app.</p>`,
)}`,
  });

  out.push(effectsPage());

  /* Audit ----------------------------------------------------------- */
  out.push({
    path: "/audit",
    group: "Tools",
    nav: "Audit",
    title: "Audit",
    description: "Count how much of an app uses obvious and how much goes around it.",
    body: `
${head("Audit", "The sync script's <code>--check</code> proves an app's copy is current. The audit shows whether anything uses it.")}
${section(
  "Running it",
  code(`npm run audit ../app-one ../app-two   # from here, across checkouts
node scripts/audit-ds.mjs             # from inside one app
node scripts/audit-ds.mjs --detail    # every finding, with file:line
node scripts/audit-ds.mjs --max 60    # exit 1 over budget, for CI`),
)}
${section(
  "What it counts",
  `<p>Adoption is which tokens and components an app uses, which registry items it has installed and how many of their <code>ob-*</code> classes it uses, and which theme it imports. It reads the theme and components from <code>ds/</code>, or from <code>node_modules/obvious</code> for an app that installs it from npm.</p>
<p>Bypass is everything that went around the system, with a line each for literal colours, durations, easing curves, font stacks, radii and px font sizes, monospace, eyebrows (capitals with letter-spacing), gradient text, and fonts loaded that the theme doesn't name. Bypass is the one to watch.</p>
<p>It won't reach zero. Icons need literal fills and Brookwood doesn't take the interaction layer. The aim is a small number that's going down, and <code>--max</code> is there so CI can hold it.</p>`,
)}
${section(
  "Exceptions",
  `<p>When something is meant to stay, say why in the app's <code>.ds-audit.json</code>. <code>ignore</code> excuses every category in those paths. An entry under <code>exceptions</code> excuses one category, and only counts if it has a note.</p>` +
    code(`{
  "ignore": ["tools/"],
  "note": "tools/ is a standalone preview harness.",
  "exceptions": {
    "gradient-text": { "ignore": ["src/hero.css"], "note": "The gold headline. I chose it." }
  }
}`) +
    `<p>Exceptions only hide findings. Tokens used in an ignored file still count towards adoption.</p>`,
)}`,
  });

  /* Skills ---------------------------------------------------------- */
  out.push({
    path: "/skills",
    group: "Skills",
    nav: "Claude skills",
    title: "Claude skills",
    description: "The instructions I've written for Claude so the code it writes for my apps holds up.",
    body: `
${head("Claude skills", "I can design but I can't code. These are the instructions I've written for Claude so what it builds for me holds up: the engineering, the handoff from Figma, the design system, accessibility, critique and the words. Every rule in them points to where it came from. They're set up for my own projects, so the downloads are locked.")}
<ul class="skill-list">${SKILLS.map(
      (s) => `<li class="skill">
  <h2 class="skill-name">${esc(s.title)}</h2>
  <p>${esc(s.what)}</p>
  <p class="skill-meta">In it: ${esc(s.inside)}</p>
  <p class="skill-meta">Used in: ${esc(s.used)}</p>
  <div class="skill-get">
    <button class="skill-lock" type="button" aria-disabled="true" aria-describedby="lock-${s.name}">${PADLOCK}<span>Download</span></button>
    <p class="note" id="lock-${s.name}" role="status">Locked</p>
  </div>
</li>`,
    ).join("")}</ul>
${section(
  "Asking for a copy",
  `<p>Ask me and I'll talk you through them. Figma to code is the one I'd start with.</p>`,
)}`,
  });

  out.push(...pixelPages());

  return out;
}
