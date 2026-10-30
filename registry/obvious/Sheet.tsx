"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { readMs } from "./motion";
import "./sheet.css";

type Close = (after?: () => void) => void;
type Open = { close: Close; root: HTMLElement };

/* Open sheets, newest last, so Escape and Tab only act on the top one and the page only unlocks when all are gone. */
const stack: Open[] = [];

const phone = () => window.matchMedia("(max-width: 639px)").matches;

const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/* What Tab can land on inside the sheet: not hidden, not inside something inert. */
const tabbables = (within: HTMLElement) =>
  Array.from(within.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[inert]") && el.getClientRects().length > 0 && (el.checkVisibility?.({ visibilityProperty: true }) ?? true)
  );

/* The rest of the page goes inert while a sheet is open, so focus, clicks and screen reader browsing can't reach it.
   Only the top sheet stays live, and only what this file made inert is ever put back. Scripts, styles and live
   regions (toasts) are left alone so announcements still land. */
const held = new Set<Element>();
const skip = (el: Element) =>
  /^(SCRIPT|STYLE|LINK|TEMPLATE|NOSCRIPT)$/.test(el.tagName) || el.matches('[aria-live], [role="status"], [role="alert"], [role="log"]');

function sync() {
  const top = stack[stack.length - 1]?.root;
  for (const el of Array.from(held)) {
    if (el === top || !top) {
      el.removeAttribute("inert");
      held.delete(el);
    }
  }
  if (!top) return;
  for (const el of Array.from(document.body.children)) {
    if (el === top || held.has(el) || skip(el) || el.hasAttribute("inert")) continue;
    el.setAttribute("inert", "");
    held.add(el);
  }
}

/* A bottom sheet on phones (drag down to dismiss), a centred dialog on bigger screens,
   or with `side`, a drawer from the right on bigger screens (--ob-sheet-side-width wide).
   It animates itself out, then calls onClose, so parents can unmount it there.
   Children get `close`, which runs the exit first; pass it a callback to act once it's gone.
   Put scrolling content in .ob-sheet-body and buttons in .ob-sheet-actions.

   It's a modal dialog: it names itself from `title` (or `aria-label` when there's no visible title, which wins
   if both are given), moves focus in when it opens, keeps Tab and Shift+Tab inside, and hands focus back to
   whatever opened it. Give it one or the other, or screen readers just say "dialog". */
export default function Sheet({
  title,
  onClose,
  children,
  tall,
  side,
  "aria-label": ariaLabel,
}: {
  title?: ReactNode;
  onClose: () => void;
  children: (close: Close) => ReactNode;
  tall?: boolean;
  side?: boolean;
  "aria-label"?: string;
}) {
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const done = useRef(onClose);
  done.current = onClose;
  const [mounted, setMounted] = useState(false);
  const mineRef = useRef<Open | null>(null);

  const close: Close = (after) => {
    if (closing.current) return;
    closing.current = true;
    const p = panel.current;
    const r = root.current;
    p?.classList.remove("is-open");
    p?.classList.add("is-closing");
    r?.removeAttribute("data-open");
    const ms = phone() || side ? readMs("--ob-sheet-close-dur", 350) : readMs("--ob-dialog-close-dur", 160);
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

    const mine: Open = { close: (after) => closeRef.current(after), root: root.current! };
    mineRef.current = mine;
    stack.push(mine);
    document.documentElement.classList.add("ob-sheet-lock");

    /* Focus goes to the first thing you can tab to, or the sheet itself if there's nothing. Something inside that
       already took focus (an autoFocus field) keeps it. */
    if (!p.contains(document.activeElement)) (tabbables(p)[0] ?? p).focus({ preventScroll: true });
    sync();
    return () => {
      stack.splice(stack.indexOf(mine), 1);
      if (!stack.length) document.documentElement.classList.remove("ob-sheet-lock");
      sync();
      /* Back to the opener, unless a close callback has already put focus somewhere else. */
      const now = document.activeElement;
      if (prev?.isConnected && (!now || now === document.body || p.contains(now))) prev.focus({ preventScroll: true });
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== mineRef.current) return;
      if (e.key === "Escape") return closeRef.current();
      if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return;
      const p = panel.current;
      if (!p) return;
      const list = tabbables(p);
      if (!list.length) {
        e.preventDefault();
        p.focus({ preventScroll: true });
        return;
      }
      const at = document.activeElement;
      const inside = !!at && p.contains(at);
      if (e.shiftKey) {
        if (!inside || at === p || at === list[0]) {
          e.preventDefault();
          list[list.length - 1].focus({ preventScroll: true });
        }
      } else if (!inside || at === list[list.length - 1]) {
        e.preventDefault();
        list[0].focus({ preventScroll: true });
      }
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
    <div className={"ob-sheet" + (side ? " is-side" : "")} ref={root}>
      <div className="ob-sheet-shade" ref={shade} onClick={() => close()} />
      <div
        className={"ob-sheet-panel" + (tall ? " is-tall" : "")}
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel === undefined && title !== undefined ? titleId : undefined}
        tabIndex={-1}
      >
        <div className="ob-sheet-grab" aria-hidden="true" />
        {title !== undefined && (
          <div className="ob-sheet-head">
            <h2 id={titleId}>{title}</h2>
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
