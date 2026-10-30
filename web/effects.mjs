/**
 * The Effects page. The demos are the same markup the React components in
 * registry/obvious/effects.tsx render, driven by the same engine (fx.ts),
 * which build.mjs strips to plain JS for the site. web/effects.js wires them
 * up.
 */
import { readFileSync } from "node:fs";
import { esc, code, head, section, table } from "./html.mjs";

const tok = (name) => `<code>${esc(name)}</code>`;

/* ---- the same markup as effects.tsx --------------------------------- */

const surface = (inner, cls = "") => `<div class="ob-fx-surface" data-fx-surface>
  <div class="ob-fx-surface-tilt ${cls}">${inner}<span class="ob-fx-surface-light" aria-hidden="true"><span></span></span><span class="ob-fx-surface-rim" aria-hidden="true"></span></div>
</div>`;

const glowText = (text, tag = "span", cls = "") => `<${tag} class="ob-fx-glow-text ${cls}" data-fx-glow>
<span class="ob-fx-glow" aria-hidden="true"></span><span class="ob-fx-glow-ink">${esc(text)}</span><span class="ob-fx-sheen" aria-hidden="true"><span class="ob-fx-sheen-band"><span class="ob-fx-sheen-text">${esc(text)}</span></span></span>
</${tag}>`;

const encrypted = (text, cls = "") =>
  `<span class="ob-fx-enc ${cls}" data-fx-enc><span class="ob-fx-sr">${esc(text)}</span><span class="ob-fx-enc-letters" aria-hidden="true">${Array.from(text)
    .map((c) => `<span>${esc(c)}</span>`)
    .join("")}</span></span>`;

const borderLight = (inner, block = false) =>
  `<span class="ob-fx-border-light${block ? " is-block" : ""}">${inner}<span class="ob-fx-border-light-ring" aria-hidden="true"><span></span></span></span>`;

/* Holo with SVG children: a key, drawn in strokes. */
const KEY = `<circle cx="16" cy="32" r="10" fill="none" stroke="black" stroke-width="1.6"/><circle cx="16" cy="32" r="4" fill="none" stroke="black" stroke-width="1.2"/><path d="M26 32h30M46 32v8M52 32v6" fill="none" stroke="black" stroke-width="1.6" stroke-linecap="round"/>`;
const FILM = [1, 2, 3, 4, 5, 6, 1];
const holoSvg = (id, viewBox, children) => {
  const [vx, vy, vw, vh] = viewBox.split(" ").map(Number);
  const box = (k) => `x="${vx - vw * k}" y="${vy - vh * k}" width="${vw * (1 + 2 * k)}" height="${vh * (1 + 2 * k)}"`;
  return `<svg class="ob-fx-holo ob-fx-holo-svg" viewBox="${viewBox}" style="--fx-holo-strength:1;--fx-holo-base:0.12;aspect-ratio:${vw} / ${vh}" aria-hidden="true" focusable="false">
<defs>
<linearGradient id="${id}-film" gradientUnits="userSpaceOnUse" x1="${vx}" y1="${vy}" x2="${vx + vw * 0.21}" y2="${vy + vw * 0.05}" spreadMethod="repeat">${FILM.map((n, i) => `<stop offset="${i / (FILM.length - 1)}" style="stop-color:var(--fx-film-${n})"/>`).join("")}</linearGradient>
<radialGradient id="${id}-light"><stop offset="0" stop-color="white" stop-opacity="1"/><stop offset="0.35" stop-color="white" stop-opacity="0.6"/><stop offset="0.7" stop-color="white" stop-opacity="0.18"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient>
<mask id="${id}-lines" style="mask-type:alpha"><g fill="white" stroke="white">${children}</g></mask>
<mask id="${id}-lit" style="mask-type:alpha"><rect class="ob-fx-holo-svg-light" ${box(0.3)} fill="url(#${id}-light)"/></mask>
</defs>
<g class="ob-fx-holo-base">${children}</g>
<g class="ob-fx-holo-colour" mask="url(#${id}-lines)"><g mask="url(#${id}-lit)"><rect class="ob-fx-holo-svg-bands" ${box(0.5)} fill="url(#${id}-film)"/></g></g>
</svg>`;
};

/* ---- the knobs, read from effects.css ------------------------------- */

function tokens() {
  const css = readFileSync(new URL("../registry/obvious/effects.css", import.meta.url), "utf8");
  const block = css.match(/:where\(:root\)\s*\{([\s\S]*?)\n\}/)[1].replace(/\/\*[\s\S]*?\*\//g, "");
  return [...block.matchAll(/(--fx-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]);
}

const props = (rows) => table(["Prop", "Default", "What it does"], rows.map(([p, d, w]) => [tok(p), d ? tok(d) : "", w]));

/* ---- the page ------------------------------------------------------- */

const CARD = surface(
  `<div class="ob-fx-demo-field ob-fx-guilloche" data-fx-field></div>
<div class="ob-fx-demo-seal ob-fx-guilloche" data-fx-seal style="aspect-ratio:1" aria-hidden="true"></div>
<div class="ob-fx-demo-type">
  <span class="ob-fx-demo-mark">${encrypted("Guest pass")}</span>
  <span class="ob-fx-demo-holder"><span class="ob-fx-demo-k">${encrypted("Holder")}</span>${glowText("Alex Morgan", "span", "ob-fx-demo-name")}</span>
  <span class="ob-fx-demo-details">
    <span><span class="ob-fx-demo-k">${encrypted("Access")}</span><span class="ob-fx-demo-v">${encrypted("Guest")}</span></span>
    <span><span class="ob-fx-demo-k">${encrypted("Valid to")}</span><span class="ob-fx-demo-v">${encrypted("Sun 2 Nov")}</span></span>
  </span>
</div>`,
  "ob-fx-demo-card",
);

export function effectsPage() {
  return {
    path: "/effects",
    group: "React",
    nav: "Effects",
    title: "Effects",
    description: "The light and movement from the Morris OS key card, as pieces an app can opt into for special moments.",
    body: `
<link rel="stylesheet" href="/assets/effects.css">
${head(
  "Effects",
  "The light and movement from the guest key card in our household app, taken apart so other apps can use the pieces. An app has to opt in, and they're only for special moments.",
)}
<div class="stage stage--demo ob-fx-demo-stage" data-ds-theme="core">
  ${CARD}
  <div class="ob-fx-demo-controls">
    <div class="ob-field">
      <label class="ob-field-label" for="fxName">Name on the card</label>
      <div class="ob-input"><input id="fxName" type="text" value="Alex Morgan" maxlength="22" autocomplete="off" spellcheck="false" aria-describedby="fxNameHint"></div>
      <p class="ob-field-message" id="fxNameHint">The seal is made from the name, so it changes as you type.</p>
    </div>
    <button class="ob-button ob-button--secondary ob-button--sm" type="button" id="fxTilt" hidden>Tilt to see the hologram</button>
  </div>
  <p class="note">Move the mouse over it, drag it with a finger, or tilt your phone.</p>
</div>
${section(
  "When to use them",
  `<p>I made the key card for friends staying with us. It's the first thing they see, so it was worth the effort. That's the sort of place these are for: a guest's key card, a welcome screen, or one hero element. They don't belong on everyday screens, and I'd keep it to 1 or 2 on a screen.</p>
<p>They bend 2 of the rules on purpose. They glow, and the hologram is a run of colours that shifts as you move. Gradient text is still out (the sheen is solid letters seen through a moving band), and so are capitals with letter-spacing and any face outside the theme's pair. The key card does have tracked capitals, but that was a Morris OS decision and they aren't in here.</p>`,
)}
${section(
  "Adding them",
  code(`npx shadcn add @obvious/effects`) +
    `<p>That brings in <code>effects.tsx</code>, <code>effects.css</code> and <code>fx.ts</code>, which is the engine with no React in it. Nothing else is needed.</p>` +
    code(`import { HoloSurface, Guilloche, GlowText, EncryptedText } from "@/components/obvious/effects";

<HoloSurface className="card">
  <Guilloche seed={\`\${guest.name}|\${guest.until}\`} />
  <GlowText>{guest.name}</GlowText>
  <EncryptedText text="Valid to Sun 2 Nov" />
</HoloSurface>`),
)}
${section(
  "HoloSurface",
  `<p>Leans towards the mouse, a finger or the tilt of the phone. It reads the pointer on a wrapper that never moves, and eases with a spring that can't overshoot, so it doesn't jolt. With nobody touching it, it drifts slowly. It stops working while it's off screen.</p>
<p>Anything inside can follow it with 4 custom properties: ${tok("--fx-x")} and ${tok("--fx-y")} run from -1 to 1, ${tok("--fx-m")} is how far it's leaning and ${tok("--fx-a")} is which way. <code>className</code> goes on the part that tilts, so that's your card.</p>` +
    props([
      ["tilt", "8", "How far it leans sideways, in degrees. Up and down is three quarters of that."],
      ["perspective", "1100", "In px."],
      ["drift", "true", "Drift slowly when nobody's touching it."],
      ["gyro", "true", "Follow the phone's tilt."],
      ["light", "true", "A highlight that moves across it, and a lit edge on the side facing the light."],
    ]) +
    `<p>iPhones send no tilt until someone taps to allow it. <code>useGyroPermission</code> says when to offer the button: only on a touch screen that hasn't sent a reading after a moment, so nobody on a laptop sees it.</p>` +
    code(`const gyro = useGyroPermission();

{gyro.needed && <button onClick={gyro.ask}>Tilt to see the hologram</button>}`),
)}
${section(
  "Holo",
  `<p>Thin-film colour, like the hologram on a bank card. The lines are drawn faintly, and the colour only shows on them, where the light falls. It moves with the HoloSurface it's in. Give it SVG paths and their viewBox, an image whose shape is the mask, or SVG as children.</p>
<div class="stage stage--demo" data-ds-theme="core">${surface(`<div class="ob-fx-demo-key">${holoSvg("fxKey", "0 0 64 64", KEY)}</div>`, "ob-fx-demo-tile")}</div>` +
    code(`<Holo viewBox="0 0 64 64">
  <circle cx="16" cy="32" r="10" fill="none" stroke="black" strokeWidth={1.6} />
  <path d="M26 32h30M46 32v8M52 32v6" fill="none" stroke="black" strokeWidth={1.6} />
</Holo>`) +
    props([
      ["paths", "", "SVG path data, one string or a list."],
      ["viewBox", "0 0 100 100", "For paths and children."],
      ["strokeWidth", "1", "For paths."],
      ["src", "", "An image to use as the mask instead."],
      ["children", "", "SVG to use as the mask instead. Its own colours don't matter."],
      ["strength", "1", "How strong the colour is, 0 to 1."],
      ["base", "0.12", "How strong the faint lines are, 0 to 1."],
    ]),
)}
${section(
  "Guilloche",
  `<p>A seal like the pattern on a banknote, drawn from a seed. The same seed gives the same seal every time, on the server and on the phone, so a guest's name and dates can make theirs. The rings turn against each other very slowly, so the pattern between them shifts. <code>variant="field"</code> draws fine waves across the whole card instead.</p>
<p>It draws with its own sine, because Safari's and Node's can differ in the last decimal place and the server's seal has to match the phone's. <code>seal()</code> and <code>waveField()</code> are exported for anything that wants the paths.</p>` +
    code(`<Guilloche seed="alex morgan|2026-11-02" rings={3} />
<Guilloche seed="alex morgan" variant="field" />

const { rings, border, viewBox } = seal("alex morgan", { rings: 5 });`) +
    props([
      ["seed", "", "Any string."],
      ["variant", "seal", "seal, or field for waves across the whole box."],
      ["rings", "3", "1 to 12."],
      ["spin", "true", "Turn the rings very slowly."],
      ["depth", "0.5", "How far the outer rings slide against the inner ones as it tilts."],
      ["options", "", "inner, spread, lobes, curves, points and border, for seal()."],
      ["width, height", "856, 540", "The field's size in its own units. That's a bank card."],
    ]),
)}
${section(
  "EncryptedText",
  `<p>Now and then a word flips to symbols and comes back. Each letter stays where it was under its symbol, so nothing moves. Only 1 word on the page runs at a time, and none in the first 4 seconds, so it never fights whatever's arriving. Screen readers just get the word.</p>
<div class="stage stage--demo"><p class="ob-fx-demo-line">${encrypted("Your room is ready")}</p></div>` +
    code(`<EncryptedText text="Your room is ready" delay={4000} />`) +
    props([
      ["text", "", "The words."],
      ["delay", "4000", "No encrypting before this many ms."],
      ["glyphs", "✱ ◆ ▮ ◇ ▪", "The symbols to use."],
      ["as", "span", "span, p, h1, h2, h3 or strong."],
    ]),
)}
${section(
  "GlowText",
  `<p>A soft glow drifting behind a few words, and a sheen through them every 9 seconds. The letters stay solid in the theme's text colour, so contrast is what it was without it. Pick another theme at the top to see it on a light one.</p>
<div class="stage stage--demo">${glowText("Welcome in", "p", "ob-fx-demo-hero")}</div>` +
    code(`<GlowText as="h1">Welcome in</GlowText>`) +
    props([
      ["children", "", "The words, as a string."],
      ["as", "span", "span, p, h1, h2, h3 or strong."],
      ["sheen", "true", "The light passing through."],
    ]),
)}
${section(
  "BorderLight",
  `<p>A slow light going round a border. Use it on the 1 button or card that matters most on the screen. Set <code>radius</code> to match what's inside.</p>
<div class="stage stage--demo"><div class="demo">${borderLight(`<button class="ob-button" type="button">Let yourself in</button>`)}</div></div>` +
    code(`<BorderLight radius="var(--ob-button-radius)">
  <button className="ob-button">Let yourself in</button>
</BorderLight>`) +
    props([
      ["radius", "var(--ds-radius-md)", "Any CSS length."],
      ["block", "false", "Fill the width, for a card."],
    ]),
)}
${section(
  "GlowCursor",
  `<p>A soft light follows the mouse, and hairline borders marked <code>data-fx-rim</code> light up as it comes near. It's on this page now. Phones and tablets get nothing, and neither does anyone who's asked for less motion. It draws the rim with the element's <code>::after</code>, so pick elements that aren't already using it.</p>
<div class="stage stage--demo"><div class="ob-fx-demo-rims">${["Wifi", "Dinner", "Music", "House rules"]
      .map((t) => `<div class="ob-fx-demo-rim" data-fx-rim>${t}</div>`)
      .join("")}</div></div>` +
    code(`<GlowCursor />

<div className="card" data-fx-rim>Wifi</div>`) +
    props([["reach", "220", "How near the mouse has to be, in px."]]),
)}
${section(
  "Colours and timing",
  `<p>The hologram is the same blue-violet in every theme, the way the golds are. Set any of these on <code>:root</code> to change it. The glow on letters, the sheen and lit edges are mixed with the theme's text colour where they're used, so they still show on a light theme.</p>` +
    table(["Property", "Default"], tokens().map(([n, v]) => [tok(n), `<span class="ob-fx-demo-swatch"${v.startsWith("#") ? ` style="--c:${esc(v)}"` : ""}></span>${esc(v)}`])),
)}
${section(
  "Less motion",
  `<p>If someone's asked for less motion, everything stays still in its finished state. The card sits flat, words don't encrypt, there's no sheen, the glow cursor stays off and the light on a border stops at the top right.</p>`,
)}
<div class="ob-fx-cursor" aria-hidden="true"></div>
<script type="module" src="/assets/effects.js"></script>`,
  };
}
