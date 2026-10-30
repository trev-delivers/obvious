/* Wires up the Effects page with the same engine the React components use
   (registry/obvious/fx.ts, stripped to /assets/fx.js by build.mjs). Each block
   here does what the matching component in effects.tsx does in its effect. */
import { tilt, seal, waveField, maskUrl, scramble, glowCursor, watchGyroPermission, askGyro } from "/assets/fx.js";

/* Each one returns a teardown, as it would to a React effect. A static page
   never unmounts, so they're kept but never called. */
const teardowns = [];

/* HoloSurface */
document.querySelectorAll("[data-fx-surface]").forEach((el) => teardowns.push(tilt(el)));

/* Holo, from paths: a mask image, then the layers. */
function holo(paths, viewBox, width, strength, base) {
  const [, , vw, vh] = viewBox.split(" ").map(Number);
  const el = document.createElement("div");
  el.className = "ob-fx-holo";
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `--fx-holo-strength:${strength};--fx-holo-base:${base};aspect-ratio:${vw} / ${vh}`;
  el.innerHTML = `<div class="ob-fx-holo-base"></div><div class="ob-fx-holo-colour"><div class="ob-fx-holo-counter"><div class="ob-fx-holo-film"><div class="ob-fx-holo-bands"></div></div></div></div>`;
  const url = maskUrl(viewBox, paths, width);
  el.style.setProperty("--fx-mask", `url("${url}")`);
  el.setAttribute("data-ready", "");
  return { el, url };
}

/* Guilloche, seal and field. */
let urls = [];
const sealBox = document.querySelector("[data-fx-seal]");
const fieldBox = document.querySelector("[data-fx-field]");
function draw(seed) {
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls = [];
  const s = seal(seed, { rings: 3 });
  const layers = [...s.rings, s.border];
  sealBox.replaceChildren(
    ...layers.map((d, n) => {
      const ring = document.createElement("div");
      ring.className = "ob-fx-guilloche-ring";
      ring.dataset.spin = n % 2 ? "reverse" : "normal";
      ring.style.setProperty("--fx-depth", (n * 0.5).toFixed(2));
      ring.style.setProperty("--fx-spin", `${n === s.rings.length ? 420 : 260 - n * 30}s`);
      const h = holo(d, s.viewBox, 0.85, n === 0 ? 1 : 0.4, n === 0 ? 0.17 : 0.09);
      urls.push(h.url);
      ring.append(h.el);
      return ring;
    }),
  );
  const f = holo(waveField(seed), "0 0 856 540", 1.6, 0.4, 0.08);
  urls.push(f.url);
  fieldBox.replaceChildren(f.el);
}

/* The name drives the seal and the glowing name. */
const input = document.getElementById("fxName");
const name = document.querySelector(".ob-fx-demo-name");
function setName() {
  const who = input.value.trim() || "Guest";
  name.querySelector(".ob-fx-glow-ink").textContent = who;
  name.querySelector(".ob-fx-sheen-text").textContent = who;
  draw(who.toLowerCase());
}
let typing = 0;
input.addEventListener("input", () => {
  clearTimeout(typing);
  typing = setTimeout(setName, 120);
});
setName();

/* The iPhone tilt button. */
const ask = document.getElementById("fxTilt");
teardowns.push(watchGyroPermission((needed) => (ask.hidden = !needed)));
ask.addEventListener("click", () => {
  askGyro();
  ask.hidden = true;
});

/* EncryptedText. The component does this with React state; here it's attributes. */
document.querySelectorAll("[data-fx-enc]").forEach((el) => {
  const letters = Array.from(el.querySelector(".ob-fx-enc-letters").children);
  teardowns.push(
    scramble({
      text: el.querySelector(".ob-fx-sr").textContent,
      delay: 4000,
      onStep: (g, lit) =>
        letters.forEach((l, i) => {
          if (g[i]) l.setAttribute("data-g", g[i]);
          else l.removeAttribute("data-g");
          l.toggleAttribute("data-lit", lit[i]);
        }),
    }),
  );
});

/* GlowCursor */
teardowns.push(glowCursor(document.querySelector(".ob-fx-cursor")));

