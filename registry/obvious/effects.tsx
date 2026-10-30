"use client";

/* Effects: the craft from the Morris OS guest key card, made reusable. They're
   opt-in and for special moments, like a guest's key card, a welcome or one
   hero element, and no more than 1 or 2 on a screen. The rules are in
   obvious's CLAUDE.md under "Effects".

   The engine is in fx.ts, with no React in it. Colours are --fx-* custom
   properties in effects.css, defaulting to the card's blue-violet. Every piece
   is still and in its final state when someone has asked for less motion. */
import "./effects.css";

import {
  createElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  askGyro,
  fnv,
  GLYPHS,
  glowCursor,
  maskUrl,
  reduced,
  scramble,
  seal,
  tilt,
  waveField,
  watchGyroPermission,
  type SealOptions,
} from "./fx";

export { seal, waveField, fnv, type SealOptions } from "./fx";

type Vars = CSSProperties & Record<`--${string}`, string | number | undefined>;

/* ---------- HoloSurface ---------- */

/* A surface that leans towards the pointer, a finger or the phone's tilt.
   Children can read where it is from --fx-x and --fx-y (-1 to 1), --fx-m (0 to
   1) and --fx-a (an angle). className and style go on the part that tilts, so
   that's the card. */
export function HoloSurface({
  children,
  className,
  style,
  tilt: degrees = 8,
  perspective = 1100,
  drift = true,
  gyro = true,
  light = true,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /* Most it leans sideways, in degrees. Up and down is three quarters of it. */
  tilt?: number;
  perspective?: number;
  /* A slow drift when nobody's touching it. */
  drift?: boolean;
  /* Follow the phone's tilt. On iOS that needs useGyroPermission too. */
  gyro?: boolean;
  /* A highlight that moves across it and a lit edge on the side facing the light. */
  light?: boolean;
}) {
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => (stage.current ? tilt(stage.current, { drift, gyro }) : undefined), [drift, gyro]);
  const vars: Vars = { "--fx-tilt": `${degrees}deg`, "--fx-perspective": `${perspective}px` };
  return (
    <div ref={stage} className="ob-fx-surface" style={vars}>
      <div className={"ob-fx-surface-tilt" + (className ? " " + className : "")} style={style}>
        {children}
        {light && (
          <>
            <span className="ob-fx-surface-light" aria-hidden="true">
              <span />
            </span>
            <span className="ob-fx-surface-rim" aria-hidden="true" />
          </>
        )}
      </div>
    </div>
  );
}

/* iOS sends no tilt until someone taps to allow it. needed turns true on a
   touch screen that has sent nothing after a moment; show a button that calls
   ask from its onClick:

     const gyro = useGyroPermission();
     {gyro.needed && <button onClick={gyro.ask}>Tilt to see the hologram</button>} */
export function useGyroPermission(wait = 1200) {
  const [needed, setNeeded] = useState(false);
  useEffect(() => watchGyroPermission(setNeeded, wait), [wait]);
  return {
    needed,
    ask: () => {
      askGyro();
      setNeeded(false);
    },
  };
}

/* ---------- Holo ---------- */

const FILM = [1, 2, 3, 4, 5, 6, 1];

/* Thin-film colour on engraved lines: the lines drawn faintly, and the same
   lines as a mask over colour that shifts with the surface's angle. Give it
   paths (with their viewBox), an image src whose shape is the mask, or SVG
   children to use as the mask. */
export function Holo({
  paths,
  viewBox = "0 0 100 100",
  strokeWidth = 1,
  src,
  children,
  strength = 1,
  base = 0.12,
  className,
  style,
}: {
  paths?: string | string[];
  viewBox?: string;
  strokeWidth?: number;
  src?: string;
  /* SVG content (paths, shapes, text) in viewBox units. Its own colours don't matter. */
  children?: ReactNode;
  /* How strong the colour is, 0 to 1. */
  strength?: number;
  /* How strong the faint engraving is, 0 to 1. */
  base?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const [, , vw, vh] = viewBox.split(/[\s,]+/).map(Number);
  const vars: Vars = { "--fx-holo-strength": strength, "--fx-holo-base": base, aspectRatio: `${vw} / ${vh}`, ...style };
  if (children) return <HoloSvg viewBox={viewBox} vars={vars} className={className}>{children}</HoloSvg>;
  return <HoloMask paths={paths} viewBox={viewBox} strokeWidth={strokeWidth} src={src} vars={vars} className={className} />;
}

/* Paths and images become a CSS mask: a picture the compositor moves light
   across, which stays cheap however many lines there are. */
function HoloMask({ paths, viewBox, strokeWidth, src, vars, className }: { paths?: string | string[]; viewBox: string; strokeWidth: number; src?: string; vars: Vars; className?: string }) {
  const [url, setUrl] = useState<string | null>(src ?? null);
  const list = paths ? (Array.isArray(paths) ? paths : [paths]) : [];
  const sig = src ?? `${viewBox}|${strokeWidth}|${fnv(list.join("|"))}`;
  useEffect(() => {
    if (src) return setUrl(src);
    if (!list.length) return setUrl(null);
    const u = maskUrl(viewBox, list, strokeWidth);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return (
    <div
      className={"ob-fx-holo" + (className ? " " + className : "")}
      data-ready={url ? "" : undefined}
      style={{ ...vars, "--fx-mask": url ? `url("${url}")` : undefined } as Vars}
      aria-hidden="true"
    >
      <div className="ob-fx-holo-base" />
      <div className="ob-fx-holo-colour">
        <div className="ob-fx-holo-counter">
          <div className="ob-fx-holo-film">
            <div className="ob-fx-holo-bands" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* SVG children become an SVG mask, so text and shapes work as they are. */
function HoloSvg({ viewBox, vars, className, children }: { viewBox: string; vars: Vars; className?: string; children: ReactNode }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [vx, vy, vw, vh] = viewBox.split(/[\s,]+/).map(Number);
  const box = (k: number) => ({ x: vx - vw * k, y: vy - vh * k, width: vw * (1 + 2 * k), height: vh * (1 + 2 * k) });
  return (
    <svg className={"ob-fx-holo ob-fx-holo-svg" + (className ? " " + className : "")} viewBox={viewBox} style={vars} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-film`} gradientUnits="userSpaceOnUse" x1={vx} y1={vy} x2={vx + vw * 0.21} y2={vy + vw * 0.05} spreadMethod="repeat">
          {FILM.map((n, i) => (
            <stop key={i} offset={i / (FILM.length - 1)} style={{ stopColor: `var(--fx-film-${n})` }} />
          ))}
        </linearGradient>
        <radialGradient id={`${id}-light`}>
          <stop offset="0" stopColor="white" stopOpacity="1" />
          <stop offset="0.35" stopColor="white" stopOpacity="0.6" />
          <stop offset="0.7" stopColor="white" stopOpacity="0.18" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-lines`} style={{ maskType: "alpha" }}>
          <g fill="white" stroke="white">{children}</g>
        </mask>
        <mask id={`${id}-lit`} style={{ maskType: "alpha" }}>
          <rect className="ob-fx-holo-svg-light" {...box(0.3)} fill={`url(#${id}-light)`} />
        </mask>
      </defs>
      <g className="ob-fx-holo-base">{children}</g>
      <g className="ob-fx-holo-colour" mask={`url(#${id}-lines)`}>
        <g mask={`url(#${id}-lit)`}>
          <rect className="ob-fx-holo-svg-bands" {...box(0.5)} fill={`url(#${id}-film)`} />
        </g>
      </g>
    </svg>
  );
}

/* ---------- Guilloche ---------- */

/* A seal made from a seed, in Holo. The same seed always draws the same seal,
   so a guest's name and dates can make theirs. variant="field" draws fine
   waves across the whole box instead, for behind a card. */
export function Guilloche({
  seed,
  variant = "seal",
  rings = 3,
  spin = true,
  depth = 0.5,
  strokeWidth = 0.85,
  width = 856,
  height = 540,
  options,
  className,
  style,
}: {
  seed: string;
  variant?: "seal" | "field";
  rings?: number;
  /* Rings turn against each other, very slowly, so the moiré between them shifts. */
  spin?: boolean;
  /* How far the outer rings slide against the inner ones as it tilts. */
  depth?: number;
  strokeWidth?: number;
  /* The field's size in its own units. */
  width?: number;
  height?: number;
  options?: Omit<SealOptions, "rings">;
  className?: string;
  style?: CSSProperties;
}) {
  const opts = JSON.stringify(options ?? {});
  const s = useMemo(() => (variant === "seal" ? seal(seed, { ...JSON.parse(opts), rings }) : null), [variant, seed, rings, opts]);
  const field = useMemo(() => (variant === "field" ? waveField(seed, { width, height }) : ""), [variant, seed, width, height]);
  const cls = "ob-fx-guilloche" + (className ? " " + className : "");
  if (!s) return <Holo className={cls} style={style} paths={field} viewBox={`0 0 ${width} ${height}`} strokeWidth={1.6} strength={0.4} base={0.08} />;
  const layers = [...s.rings, s.border].filter(Boolean);
  return (
    <div className={cls} style={{ aspectRatio: "1", ...style }} aria-hidden="true">
      {layers.map((d, n) => (
        <div
          key={n}
          className="ob-fx-guilloche-ring"
          data-spin={spin ? (n % 2 ? "reverse" : "normal") : undefined}
          data-edge={n === s.rings.length ? "" : undefined}
          style={{ "--fx-depth": (n * depth).toFixed(2), "--fx-spin": `${n === s.rings.length ? 420 : 260 - n * 30}s` } as Vars}
        >
          <Holo paths={d} viewBox={s.viewBox} strokeWidth={strokeWidth} strength={n === 0 ? 1 : 0.4} base={n === 0 ? 0.17 : 0.09} />
        </div>
      ))}
    </div>
  );
}

/* ---------- EncryptedText ---------- */

/* Now and then the letters flip to symbols and come back. Each letter keeps
   its place under its symbol, so the word never changes width. One word on
   the page at a time, and never in the first `delay` ms. Screen readers get
   the plain text. */
export function EncryptedText({
  text,
  delay = 4000,
  glyphs = GLYPHS,
  as = "span",
  className,
}: {
  text: string;
  delay?: number;
  glyphs?: string[];
  as?: "span" | "p" | "h1" | "h2" | "h3" | "strong";
  className?: string;
}) {
  const [g, setG] = useState<(string | null)[]>([]);
  const [lit, setLit] = useState<boolean[]>([]);
  const glyphKey = glyphs.join("");
  useEffect(() => {
    setG([]);
    setLit([]);
    return scramble({
      text,
      delay,
      glyphs,
      onStep: (a, b) => {
        setG(a);
        setLit(b);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay, glyphKey]);
  return createElement(
    as,
    { className: "ob-fx-enc" + (className ? " " + className : "") },
    <span className="ob-fx-sr">{text}</span>,
    <span className="ob-fx-enc-letters" aria-hidden="true">
      {Array.from(text).map((ch, i) => (
        <span key={i} data-g={g[i] ?? undefined} data-lit={lit[i] ? "" : undefined}>
          {ch}
        </span>
      ))}
    </span>,
  );
}

/* ---------- GlowText ---------- */

/* Soft light drifting behind the words, and now and then a sheen passing
   through them. The words themselves stay solid in the theme's text colour,
   so contrast is the same as without it. */
export function GlowText({
  children,
  as = "span",
  sheen = true,
  className,
}: {
  children: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "strong";
  sheen?: boolean;
  className?: string;
}) {
  return createElement(
    as,
    { className: "ob-fx-glow-text" + (className ? " " + className : "") },
    <span className="ob-fx-glow" aria-hidden="true" />,
    <span className="ob-fx-glow-ink">{children}</span>,
    sheen ? (
      <span className="ob-fx-sheen" aria-hidden="true">
        <span className="ob-fx-sheen-band">
          <span className="ob-fx-sheen-text">{children}</span>
        </span>
      </span>
    ) : null,
  );
}

/* ---------- BorderLight ---------- */

/* A slow light going round the border. For the one button or card on a
   screen that matters most. Set radius to match what's inside. */
export function BorderLight({
  children,
  radius,
  block = false,
  className,
}: {
  children: ReactNode;
  /* Any CSS length, like var(--ds-radius-lg). Defaults to --ds-radius-md. */
  radius?: string;
  /* Fill the width, for a card. Otherwise it sits inline, for a button. */
  block?: boolean;
  className?: string;
}) {
  return (
    <span
      className={"ob-fx-border-light" + (block ? " is-block" : "") + (className ? " " + className : "")}
      style={radius ? ({ "--fx-radius": radius } as Vars) : undefined}
    >
      {children}
      <span className="ob-fx-border-light-ring" aria-hidden="true">
        <span />
      </span>
    </span>
  );
}

/* ---------- GlowCursor ---------- */

/* Put one on the page. A soft light follows the mouse, and the hairline
   borders of anything with data-fx-rim light up as it gets near. Nothing on a
   touch screen. */
export function GlowCursor({ reach = 220 }: { reach?: number }) {
  const light = useRef<HTMLDivElement>(null);
  useEffect(() => glowCursor(light.current, reach), [reach]);
  return <div ref={light} className="ob-fx-cursor" aria-hidden="true" />;
}

/* For reduced(), so an app can check the same thing the effects do. */
export { reduced };
