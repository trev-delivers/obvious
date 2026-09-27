"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "./plus-menu.css";

export type PlusMenuItem = { label: string; hint?: string; icon: ReactNode; onSelect: () => void };

/* Plus to menu morph: the + grows into the menu it opens. Anchored at its
   bottom-right corner, so it opens up and to the left. Put it wherever the
   + should sit; it sizes the open menu from the number of items. */
export default function PlusMenu({ items, label = "Add" }: { items: PlusMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div className={"ob-plus-scrim" + (open ? " is-on" : "")} aria-hidden="true" />
      <div className="ob-plus" ref={box} style={{ "--ob-plus-items": items.length } as CSSProperties}>
        <div className="t-morph" data-open={open}>
          <div className="t-morph-menu" role="menu" aria-hidden={!open}>
            {items.map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                className="ob-plus-item"
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
              >
                <span className="ob-plus-icon">{it.icon}</span>
                <span className="ob-plus-text">
                  <span>{it.label}</span>
                  {it.hint && <span className="ob-plus-hint">{it.hint}</span>}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="t-morph-plus"
            aria-expanded={open}
            aria-label={label}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4v14M4 11h14" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
