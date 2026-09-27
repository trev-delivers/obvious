"use client";

/* React wrappers for the transitions.dev snippets. Each one sets the classes
   and data attributes its snippet expects; the CSS itself comes from
   transitions.dev and lives in the app (see the registry item's docs).
   motion.css is the house styling on top: the switch, the check box, the
   search field and the badge dot. */
import "./motion.css";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/* ---------- helpers ---------- */

export function readMs(name: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  const n = parseFloat(raw);
  if (isNaN(n)) return fallback;
  return raw.endsWith("ms") ? n : raw.endsWith("s") ? n * 1000 : n;
}

export function reduced() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ---------- Number pop-in ---------- */

export function PopNumber({ value }: { value: string | number }) {
  const s = String(value);
  const prev = useRef(s);
  const changed = useRef(false);
  if (prev.current !== s) {
    prev.current = s;
    changed.current = true;
  }
  return (
    <span key={s} className={"t-digit-group" + (changed.current ? " is-animating" : "")}>
      {[...s].map((c, i) => (
        <span key={i} className="t-digit" data-stagger={i > 0 ? Math.min(i, 2) : undefined}>
          {c}
        </span>
      ))}
    </span>
  );
}

/* ---------- Text states swap ---------- */

export function TextSwap({ text }: { text: string }) {
  const [shown, setShown] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (text === shown) return;
    const el = ref.current;
    if (!el || reduced()) {
      setShown(text);
      return;
    }
    el.classList.add("is-exit");
    const t = window.setTimeout(() => {
      setShown(text);
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      void el.offsetWidth;
      el.classList.remove("is-enter-start");
    }, readMs("--text-swap-dur", 150));
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <span ref={ref} className="t-text-swap">
      {shown}
    </span>
  );
}

/* ---------- Tabs sliding ---------- */

export type TabOption<T extends string> = { value: T; label: string; icon?: ReactNode; badge?: number };

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  style,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  const sig = options.map((o) => o.value + ":" + o.label).join("|");

  function place(animate: boolean) {
    const b = bar.current;
    const p = pill.current;
    if (!b || !p) return;
    const t = b.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!t) {
      p.style.opacity = "0";
      return;
    }
    p.style.opacity = "";
    if (!animate) p.style.transition = "none";
    p.style.transform = `translateX(${t.offsetLeft}px)`;
    p.style.width = `${t.offsetWidth}px`;
    if (!animate) {
      void p.offsetWidth;
      p.style.transition = "";
    }
    /* In a sideways-scrolling row, bring the chosen tab into view. */
    const sc = b.parentElement;
    if (animate && sc && sc.scrollWidth > sc.clientWidth) {
      const left = t.offsetLeft - sc.clientWidth / 2 + t.offsetWidth / 2;
      sc.scrollTo({ left, behavior: reduced() ? "auto" : "smooth" });
    }
  }

  useLayoutEffect(() => {
    place(!first.current);
    first.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, sig]);

  useEffect(() => {
    const on = () => place(false);
    const ro = new ResizeObserver(on);
    if (bar.current) ro.observe(bar.current);
    document.fonts?.ready.then(on);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={"t-tabs" + (className ? " " + className : "")} role="tablist" aria-label={label} ref={bar} style={style}>
      <span className="t-tabs-pill" aria-hidden="true" ref={pill} />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          className="t-tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.icon !== undefined ? (
            <>
              <span className="ob-tab-icon">
                {o.icon}
                <Badge count={o.badge ?? 0} />
              </span>
              <span className="ob-tab-label">{o.label}</span>
            </>
          ) : (
            o.label
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------- Notification badge ---------- */

export function Badge({ count }: { count: number }) {
  const last = useRef(count);
  if (count > 0) last.current = count;
  return (
    <span className="t-badge" data-open={count > 0} aria-hidden="true">
      <span className="t-badge-dot ob-badge">
        <PopNumber value={last.current} />
      </span>
    </span>
  );
}

/* ---------- Texts reveal (also used to stagger list rows in) ---------- */

/* Plays the staggered entrance on mount and whenever `replay` changes. */
export function useReveal<E extends HTMLElement>(replay?: unknown) {
  const ref = useRef<E>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("is-hiding", "is-shown");
    void el.offsetHeight;
    el.classList.add("is-shown");
  }, [replay]);
  return ref;
}

/* Delay for the nth staggered line; rows past the fold don't wait. */
export const staggerStyle = (n: number): CSSProperties => ({
  transitionDelay: `calc(var(--stagger-stagger) * ${Math.min(n, 10)})`,
});

/* ---------- Success check ---------- */

export function SuccessCheck({ size = 44 }: { size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const wrap = ref.current;
    const path = wrap?.querySelector("path");
    if (!wrap || !path) return;
    const len = String(Math.ceil(path.getTotalLength()) + 1);
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    wrap.setAttribute("data-state", "out");
    void wrap.offsetWidth;
    wrap.setAttribute("data-state", "in");
  }, []);
  return (
    <span className="t-success-check" data-state="out" ref={ref} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 12.5l3.6 3.6L17.5 8.5" />
      </svg>
    </span>
  );
}

/* ---------- Toggle ---------- */

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  const [init, setInit] = useState(false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={"t-toggle ob-switch" + (init ? " is-init" : "")}
      data-on={on}
      onClick={() => {
        setInit(true);
        onChange(!on);
      }}
    >
      <span className="t-toggle-thumb" />
    </button>
  );
}

/* ---------- Input clear with dissolve (search fields) ---------- */

function bezier(str: string) {
  const m = String(str).match(/cubic-bezier\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
  if (!m) return (t: number) => t;
  const [x1, y1, x2, y2] = m.slice(1).map(parseFloat);
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const dx = ((ax * s + bx) * s + cx) * s - t;
      const d = (3 * ax * s + 2 * bx) * s + cx;
      if (Math.abs(dx) < 1e-6 || d === 0) break;
      s -= dx / d;
    }
    return ((ay * s + by) * s + cy) * s;
  };
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const phold = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const [clearing, setClearing] = useState<string | null>(null);

  function buildGlow(text: string) {
    const ctx = document.createElement("canvas").getContext("2d");
    const el = input.current!;
    if (!ctx) return "";
    ctx.font = getComputedStyle(el).font;
    const dark = document.documentElement.dataset.dsMode ? document.documentElement.dataset.dsMode === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const rgb = dark ? "255,255,255" : "0,0,0";
    const w = wrap.current!.clientWidth || 280;
    const padLeft = parseFloat(getComputedStyle(el).paddingLeft) || 12;
    const spread = readMs("--glow-spread", 1.5);
    const layers: string[] = [];
    let x = 0;
    text.split(/(\s+)/).forEach((seg) => {
      const segW = ctx.measureText(seg).width;
      if (seg.trim()) {
        const cx = padLeft + x + segW / 2;
        const hw = Math.max(segW * 0.45, 8) * spread;
        (
          [
            [0, 0.8, 7, 0.22],
            [hw * 0.45, 0.55, 8, 0.18],
            [-hw * 0.4, 0.65, 6, 0.16],
            [hw * 0.15, 0.9, 5, 0.14],
          ] as const
        ).forEach(([dx, rwm, rh, a]) => {
          const lx = (((cx + dx) / w) * 100).toFixed(2);
          layers.push(
            `radial-gradient(ellipse ${Math.max(hw * rwm, 2).toFixed(1)}px ${rh}px at ${lx}% 100%, rgba(${rgb},${a}), transparent)`
          );
        });
      }
      x += segW;
    });
    return layers.join(", ");
  }

  function clear() {
    if (clearing !== null || !value) return;
    const text = value;
    const keepFocus = document.activeElement === input.current;
    onChange("");
    if (reduced()) {
      if (keepFocus) input.current?.focus({ preventScroll: true });
      return;
    }
    setClearing(text);
    const cs = getComputedStyle(document.documentElement);
    const total = readMs("--clear-dur", 1000);
    const outDur = readMs("--clear-out-dur", 400);
    const inDur = readMs("--clear-in-dur", 400);
    const outFly = readMs("--clear-out-fly", 12);
    const inFly = readMs("--clear-in-fly", 12);
    const blur = readMs("--clear-blur", 2);
    const delay = readMs("--glow-delay", 50);
    const peakAt = readMs("--glow-peak-at", 0.15);
    const gOp = readMs("--glow-opacity", 0.42);
    const easeOut = bezier(cs.getPropertyValue("--clear-out-ease"));
    const easeIn = bezier(cs.getPropertyValue("--clear-in-ease"));
    const m = mirror.current!;
    const p = phold.current!;
    const g = glow.current!;
    g.style.background = buildGlow(text);
    g.style.opacity = "0";
    p.style.transform = `translateY(-${inFly}px)`;
    p.style.opacity = "0.9";
    p.style.filter = `blur(${blur}px)`;

    const t0 = performance.now();
    const tick = (now: number) => {
      const el = now - t0;
      const eo = easeOut(Math.min(1, el / outDur));
      m.style.transform = `translateY(${(eo * outFly).toFixed(1)}px)`;
      m.style.opacity = (1 - eo).toFixed(3);
      m.style.filter = `blur(${(eo * blur).toFixed(1)}px)`;
      const ei = easeIn(Math.min(1, el / inDur));
      p.style.transform = `translateY(${(-inFly + ei * inFly).toFixed(1)}px)`;
      p.style.opacity = (0.9 + ei * 0.1).toFixed(3);
      p.style.filter = `blur(${(blur - ei * blur).toFixed(1)}px)`;
      let k = 0;
      if (el > delay) {
        const gp = Math.min(1, (el - delay) / Math.max(1, total - delay));
        k = gp < peakAt ? gp / peakAt : 1 - (gp - peakAt) / (1 - peakAt);
      }
      g.style.opacity = (k * gOp).toFixed(3);
      if (el < total) {
        requestAnimationFrame(tick);
      } else {
        m.style.cssText = "";
        p.style.cssText = "";
        g.style.opacity = "0";
        g.style.background = "";
        setClearing(null);
        if (keepFocus) requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
      }
    };
    requestAnimationFrame(tick);
  }

  const keep = (e: React.SyntheticEvent) => {
    if (document.activeElement === input.current) e.preventDefault();
  };
  const shown = clearing ?? value;

  return (
    <div
      ref={wrap}
      className={"t-clear ob-search" + (value ? " has-value" : "") + (clearing !== null ? " is-clearing" : "")}
    >
      <svg className="ob-search-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="9" cy="9" r="6" />
        <path d="M13.5 13.5L17 17" />
      </svg>
      <input
        ref={input}
        type="search"
        enterKeyHint="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="t-clear-mirror" ref={mirror} aria-hidden="true">
        {shown.replace(/ /g, "\u00a0")}
      </div>
      <div className="t-clear-placeholder" ref={phold} aria-hidden="true">
        {placeholder}
      </div>
      <div className="t-clear-glow" ref={glow} aria-hidden="true" />
      <button type="button" className="t-clear-btn" aria-label="Clear search" onPointerDown={keep} onMouseDown={keep} onClick={clear}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M2 2l6 6M8 2L2 8" />
        </svg>
      </button>
    </div>
  );
}

/* ---------- Checkbox check ---------- */

export function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className="t-check ob-check"
      onClick={() => onChange(!checked)}
    >
      <svg width="12" height="12" viewBox="0 0 10.1668 10.1668" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 5.52L3.92 9.17L9.17 1" />
      </svg>
    </button>
  );
}

/* ---------- Icon swap (plus or copy, to check) ---------- */

export function IconSwap({ state, icon = "plus" }: { state: "a" | "b"; icon?: "plus" | "copy" }) {
  return (
    <span className="t-icon-swap" data-state={state}>
      <span className="t-icon" data-icon="a">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {icon === "copy" ? (
            <>
              <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
              <path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
            </>
          ) : (
            <path d="M8 3v10M3 8h10" />
          )}
        </svg>
      </span>
      <span className="t-icon" data-icon="b">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3.2 3.2L13 4.8" />
        </svg>
      </span>
    </span>
  );
}

/* ---------- Matrix dot loader ---------- */

const CORNERS = [0, 3, 12, 15];
const RING = [1, 2, 7, 11, 14, 13, 8, 4];

export function Matrix({ variant = "orbit" }: { variant?: "orbit" | "scan" | "twinkle" | "pulse" }) {
  const cycle = 1200;
  return (
    <span className="t-matrix" data-variant={variant} aria-hidden="true">
      {Array.from({ length: 16 }, (_, idx) => {
        if (CORNERS.includes(idx)) return <i key={idx} className="is-gap" />;
        if (variant === "scan") return <i key={idx} style={{ ["--d" as string]: Math.round((idx % 4) * (cycle / 10)) } as CSSProperties} />;
        const k = RING.indexOf(idx);
        if (k === -1) return <i key={idx} style={{ animation: "none" }} />;
        return <i key={idx} style={{ ["--d" as string]: Math.round(k * (cycle / 8)) } as CSSProperties} />;
      })}
    </span>
  );
}

/* ---------- Spinning counter ---------- */

const CELLS = Array.from({ length: 40 }, (_, i) => i % 10);

function ReelCol({ digit, index }: { digit: number; index: number }) {
  const strip = useRef<HTMLDivElement>(null);
  const blur = useRef<SVGFEGaussianBlurElement>(null);
  const prev = useRef<number | null>(null);
  const id = "reel" + useId().replace(/[^a-zA-Z0-9]/g, "");

  useLayoutEffect(() => {
    const el = strip.current;
    if (!el) return;
    const cell = el.parentElement!.clientHeight || 30;

    if (prev.current === null || reduced()) {
      el.style.transition = "none";
      el.style.transform = `translateY(${-digit * cell}px)`;
      prev.current = digit;
      return;
    }
    if (prev.current === digit) return;

    const from = prev.current;
    prev.current = digit;
    const dur = readMs("--reel-dur", 1400);
    const delay = index * readMs("--reel-stagger", 90);
    const maxBlur = readMs("--reel-spin-blur", 3);

    el.style.transition = "none";
    el.style.transform = `translateY(${-from * cell}px)`;
    void el.offsetWidth;
    el.style.transition = `transform ${dur}ms var(--reel-ease) ${delay}ms`;
    el.style.transform = `translateY(${-(20 + digit) * cell}px)`;
    el.style.filter = `url(#${id})`;

    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / dur));
      const y = maxBlur * (1 - t) * (1 - t);
      blur.current?.setAttribute("stdDeviation", `0 ${y.toFixed(2)}`);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const done = window.setTimeout(() => {
      el.style.transition = "none";
      el.style.transform = `translateY(${-digit * cell}px)`;
      el.style.filter = "";
    }, dur + delay + 40);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [digit, index, id]);

  return (
    <span className="t-reel-col">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <defs>
          <filter id={id} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur ref={blur} in="SourceGraphic" stdDeviation="0 0" />
          </filter>
        </defs>
      </svg>
      <div className="t-reel-strip" ref={strip}>
        {CELLS.map((d, i) => (
          <span key={i} className="t-reel-digit">
            {d}
          </span>
        ))}
      </div>
    </span>
  );
}

export function Reel({ value, cell = 22 }: { value: number; cell?: number }) {
  const digits = String(Math.max(0, Math.floor(value))).split("").map(Number);
  return (
    <span
      className="t-reel"
      role="img"
      aria-label={String(value)}
      style={{ ["--reel-cell" as string]: `${cell}px` } as CSSProperties}
    >
      {digits.map((d, i) => (
        <ReelCol key={digits.length - i} digit={d} index={i} />
      ))}
    </span>
  );
}
