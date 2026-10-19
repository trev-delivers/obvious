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
 * Wraps each word of a heading in its own span so the words can arrive one
 * at a time. Inner markup stays where it is, so a word inside a link or a
 * highlight is still inside it. Running it twice does nothing the second time.
 *
 * Punctuation that follows a word with no space (the full stop after a last
 * word) gets the tail class as well and stays inline, so the line can't break
 * in front of it.
 *
 *   splitWords(h1)                                   ob-reveal-word spans
 *   splitWords(h1, { word: "w", tail: "w-tail" })    an app's own classes
 */
export function splitWords(el, { word = "ob-reveal-word", tail = "ob-reveal-word--tail" } = {}) {
  if (!el || el.dataset.split) return [];
  el.dataset.split = "1";
  const spans = [];
  let afterWord = false;
  (function walk(node) {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 1) {
        walk(child);
        continue;
      }
      if (child.nodeType !== 3) continue;
      const frag = document.createDocumentFragment();
      for (const chunk of child.textContent.split(/(\s+)/)) {
        if (!chunk) continue;
        if (/^\s+$/.test(chunk)) {
          frag.appendChild(document.createTextNode(chunk));
          afterWord = false;
          continue;
        }
        const span = document.createElement("span");
        span.className = afterWord && !/[\p{L}\p{N}]/u.test(chunk) ? `${word} ${tail}` : word;
        span.textContent = chunk;
        frag.appendChild(span);
        spans.push(span);
        afterWord = true;
      }
      node.replaceChild(frag, child);
    }
  })(el);
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

/**
 * Gold confetti that pops up off a button, tumbles back down and settles on
 * top of it. Each flake catches the light as it turns, so it shimmers rather
 * than just falling.
 *
 *   <span class="ob-confetti">
 *     <canvas class="ob-confetti-canvas" aria-hidden="true"></canvas>
 *     <a class="ob-button" href="mailto:…">Email me</a>
 *   </span>
 *
 *   const stop = mountConfetti(el);
 *
 * Bursts on every click of the button inside. The count, gravity, how long
 * it rests and the golds are --ob-confetti-* custom properties on the
 * wrapper. Does nothing under reduced motion. Returns a teardown.
 */
export function mountConfetti(el, { trigger = el?.querySelector("a, button") } = {}) {
  const canvas = el?.querySelector(".ob-confetti-canvas");
  const ctx = canvas?.getContext?.("2d");
  if (!el || !trigger || !ctx) return () => {};

  const num = (name, fallback) => {
    const n = parseFloat(getComputedStyle(el).getPropertyValue(name));
    return Number.isNaN(n) ? fallback : n;
  };
  const time = (name, fallback) => cssMs(getComputedStyle(el).getPropertyValue(name), fallback);
  /* Without the golds set, it falls back to the text colour rather than
     drawing nothing. */
  const colour = (name) => getComputedStyle(el).getPropertyValue(`--ob-confetti-${name}`).trim() || getComputedStyle(el).color;

  let flakes = [];
  let frame = 0;
  let last = 0;
  let quietSince = 0;
  let room = 0;
  let side = 0;
  let width = 0;
  let height = 0;

  /* The canvas reaches above and out to the sides of the wrapper so flakes
     have room to rise and spread, without the wrapper itself taking up any
     more space in the layout. */
  function size() {
    const box = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    room = num("--ob-confetti-room", 220);
    side = num("--ob-confetti-side", 140);
    width = box.width + side * 2;
    height = box.height + room;
    canvas.style.top = `${-room}px`;
    canvas.style.left = `${-side}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* The top edge of the button at x, in canvas space, or null past its
     ends. A rounded button's ends curve down, so a flake that lands near a
     corner sits lower, the way it would on the real shape. */
  function surface(x) {
    const box = el.getBoundingClientRect();
    const b = trigger.getBoundingClientRect();
    const left = b.left - box.left + side;
    const right = b.right - box.left + side;
    if (x < left || x > right) return null;
    const top = b.top - box.top + room;
    const r = Math.min(parseFloat(getComputedStyle(trigger).borderTopLeftRadius) || 0, b.height / 2);
    const from = x < left + r ? left + r - x : x > right - r ? x - (right - r) : 0;
    return top + r - Math.sqrt(Math.max(0, r * r - from * from));
  }

  function burst() {
    if (prefersReducedMotion()) return;
    size();
    const dark = [colour("dark"), colour("mid")];
    const light = colour("light");
    const b = trigger.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const count = Math.round(num("--ob-confetti-count", 90));
    const top = b.top - box.top + room;
    for (let i = 0; i < count; i++) {
      const x = b.left - box.left + side + Math.random() * b.width;
      flakes.push({
        x,
        y: top,
        vx: (x - (b.left - box.left + side + b.width / 2)) * 1.6 + (Math.random() - 0.5) * 220,
        vy: -(380 + Math.random() * 380),
        w: 4 + Math.random() * 5,
        h: 2 + Math.random() * 3,
        turn: Math.random() * Math.PI * 2,
        turnSpeed: 6 + Math.random() * 10,
        flip: Math.random() * Math.PI * 2,
        flipSpeed: 5 + Math.random() * 9,
        sway: Math.random() * Math.PI * 2,
        dark: dark[Math.floor(Math.random() * 2)],
        light,
        resting: false,
        bounced: false,
      });
    }
    if (flakes.length > 400) flakes = flakes.slice(-400);
    quietSince = 0;
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    const gravity = num("--ob-confetti-gravity", 1500);
    let moving = 0;

    for (const f of flakes) {
      if (f.resting) {
        f.turnSpeed *= 0.9;
        f.flipSpeed *= 0.9;
      } else {
        moving++;
        f.vy = Math.min(f.vy + gravity * dt, 260);
        f.vx *= 0.985;
        f.sway += dt * 3;
        f.x += (f.vx + Math.sin(f.sway) * 18) * dt;
        f.y += f.vy * dt;
        const floor = f.vy > 0 ? surface(f.x) : null;
        if (floor !== null && f.y >= floor - f.h / 2) {
          f.y = floor - f.h / 2;
          if (!f.bounced && f.vy > 120) {
            f.vy *= -0.25;
            f.vx *= 0.5;
            f.bounced = true;
          } else {
            f.resting = true;
          }
        }
      }
      f.turn += f.turnSpeed * dt;
      f.flip += f.flipSpeed * dt;
    }
    flakes = flakes.filter((f) => f.y < height + 20 && f.x > -20 && f.x < width + 20);

    if (!moving && !quietSince) quietSince = now;
    const hold = time("--ob-confetti-hold", 1800);
    const fade = time("--ob-confetti-fade", 700);
    const alpha = quietSince ? 1 - Math.min(1, Math.max(0, now - quietSince - hold) / fade) : 1;

    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = alpha;
    for (const f of flakes) {
      /* How face-on the flake is to the light: near 1 it flashes pale gold,
         edge-on it's the darker gold and thin. */
      const face = Math.abs(Math.cos(f.flip));
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.turn);
      ctx.fillStyle = face > 0.55 ? f.light : f.dark;
      ctx.fillRect(-f.w / 2, (-f.h / 2) * Math.max(face, 0.25), f.w, f.h * Math.max(face, 0.25));
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    if (alpha <= 0 || !flakes.length) {
      flakes = [];
      ctx.clearRect(0, 0, width, height);
      frame = 0;
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  trigger.addEventListener("click", burst);
  return () => {
    trigger.removeEventListener("click", burst);
    cancelAnimationFrame(frame);
    frame = 0;
    flakes = [];
  };
}
