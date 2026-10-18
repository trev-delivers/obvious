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

/**
 * Confetti burst.
 *
 * Paper flakes with real physics that collide with the trigger, modelled as
 * a pill with flat top and circular end caps, then settle and pile on it.
 *
 * Every number comes from the CSS custom properties on :root — count,
 * gravity, size, sway, bounce, how long it holds and how long it fades — so
 * tuning it stays a CSS job. See components/confetti.css.
 *
 *   const stop = mountConfetti({ stage, canvas, trigger });
 *
 * Does nothing under reduced motion, and returns a teardown either way.
 */
export function mountConfetti({ stage, canvas, trigger }) {
  if (!stage || !canvas || !trigger) return () => {};
  if (prefersReducedMotion()) return () => {};
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};


  function readNum(name, fallback){
    var raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if(!raw) return fallback;
    if(raw.endsWith('ms')) return parseFloat(raw);
    if(raw.endsWith('s') && !raw.endsWith('ms')) return parseFloat(raw) * 1000;
    var n = parseFloat(raw);
    return isNaN(n) ? fallback : n;
  }

  var COLORS = ['#ff4d67', '#ffb020', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#f43f5e'];

  var particles = [];
  var running = false;
  var lastT = 0;
  var burstEnd = 0;
  var fadeStart = null;
  var stageW = 0;
  var stageH = 0;

  // The stage's own box stays exactly the button's size (so it never
  // affects the row's layout), so the fall room lives entirely on the
  // canvas: it bleeds HEADROOM px above the stage via absolute
  // positioning, which doesn't add to anyone's layout size. Kept to
  // the existing gap above the button (the paragraph's own margin) so
  // it doesn't bleed into that text instead.
  var HEADROOM = 24;

  function sizeCanvas(){
    var r = stage.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    stageW = r.width;
    stageH = r.height + HEADROOM;
    canvas.style.top = (-HEADROOM) + 'px';
    canvas.style.height = stageH + 'px';
    canvas.width = Math.round(stageW * dpr);
    canvas.height = Math.round(stageH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function buttonRect(){
    var s = stage.getBoundingClientRect();
    var b = btn.getBoundingClientRect();
    return {
      left: b.left - s.left, right: b.right - s.left,
      top: (b.top - s.top) + HEADROOM, bottom: (b.bottom - s.top) + HEADROOM
    };
  }

  function buttonSurface(x, b){
    if(x < b.left || x > b.right) return null;
    var r = (b.bottom - b.top) / 2;
    var lc = b.left + r;
    var rc = b.right - r;
    if(x >= lc && x <= rc) return { y: b.top, slope: 0 };
    var cx = x < lc ? lc : rc;
    var dx = x - cx;
    var root = Math.sqrt(Math.max(r * r - dx * dx, 0));
    return { y: b.top + (r - root), slope: dx / Math.max(root, 0.001) };
  }

  function burst(){
    sizeCanvas();
    var now = performance.now();
    var count = Math.round(readNum('--confetti-count', 120));
    var size = readNum('--confetti-size', 8);
    var spawnWindow = 500;

    particles = [];
    fadeStart = null;
    for(var i=0; i<count; i++){
      particles.push({
        start: now + Math.random() * spawnWindow,
        x: Math.random() * stageW,
        y: -12 - Math.random() * 30,
        py: -12,
        vx: (Math.random() - 0.5) * 60,
        vy: 40 + Math.random() * 120,
        w: size * (0.7 + Math.random() * 0.6),
        h: size * (0.5 + Math.random() * 0.5),
        maxFall: 420 + Math.random() * 280,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 7,
        tumble: Math.random() * Math.PI * 2,
        tumbleSpeed: 4 + Math.random() * 8,
        squish: 1,
        phase: Math.random() * Math.PI * 2,
        swayFreq: 2 + Math.random() * 3,
        swayScale: 0.5 + Math.random(),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        bounces: 0,
        resting: false,
        dead: false
      });
    }
    burstEnd = now + spawnWindow + 100;
    if(!running){
      running = true;
      lastT = now;
      requestAnimationFrame(frame);
    }
  }

  function step(dt, now){
    var g = readNum('--confetti-gravity', 1300);
    var sway = readNum('--confetti-sway', 16);
    var restitution = readNum('--confetti-bounce', 0.3);
    var b = buttonRect();

    particles.forEach(function(p){
      if(p.resting || p.dead || now < p.start) return;

      p.py = p.y;
      p.vy += g * dt;
      if(p.vy > p.maxFall) p.vy = p.maxFall;
      p.phase += p.swayFreq * dt;
      p.x += (p.vx + Math.cos(p.phase) * sway * p.swayScale) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.tumble += p.tumbleSpeed * dt;
      p.squish = 0.25 + 0.75 * Math.abs(Math.cos(p.tumble));

      var half = p.h / 2;

      if(p.vy > 0){
        var s = buttonSurface(p.x, b);
        if(s && p.y + half >= s.y && p.py + half <= s.y + 2){
          if(Math.abs(s.slope) > 0.85){
            var dir = p.x < (b.left + b.right) / 2 ? -1 : 1;
            p.vx = dir * Math.max(Math.abs(p.vx), 50 + Math.random() * 50);
            p.vy *= 0.35;
            p.y = s.y - half;
          } else if(p.vy > 150 && p.bounces < 2){
            p.bounces++;
            p.vy = -p.vy * restitution * (0.6 + Math.random() * 0.5);
            p.vx = p.vx * 0.7 + s.slope * 40 + (Math.random() - 0.5) * 40;
            p.y = s.y - half;
          } else {
            p.resting = true;
            p.y = s.y - half - 0.5;
            p.vx = 0;
            p.vy = 0;
          }
        }
      }

      if(!p.resting && p.y + half >= stageH - 1){
        if(p.vy > 170 && p.bounces < 2){
          p.bounces++;
          p.vy = -p.vy * restitution * (0.5 + Math.random() * 0.4);
          p.vx *= 0.7;
          p.y = stageH - 1 - half;
        } else {
          p.resting = true;
          p.y = stageH - 1 - half;
          p.vx = 0;
          p.vy = 0;
        }
      }

      if(p.x < -30 || p.x > stageW + 30 || p.y > stageH + 30) p.dead = true;
    });
  }

  function draw(alpha){
    ctx.clearRect(0, 0, stageW, stageH);
    ctx.globalAlpha = alpha;
    var now = performance.now();
    particles.forEach(function(p){
      if(p.dead || now < p.start) return;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, p.squish);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  function frame(now){
    if(!running) return;
    var remaining = Math.min((now - lastT) / 1000, 0.25);
    lastT = now;
    while(remaining > 0){
      var dt = Math.min(remaining, 1 / 60);
      step(dt, now);
      remaining -= dt;
    }

    var settled = now > burstEnd && particles.every(function(p){ return p.resting || p.dead; });
    if(settled && fadeStart === null) fadeStart = now + readNum('--confetti-hold', 1600);

    var alpha = 1;
    if(fadeStart !== null && now >= fadeStart){
      var fade = Math.max(readNum('--confetti-fade', 600), 1);
      alpha = 1 - (now - fadeStart) / fade;
      if(alpha <= 0){
        running = false;
        particles = [];
        ctx.clearRect(0, 0, stageW, stageH);
        return;
      }
    }

    draw(alpha);
    requestAnimationFrame(frame);
  }

  btn.addEventListener('click', burst);
  window.addEventListener('resize', function(){ if(running) sizeCanvas(); });

  return () => {
    trigger.removeEventListener("click", burst);
  };
}
