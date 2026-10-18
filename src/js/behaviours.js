/**
 * Behaviours for the components that cannot be done in CSS alone.
 *
 * Dependency-free ES modules, no framework. Each one takes a DOM element and
 * returns either a teardown function or a small control object, which is
 * exactly the shape a React effect wants:
 *
 *   useEffect(() => cycleLoadingText(ref.current, phrases), []);
 *
 * Every function reads its timing from the component's own CSS custom
 * properties rather than hard-coding it, so retiming a component is still a
 * CSS change and the two can never disagree.
 */

/** Parses a CSS time value ("250ms", "0.4s") into milliseconds. */
export function cssMs(value, fallback) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return fallback;
  return /ms\s*$/.test(String(value).trim()) ? n : n * 1000;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Drives an ob-inline-loading.
 *
 *   const loading = inlineLoading(el);
 *   loading.start();
 *   loading.finish(2000); // tick for 2s, then back to the spinner. 0 keeps the tick.
 */
export function inlineLoading(el) {
  if (!el) return { start() {}, finish() {}, destroy() {} };
  let timer;
  const start = () => {
    clearTimeout(timer);
    el.setAttribute("data-state", "active");
  };
  const finish = (hold = 0) => {
    clearTimeout(timer);
    el.setAttribute("data-state", "finished");
    if (hold > 0) timer = setTimeout(start, hold);
  };
  return { start, finish, destroy: () => clearTimeout(timer) };
}

/**
 * Marks an ob-field as wrong: shakes the box and shows the error message,
 * then clears both after --ob-field-hold (3s by default). Calling it again
 * while it's showing shakes again and restarts the clock.
 */
export function shakeField(field) {
  if (!field) return;
  const box = field.querySelector(".ob-input, .ob-select");
  field.classList.add("is-invalid");
  if (box && !prefersReducedMotion()) {
    box.classList.remove("is-shaking");
    void box.offsetWidth;
    box.classList.add("is-shaking");
    box.addEventListener("animationend", () => box.classList.remove("is-shaking"), { once: true });
  }
  const hold = cssMs(getComputedStyle(field).getPropertyValue("--ob-field-hold"), 3000);
  clearTimeout(field._obHold);
  if (hold > 0) field._obHold = setTimeout(() => field.classList.remove("is-invalid"), hold);
}

/**
 * Cycles an ob-loading-text through phrases. Returns a stop function.
 *
 * The sizer gets the longest phrase in the pool, so the line is the right
 * width from the start even if a longer phrase comes up later.
 */
export function cycleLoadingText(el, phrases, { pool = phrases } = {}) {
  const phrase = el?.querySelector(".ob-loading-text-phrase");
  const sizer = el?.querySelector(".ob-loading-text-sizer");
  if (!phrase || !phrases?.length) return () => {};
  if (sizer && pool?.length) sizer.textContent = pool.reduce((a, b) => (b.length > a.length ? b : a));
  phrase.textContent = phrases[0];
  if (phrases.length < 2) return () => {};

  const cs = getComputedStyle(el);
  const hold = cssMs(cs.getPropertyValue("--ob-loading-text-hold"), 1400);
  const swap = cssMs(cs.getPropertyValue("--ob-loading-text-swap"), 180);
  let i = 0;
  let timer;
  const next = () => {
    i = (i + 1) % phrases.length;
    phrase.classList.add("is-leaving");
    timer = setTimeout(() => {
      phrase.textContent = phrases[i];
      phrase.classList.remove("is-leaving");
      phrase.classList.add("is-arriving");
      void phrase.offsetWidth;
      phrase.classList.remove("is-arriving");
      timer = setTimeout(next, hold);
    }, swap);
  };
  timer = setTimeout(next, hold);
  return () => clearTimeout(timer);
}

/** Fisher-Yates, for phrase pools that should not repeat their order. */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Shows .ob-reveal elements as they scroll into view, staggering siblings.
 *
 * Sets .ob-motion on <html> first, which is what lets the CSS hide them, so
 * if this never runs nothing is stuck invisible. With no
 * IntersectionObserver, or with reduced motion, everything shows at once.
 */
export function revealOnScroll(root = document, { selector = ".ob-reveal", threshold = 0.2, step = 90 } = {}) {
  const els = [...root.querySelectorAll(selector)];
  if (!els.length) return () => {};

  if (typeof IntersectionObserver === "undefined" || prefersReducedMotion()) {
    els.forEach((el) => el.classList.add("is-visible"));
    return () => {};
  }
  document.documentElement.classList.add("ob-motion");

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const siblings = [...(entry.target.parentElement?.children ?? [])].filter((n) => els.includes(n));
        const index = Math.max(0, siblings.indexOf(entry.target));
        setTimeout(() => entry.target.classList.add("is-visible"), index * step);
        io.unobserve(entry.target);
      });
    },
    { threshold },
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/**
 * Wraps a heading's words in .ob-reveal-word spans so they can arrive one at a time.
 *
 * Punctuation that followed a word with no space is marked --tail and stays
 * inline, so the browser's line-breaking rules keep it attached rather than
 * stranding it at the start of the next line.
 */
export function splitWords(el, { tail = /^[.,;:!?'’”)\]]+$/ } = {}) {
  if (!el) return [];
  const words = el.textContent.split(/(\s+)/);
  el.replaceChildren();
  const spans = [];
  for (const part of words) {
    if (/^\s+$/.test(part)) {
      el.appendChild(document.createTextNode(part));
      continue;
    }
    const span = document.createElement("span");
    span.className = tail.test(part) ? "ob-reveal-word ob-reveal-word--tail" : "ob-reveal-word";
    span.textContent = part;
    el.appendChild(span);
    spans.push(span);
  }
  return spans;
}

/** Reveals split words in sequence. Returns a cancel function. */
export function revealWords(spans, { step = 55, delay = 0 } = {}) {
  if (prefersReducedMotion()) {
    spans.forEach((s) => s.classList.add("is-visible"));
    return () => {};
  }
  document.documentElement.classList.add("ob-motion");
  const timers = spans.map((span, i) => setTimeout(() => span.classList.add("is-visible"), delay + i * step));
  return () => timers.forEach(clearTimeout);
}
