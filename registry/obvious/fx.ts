/* The engine behind effects.tsx, with no React in it, so the docs site runs the
   same code an app gets. Everything here is either pure (the seal and the wave
   field) or takes an element and hands back a teardown, which is the shape a
   React effect wants.

   It came out of the guest key card in Morris OS. */

export const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- the seal ---------- */

/* FNV-1a, 32 bits. */
export function fnv(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/* Math.sin is allowed to differ by a hair between JavaScript engines, so Node
   and Safari could round a point differently and the server's seal wouldn't
   match the phone's. This uses only + and *, which every engine does the same. */
const PI = 3.141592653589793;
const HALF = 1.5707963267948966;
const TAU = 6.283185307179586;
export function sin(x: number) {
  x -= TAU * Math.round(x / TAU);
  if (x > HALF) x = PI - x;
  else if (x < -HALF) x = -PI - x;
  const s = x * x;
  return x * (1 - (s / 6) * (1 - (s / 20) * (1 - (s / 42) * (1 - (s / 72) * (1 - (s / 110) * (1 - s / 156))))));
}
export const cos = (x: number) => sin(x + HALF);

const f1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export type SealOptions = {
  /* How many rings, 1 to 12. */
  rings?: number;
  /* Radius of the innermost ring. */
  inner?: number;
  /* Distance from the innermost ring to the outermost. */
  spread?: number;
  /* The fewest and most lobes a ring can have. */
  lobes?: [number, number];
  /* Curves per ring, and points per curve. Fewer is lighter and coarser. */
  curves?: number;
  points?: number;
  /* A fine toothed border round the outside. */
  border?: boolean;
};

export type Seal = {
  /* One path per ring, innermost first, drawn round (0, 0). */
  rings: string[];
  /* The border, or "" without one. */
  border: string;
  /* Half the width of the square that holds it all. */
  extent: number;
  /* That square as an SVG viewBox. */
  viewBox: string;
};

/* A guilloche, like the security pattern on a banknote. The same seed always
   draws the same seal, on the server and in the browser. */
export function seal(seed: string, o: SealOptions = {}): Seal {
  const n = Math.min(12, Math.max(1, Math.round(o.rings ?? 3)));
  const inner = o.inner ?? 58;
  const spread = o.spread ?? 104;
  const [lo, hi] = o.lobes ?? [7, 12];
  const curves = o.curves ?? 16;
  const points = o.points ?? 180;
  const base = fnv(seed);
  const step = n > 3 ? spread / (n - 1) : 40;
  const rings: string[] = [];
  for (let r = 0; r < n; r++) {
    const h = fnv(`${base}:${r}`);
    const lobes = lo + (h % (hi - lo + 1));
    const phase = (((h >>> 8) % 360) * PI) / 180;
    const amp = Math.min(12 + ((h >>> 16) % 4) * 1.5, step * 0.38);
    const radius = inner + r * step;
    let d = "";
    for (let k = 0; k < curves; k++) {
      const q = (k / curves) * TAU;
      for (let i = 0; i <= points; i++) {
        const t = (i / points) * TAU;
        const rr = radius + amp * sin(lobes * t + q + phase) + (amp / 4) * sin(3 * lobes * t - q);
        d += (i ? "L" : "M") + f1(rr * cos(t)) + "," + f1(rr * sin(t));
      }
      d += "Z";
    }
    rings.push(d);
  }
  const outer = inner + (n - 1) * step + 26;
  let border = "";
  if (o.border !== false) {
    const teeth = 40 + (base % 24);
    for (let k = 0; k < 6; k++) {
      for (let i = 0; i <= 480; i++) {
        const t = (i / 480) * TAU;
        const rr = outer + 3 * sin(teeth * t + k * 1.05);
        border += (i ? "L" : "M") + f1(rr * cos(t)) + "," + f1(rr * sin(t));
      }
      border += "Z";
    }
  }
  const extent = outer + 6;
  return { rings, border, extent, viewBox: `${-extent} ${-extent} ${2 * extent} ${2 * extent}` };
}

export type FieldOptions = { width?: number; height?: number; lines?: number; gap?: number; amp?: number };

/* Fine waves across a whole surface, as one path. The default size is a bank
   card's 856 by 540. */
export function waveField(seed: string, o: FieldOptions = {}) {
  const width = o.width ?? 856;
  const height = o.height ?? 540;
  const gap = o.gap ?? 16;
  const lines = o.lines ?? Math.ceil(height / gap) + 2;
  const amp = o.amp ?? 6;
  const base = fnv(seed);
  const fq = 0.011 + (base % 7) * 0.0012;
  const ph = ((base >>> 3) % 628) / 100; // where along the wave each field starts
  let d = "";
  for (let i = 0; i < lines; i++) {
    for (let x = -10; x <= width + 10; x += 8) {
      const y = -12 + i * gap + amp * sin(x * fq + i * 0.42 + ph) + amp * 0.37 * sin(x * fq * 3.4 - i * 0.31 - ph);
      d += (x === -10 ? "M" : "L") + x + "," + f1(y);
    }
  }
  return d;
}

/* The lines as an SVG, stroked, for a mask. Pure. */
export function maskSvg(viewBox: string, paths: string | string[], width = 1) {
  const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">` +
    list.map((d) => `<path d="${d}" fill="none" stroke="black" stroke-width="${width}"/>`).join("") +
    `</svg>`
  );
}

/* The same, as a blob URL a CSS mask can use. Revoke it when you're done. */
export function maskUrl(viewBox: string, paths: string | string[], width = 1) {
  return URL.createObjectURL(new Blob([maskSvg(viewBox, paths, width)], { type: "image/svg+xml" }));
}

/* ---------- the phone's tilt ---------- */

type Orientation = { requestPermission?: () => Promise<string> };
const orientation = () =>
  (typeof window === "undefined" ? undefined : (window as unknown as { DeviceOrientationEvent?: Orientation }).DeviceOrientationEvent);

/* One listener for the whole page, shared by every surface. The tilt is
   measured from how the phone was held when the first reading came in, and
   that rest slowly follows the hand. */
const gyro = { subs: new Set<(x: number, y: number) => void>(), on: false, got: false, rest: null as null | { b: number; g: number } };

function onTurn(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  const rest = (gyro.rest ??= { b: e.beta, g: e.gamma });
  rest.b += (e.beta - rest.b) * 0.004;
  rest.g += (e.gamma - rest.g) * 0.004;
  let dx = e.gamma - rest.g;
  let dy = e.beta - rest.b;
  const ang = screen.orientation?.angle ?? 0; // keep left as left in landscape
  if (ang === 90) [dx, dy] = [dy, -dx];
  else if (ang === 270) [dx, dy] = [-dy, dx];
  else if (ang === 180) [dx, dy] = [-dx, -dy];
  gyro.got = true;
  const x = Math.max(-1, Math.min(1, dx / 24)) * 0.85;
  const y = Math.max(-1, Math.min(1, -dy / 24)) * 0.85;
  gyro.subs.forEach((fn) => fn(x, y));
}

function listen() {
  if (gyro.on || !gyro.subs.size) return;
  gyro.on = true;
  window.addEventListener("deviceorientation", onTurn);
}

export function onGyro(fn: (x: number, y: number) => void) {
  if (!orientation()) return () => {};
  gyro.subs.add(fn);
  listen(); // Android and the like just send readings. iOS sends nothing until it's asked.
  return () => {
    gyro.subs.delete(fn);
    if (!gyro.subs.size && gyro.on) {
      window.removeEventListener("deviceorientation", onTurn);
      gyro.on = false;
      gyro.rest = null;
    }
  };
}

/* iOS only sends readings after a tap asks for them. Desktop Chrome has the
   same function but no sensor, so this only says yes on a touch screen that
   has sent nothing after a moment. */
export function watchGyroPermission(onNeeded: (needed: boolean) => void, wait = 1200) {
  const doe = orientation();
  if (typeof doe?.requestPermission !== "function" || !matchMedia("(pointer: coarse)").matches || reduced()) return () => {};
  const t = window.setTimeout(() => !gyro.got && onNeeded(true), wait);
  return () => window.clearTimeout(t);
}

/* Call from the tap itself. */
export function askGyro() {
  const doe = orientation();
  doe?.requestPermission?.()
    .then((p) => {
      if (p === "granted") listen();
    })
    .catch(() => {});
}

/* ---------- tilt ---------- */

export type TiltOptions = {
  /* A slow drift when nobody's touching it. */
  drift?: boolean;
  /* Follow the phone's tilt. */
  gyro?: boolean;
};

/* Leans towards the pointer, a finger or the phone's tilt, and writes where it
   is to the stage as --fx-x and --fx-y (-1 to 1), --fx-m (how far, 0 to 1) and
   --fx-a (which way, an angle). CSS does the rest.

   The pointer is read on the stage, which must never move, so the tilt can't
   feed back into its own measurement. A critically damped spring is stepped
   once a frame, so there's no transition to restart and no jolt. It sleeps
   when the stage is off screen. */
export function tilt(stage: HTMLElement, o: TiltOptions = {}) {
  const drift = o.drift ?? true;
  const write = (x: number, y: number) => {
    const m = Math.min(1, Math.hypot(x, y));
    stage.style.setProperty("--fx-x", x.toFixed(4));
    stage.style.setProperty("--fx-y", y.toFixed(4));
    stage.style.setProperty("--fx-m", m.toFixed(4));
    stage.style.setProperty("--fx-a", `${((Math.atan2(y, x) * 180) / PI).toFixed(1)}deg`);
  };
  const clear = () => ["--fx-x", "--fx-y", "--fx-m", "--fx-a"].forEach((p) => stage.style.removeProperty(p));
  if (reduced()) {
    write(0, 0);
    return clear;
  }

  const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, gx: 0, gy: 0, active: false, gyro: false, visible: false, t0: performance.now() };
  let raf = 0;
  let last = 0;
  function step(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let gx = 0;
    let gy = 0;
    if (s.active) [gx, gy] = [s.tx, s.ty];
    else if (s.gyro) [gx, gy] = [s.gx, s.gy];
    else if (drift) {
      const t = (now - s.t0) / 1000; // starts at exactly 0
      gx = 0.32 * Math.sin(t * 0.52);
      gy = 0.22 * (Math.sin(t * 0.37 + 0.6) - Math.sin(0.6));
    }
    const k = s.active ? 110 : 26;
    const c = 2 * Math.sqrt(k); // critically damped: no overshoot
    s.vx += (k * (gx - s.x) - c * s.vx) * dt;
    s.x += s.vx * dt;
    s.vy += (k * (gy - s.y) - c * s.vy) * dt;
    s.y += s.vy * dt;
    write(s.x, s.y);
    const settled = !drift && !s.active && !s.gyro && Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.vx) + Math.abs(s.vy) < 0.0005;
    raf = s.visible && !settled ? requestAnimationFrame(step) : 0;
  }
  const wake = () => {
    if (raf || !s.visible) return;
    last = performance.now();
    raf = requestAnimationFrame(step);
  };
  const read = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    s.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    s.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    s.active = true;
    wake();
  };
  const release = () => {
    s.active = false;
    wake();
  };
  const releaseTouch = (e: PointerEvent) => e.pointerType !== "mouse" && release();
  const events: [string, (e: PointerEvent) => void][] = [
    ["pointerenter", read],
    ["pointermove", read],
    ["pointerdown", read],
    ["pointerleave", release],
    ["pointercancel", release],
    ["pointerup", releaseTouch],
  ];
  events.forEach(([n, fn]) => stage.addEventListener(n, fn as EventListener));
  const io = new IntersectionObserver(([en]) => {
    s.visible = en.isIntersecting;
    wake();
  });
  io.observe(stage);
  const stopGyro =
    o.gyro === false
      ? () => {}
      : onGyro((x, y) => {
          s.gx = x;
          s.gy = y;
          s.gyro = true;
          wake();
        });
  write(0, 0);

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    stopGyro();
    events.forEach(([n, fn]) => stage.removeEventListener(n, fn as EventListener));
    clear();
  };
}

/* ---------- encrypted words ---------- */

export const GLYPHS = ["✱", "◆", "▮", "◇", "▪"];

export type ScrambleWord = {
  text: string;
  /* Never before this many ms after it was added. */
  delay?: number;
  glyphs?: string[];
  /* Called with a symbol (or null) and a lit flag for every character. */
  onStep: (glyphs: (string | null)[], lit: boolean[]) => void;
};

/* One scheduler for the page, so only one word is ever encrypting. Words take
   turns, with a few seconds between. */
type Entry = ScrambleWord & { from: number; cancel?: () => void };
const words: Entry[] = [];
let turn = 0;
let timer = 0;
let current: Entry | null = null;

function pump() {
  timer = 0;
  if (current || !words.length) return;
  const now = performance.now();
  const ready = words.filter((w) => w.from <= now);
  if (!ready.length) {
    timer = window.setTimeout(pump, Math.min(...words.map((w) => w.from)) - now + 10);
    return;
  }
  turn++;
  const w = ready[turn % ready.length];
  current = w;
  w.cancel = run(w, () => {
    current = null;
    w.cancel = undefined;
    timer = window.setTimeout(pump, 3800 + (turn % 3) * 1300);
  });
}

/* Letters to symbols left to right, a beat, then back with a flash. */
function run(w: Entry, done: () => void) {
  const chars = Array.from(w.text);
  const glyphs = w.glyphs?.length ? w.glyphs : GLYPHS;
  const g: (string | null)[] = chars.map(() => null);
  const lit = chars.map(() => false);
  const live = chars.map((c, i) => (c.trim() ? i : -1)).filter((i) => i >= 0);
  const timers: number[] = [];
  const at = (ms: number, fn: () => void) => void timers.push(window.setTimeout(fn, ms));
  const send = () => w.onStep(g.slice(), lit.slice());
  live.forEach((i, n) =>
    at(n * 45, () => {
      g[i] = glyphs[(chars[i].charCodeAt(0) + n) % glyphs.length];
      send();
    }),
  );
  const back = live.length * 45 + 750;
  live.forEach((i, n) =>
    at(back + n * 65, () => {
      g[i] = null;
      lit[i] = true;
      send();
      at(60, () => {
        lit[i] = false;
        send();
      });
    }),
  );
  at(back + live.length * 65 + 120, done);
  return () => {
    timers.forEach(clearTimeout);
    w.onStep(chars.map(() => null), chars.map(() => false));
  };
}

/* Adds a word to the page's turn. Returns the teardown. Does nothing when
   someone has asked for less motion. */
export function scramble(word: ScrambleWord) {
  if (reduced()) return () => {};
  const entry: Entry = { ...word, from: performance.now() + (word.delay ?? 4000) };
  words.push(entry);
  if (!timer && !current) timer = window.setTimeout(pump, 0);
  return () => {
    const i = words.indexOf(entry);
    if (i >= 0) words.splice(i, 1);
    if (current === entry) {
      entry.cancel?.();
      current = null;
      clearTimeout(timer);
      timer = window.setTimeout(pump, 1200);
    }
    if (!words.length) {
      clearTimeout(timer);
      timer = 0;
    }
  };
}

/* ---------- glow cursor ---------- */

/* A soft light that follows the mouse and lights up the hairline borders of
   anything marked data-fx-rim near it. Mouse and trackpad only: on a touch
   screen, or with less motion asked for, it does nothing. */
export function glowCursor(light: HTMLElement | null, reach = 220) {
  if (typeof window === "undefined" || reduced() || !matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  const root = document.documentElement;
  root.setAttribute("data-fx-cursor", "");
  let x = 0;
  let y = 0;
  let raf = 0;
  const lit = new Set<HTMLElement>();
  function frame() {
    raf = 0;
    if (light) light.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    // Read every rect first, then write, so the browser lays out once.
    const near = Array.from(document.querySelectorAll<HTMLElement>("[data-fx-rim]")).map((el) => [el, el.getBoundingClientRect()] as const);
    for (const [el, r] of near) {
      const dx = Math.max(r.left - x, 0, x - r.right);
      const dy = Math.max(r.top - y, 0, y - r.bottom);
      const d = Math.hypot(dx, dy);
      if (d < reach) {
        el.style.setProperty("--fx-rx", `${(x - r.left).toFixed(0)}px`);
        el.style.setProperty("--fx-ry", `${(y - r.top).toFixed(0)}px`);
        el.style.setProperty("--fx-ro", (1 - d / reach).toFixed(3));
        lit.add(el);
      } else if (lit.has(el)) {
        el.style.setProperty("--fx-ro", "0");
        lit.delete(el);
      }
    }
  }
  const move = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    x = e.clientX;
    y = e.clientY;
    root.setAttribute("data-fx-cursor", "on");
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const leave = (e: MouseEvent) => {
    if (e.relatedTarget) return;
    root.setAttribute("data-fx-cursor", "");
    lit.forEach((el) => el.style.setProperty("--fx-ro", "0"));
    lit.clear();
  };
  // Scrolling moves the borders under a still mouse.
  const scroll = () => {
    if (root.getAttribute("data-fx-cursor") === "on" && !raf) raf = requestAnimationFrame(frame);
  };
  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("scroll", scroll, { passive: true, capture: true });
  document.addEventListener("mouseout", leave);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("scroll", scroll, { capture: true });
    document.removeEventListener("mouseout", leave);
    root.removeAttribute("data-fx-cursor");
    lit.forEach((el) => ["--fx-rx", "--fx-ry", "--fx-ro"].forEach((p) => el.style.removeProperty(p)));
    if (light) light.style.removeProperty("transform");
  };
}
