/* The site's behaviour: the theme picker, the values that change with the
   theme, copy buttons and the component demos. THEMES is prepended by
   build.mjs. */
import { mountBootRing, checkMorph, shake, cycleThink, shuffle, revealOnScroll } from "/assets/obvious/js/behaviours.js";

const root = document.documentElement;
const $ = (id) => document.getElementById(id);
const value = (name) => getComputedStyle(root).getPropertyValue(name).trim();

/* ---- theme ------------------------------------------------------------ */
const select = $("theme-select");
select.value = root.getAttribute("data-ds-theme");

function setTheme(name) {
  if (!THEMES.some((t) => t.name === name)) return;
  root.setAttribute("data-ds-theme", name);
  window.__obMode?.();
  select.value = name;
  try {
    localStorage.setItem("obvious-theme", name);
  } catch {}
  /* One frame, so the new variables have resolved before they're read back. */
  requestAnimationFrame(paintValues);
}
select.addEventListener("change", () => setTheme(select.value));
document.querySelectorAll("[data-set-theme]").forEach((b) =>
  b.addEventListener("click", () => setTheme(b.dataset.setTheme)),
);

/* Anything whose text is a live token value in the current theme. */
function paintValues() {
  document.querySelectorAll("[data-token]").forEach((el) => (el.textContent = value(el.dataset.token)));
  const base = parseFloat(value("--ds-radius-base"));
  document.querySelectorAll("[data-radius]").forEach((el) => {
    el.textContent = `${Math.round(base * parseFloat(el.dataset.radius) * 100) / 100}px`;
  });
  document.querySelectorAll("[data-type-meta]").forEach((el) => {
    const role = el.dataset.typeMeta;
    const sample = document.querySelector(`[data-role="${role}"]`);
    const size = sample ? Math.round(parseFloat(getComputedStyle(sample).fontSize) * 10) / 10 : "";
    el.textContent = `${size}px, leading ${value(`--ds-type-${role}-leading`)}, weight ${value(`--ds-type-${role}-weight`)}`;
  });
}
paintValues();
window.addEventListener("resize", () => requestAnimationFrame(paintValues));
document.fonts?.ready.then(paintValues);

/* ---- menu ------------------------------------------------------------- */
const menu = $("menu-btn");
const nav = $("nav");
menu.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  menu.setAttribute("aria-expanded", String(open));
});

/* ---- copy buttons ----------------------------------------------------- */
document.querySelectorAll(".code .copy").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.previousElementSibling.textContent);
      btn.textContent = "Copied";
    } catch {
      btn.textContent = "Couldn't copy";
    }
    setTimeout(() => (btn.textContent = "Copy"), 1600);
  });
});

/* ---- motion runs ------------------------------------------------------ */
document.querySelectorAll("[data-run]").forEach((btn) => {
  const runs = btn.previousElementSibling;
  btn.addEventListener("click", () => {
    const rows = runs.querySelectorAll(".run-row");
    rows.forEach((r) => r.classList.remove("is-running"));
    void runs.offsetWidth;
    rows.forEach((r) => r.classList.add("is-running"));
    setTimeout(() => rows.forEach((r) => r.classList.remove("is-running")), 1400);
  });
});

/* ---- component demos -------------------------------------------------- */
const PHRASES = [
  "Thinking…", "Moving it 2px left…", "Renaming the layers…",
  "Checking the contrast…", "Asking why again…", "Undoing that…",
];
if ($("think")) cycleThink($("think"), shuffle(PHRASES), { pool: PHRASES });

document.querySelectorAll("[data-chips]").forEach((row) => {
  row.querySelectorAll(".t-chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      row.querySelectorAll(".t-chip").forEach((c) => c.classList.remove("is-on"));
      chip.classList.add("is-on");
    }),
  );
});

if ($("boot")) {
  const el = $("boot");
  let ring = mountBootRing(el);
  $("replay-boot").addEventListener("click", () => {
    el.classList.remove("is-running");
    ring.destroy();
    ring = mountBootRing(el, { start: false });
    void el.offsetWidth;
    ring.start();
  });
}

if ($("gateWrap")) {
  const pw = $("gatePw");
  const morph = checkMorph($("gateBadge"), $("gateBlur"));
  $("gateWrap").addEventListener("submit", (e) => {
    e.preventDefault();
    if (pw.value.trim().toLowerCase() === "obvious") {
      $("gateArrow").hidden = true;
      $("gateBlur").hidden = false;
      morph.spin();
      setTimeout(() => morph.done(2400), 700);
      setTimeout(() => {
        $("gateBlur").hidden = true;
        $("gateArrow").hidden = false;
        pw.value = "";
      }, 4200);
    } else {
      shake($("gateField"), $("gateWrap"));
      pw.select();
    }
  });
}

if ($("soloBadge")) {
  const solo = checkMorph($("soloBadge"), $("soloBlur"));
  $("replay-check").addEventListener("click", () => {
    solo.spin();
    setTimeout(() => solo.done(2600), 650);
  });
}

if ($("reveal-demo")) {
  $("replay-reveal").addEventListener("click", () => {
    const items = [...$("reveal-demo").querySelectorAll(".t-reveal")];
    items.forEach((el) => el.classList.remove("in"));
    void items[0].offsetWidth;
    revealOnScroll($("reveal-demo"));
  });
}

if ($("stagger")) {
  const s = $("stagger");
  const btn = $("replay-stagger");
  btn.addEventListener("click", () => {
    if (s.classList.contains("is-shown")) {
      s.classList.replace("is-shown", "is-hiding");
      btn.textContent = "Show";
    } else {
      s.classList.remove("is-hiding");
      void s.offsetWidth;
      s.classList.add("is-shown");
      btn.textContent = "Hide";
    }
  });
  setTimeout(() => btn.click(), 400);
}

if ($("badge")) {
  const badge = $("badge");
  const pop = () => {
    badge.setAttribute("data-open", "false");
    setTimeout(() => badge.setAttribute("data-open", "true"), 250);
  };
  $("replay-badge").addEventListener("click", pop);
  setTimeout(pop, 400);
}
