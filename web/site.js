/* The site's behaviour: the theme picker, the values that change with the
   theme, copy buttons and the component demos. THEMES is prepended by
   build.mjs. */
import { inlineLoading, shakeField, cycleLoadingText, shuffle, revealOnScroll, mountConfetti } from "/assets/obvious/js/behaviours.js";

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
if ($("think")) cycleLoadingText($("think"), shuffle(PHRASES), { pool: PHRASES });

document.querySelectorAll("[data-chips]").forEach((row) => {
  const chips = row.querySelectorAll(".ob-chip");
  chips.forEach((chip) =>
    chip.addEventListener("click", () => chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)))),
  );
});

if ($("busyBtn")) {
  const btn = $("busyBtn");
  const loading = inlineLoading($("busyLoading"));
  btn.addEventListener("click", () => {
    if (btn.getAttribute("aria-busy") === "true") return;
    btn.setAttribute("aria-busy", "true");
    loading.start();
    setTimeout(() => loading.finish(), 1200);
    setTimeout(() => btn.removeAttribute("aria-busy"), 2400);
  });
}

if ($("gateForm")) {
  const pw = $("gatePw");
  const btn = $("gateBtn");
  const loading = inlineLoading($("gateLoading"));
  $("gateForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (pw.value.trim().toLowerCase() === "obvious") {
      $("gateField").classList.remove("is-invalid");
      btn.setAttribute("aria-busy", "true");
      loading.start();
      setTimeout(() => loading.finish(), 700);
      setTimeout(() => {
        btn.removeAttribute("aria-busy");
        pw.value = "";
      }, 2600);
    } else {
      shakeField($("gateField"));
      pw.select();
    }
  });
}

if ($("soloLoading")) {
  const solo = inlineLoading($("soloLoading"));
  $("replay-check").addEventListener("click", () => {
    solo.start();
    setTimeout(() => solo.finish(2600), 650);
  });
}

if ($("reveal-demo")) {
  const replay = () => {
    const items = [...$("reveal-demo").querySelectorAll(".ob-reveal")];
    items.forEach((el) => el.classList.remove("is-visible"));
    void items[0].offsetWidth;
    revealOnScroll($("reveal-demo"));
  };
  $("replay-reveal").addEventListener("click", replay);
  replay();
}

if ($("stagger")) {
  const s = $("stagger");
  const btn = $("replay-stagger");
  btn.addEventListener("click", () => {
    const open = s.classList.toggle("is-open");
    btn.textContent = open ? "Close" : "Open";
  });
  setTimeout(() => btn.click(), 400);
}

if ($("badge")) {
  const badge = $("badge");
  const inbox = $("inbox");
  let count = 0;
  const pop = () => {
    count++;
    badge.textContent = String(count);
    badge.setAttribute("data-visible", "true");
    inbox.setAttribute("aria-label", `Inbox, ${count} unread`);
  };
  inbox.addEventListener("click", () => {
    count = 0;
    badge.setAttribute("data-visible", "false");
    inbox.setAttribute("aria-label", "Inbox");
  });
  $("replay-badge").addEventListener("click", pop);
  setTimeout(pop, 400);
}

/* ---- skills ----------------------------------------------------------- */
document.querySelectorAll(".skill-lock").forEach((btn) => {
  const note = document.getElementById(btn.getAttribute("aria-describedby"));
  btn.addEventListener("click", () => {
    note.textContent = "Locked. Ask me if you'd like a look.";
    btn.classList.remove("is-nudged");
    void btn.offsetWidth;
    btn.classList.add("is-nudged");
  });
});

if ($("confetti")) mountConfetti($("confetti"));
