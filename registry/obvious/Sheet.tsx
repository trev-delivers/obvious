"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { readMs } from "./motion";
import "./sheet.css";

type Close = (after?: () => void) => void;

/* Open sheets, newest last, so Escape only closes the top one and the page only unlocks when all are gone. */
const stack: Close[] = [];

const phone = () => window.matchMedia("(max-width: 639px)").matches;

/* A bottom sheet on phones (drag down to dismiss), a centred dialog on bigger screens.
   It animates itself out, then calls onClose, so parents can unmount it there.
   Children get `close`, which runs the exit first; pass it a callback to act once it's gone.
   Put scrolling content in .ob-sheet-body and buttons in .ob-sheet-actions. */
export default function Sheet({
  title,
  onClose,
  children,
  tall,
}: {
  title?: ReactNode;
  onClose: () => void;
  children: (close: Close) => ReactNode;
  tall?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const done = useRef(onClose);
  done.current = onClose;
  const [mounted, setMounted] = useState(false);
  const mineRef = useRef<Close | null>(null);

  const close: Close = (after) => {
    if (closing.current) return;
    closing.current = true;
    const p = panel.current;
    const r = root.current;
    p?.classList.remove("is-open");
    p?.classList.add("is-closing");
    r?.removeAttribute("data-open");
    const ms = phone() ? readMs("--ob-sheet-close-dur", 350) : readMs("--modal-close-dur", 150);
    window.setTimeout(() => {
      done.current();
      after?.();
    }, ms);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => setMounted(true), []);

  /* Enter: paint the resting pose, then open. */
  useLayoutEffect(() => {
    if (!mounted) return;
    const p = panel.current!;
    void p.offsetWidth;
    p.classList.add("is-open");
    root.current!.setAttribute("data-open", "true");
    const prev = document.activeElement as HTMLElement | null;
    p.focus({ preventScroll: true });

    const mine: Close = (after) => closeRef.current(after);
    mineRef.current = mine;
    stack.push(mine);
    document.documentElement.classList.add("ob-sheet-lock");
    return () => {
      stack.splice(stack.indexOf(mine), 1);
      if (!stack.length) document.documentElement.classList.remove("ob-sheet-lock");
      prev?.focus?.({ preventScroll: true });
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stack[stack.length - 1] === mineRef.current) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted]);

  /* Drag to dismiss on touch: only when whatever is under the finger is scrolled to the top. */
  useEffect(() => {
    if (!mounted) return;
    const p = panel.current!;
    const r = root.current!;
    let y0 = 0;
    let dy = 0;
    let t0 = 0;
    let dragging = false;
    let eligible = false;

    const scrolled = (el: Element | null) => {
      for (; el && el !== p.parentElement; el = el.parentElement) if (el.scrollTop > 0) return true;
      return false;
    };
    const start = (e: TouchEvent) => {
      eligible = phone() && !closing.current && e.touches.length === 1 && !scrolled(e.target as Element);
      dragging = false;
      y0 = e.touches[0].clientY;
      dy = 0;
      t0 = performance.now();
    };
    const move = (e: TouchEvent) => {
      if (!eligible) return;
      dy = e.touches[0].clientY - y0;
      if (!dragging) {
        if (dy < -4) eligible = false;
        if (dy <= 6) return;
        dragging = true;
        y0 += dy;
        dy = 0;
        t0 = performance.now();
        r.classList.add("is-dragging");
      }
      e.preventDefault();
      const d = dy > 0 ? dy : dy / 4;
      p.style.transform = `translateY(${d}px)`;
      shade.current!.style.opacity = String(Math.max(0, 1 - Math.max(0, d) / p.offsetHeight));
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      r.classList.remove("is-dragging");
      const v = dy / Math.max(1, performance.now() - t0);
      p.style.transform = "";
      shade.current!.style.opacity = "";
      if (dy > Math.min(140, p.offsetHeight * 0.3) || (dy > 32 && v > 0.5)) closeRef.current();
    };
    p.addEventListener("touchstart", start, { passive: true });
    p.addEventListener("touchmove", move, { passive: false });
    p.addEventListener("touchend", end);
    p.addEventListener("touchcancel", end);
    return () => {
      p.removeEventListener("touchstart", start);
      p.removeEventListener("touchmove", move);
      p.removeEventListener("touchend", end);
      p.removeEventListener("touchcancel", end);
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className="ob-sheet" ref={root}>
      <div className="ob-sheet-shade" ref={shade} onClick={() => close()} />
      <div
        className={"ob-sheet-panel t-modal" + (tall ? " is-tall" : "")}
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <div className="ob-sheet-grab" aria-hidden="true" />
        {title !== undefined && (
          <div className="ob-sheet-head">
            <h2>{title}</h2>
            <button type="button" className="ob-sheet-close" onClick={() => close()} aria-label="Close">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>
        )}
        {children(close)}
      </div>
    </div>,
    document.body
  );
}
