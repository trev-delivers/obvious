"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { readMs } from "./motion";
import "./toasts.css";

export type Toast = { id: number; text: string; tone: "ok" | "error"; state: "live" | "dismiss" | "push" };

/* Banner stacking: a new toast rises in front, older ones step back, a fourth pushes the oldest out. */
export function useToasts() {
  const [list, setList] = useState<Toast[]>([]);
  const next = useRef(0);
  const timers = useRef(new Set<number>());

  const later = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  const drop = useCallback(
    (id: number, how: "dismiss" | "push") => {
      setList((cur) => cur.map((t) => (t.id === id && t.state === "live" ? { ...t, state: how } : t)));
      later(() => setList((cur) => cur.filter((t) => t.id !== id)), readMs("--stack-close", 250) + 60);
    },
    [later]
  );

  const toast = useCallback(
    (text: string, tone: "ok" | "error" = "ok") => {
      const id = ++next.current;
      setList((cur) => {
        const live = cur.filter((t) => t.state === "live");
        const out = new Set(live.slice(2).map((t) => t.id));
        if (out.size) later(() => setList((c) => c.filter((t) => !out.has(t.id))), readMs("--stack-close", 250) + 60);
        return [{ id, text, tone, state: "live" as const }, ...cur.map((t) => (out.has(t.id) ? { ...t, state: "push" as const } : t))];
      });
      later(() => drop(id, "dismiss"), tone === "error" ? 6000 : 2800);
    },
    [drop, later]
  );

  useEffect(() => {
    const all = timers.current;
    return () => all.forEach((t) => window.clearTimeout(t));
  }, []);

  return { list, toast, dismiss: (id: number) => drop(id, "dismiss") };
}

export function Toasts({ list, dismiss }: { list: Toast[]; dismiss: (id: number) => void }) {
  const live = list.filter((t) => t.state === "live");
  return (
    <div className="ob-toasts" aria-live="polite">
      <div className="t-stack">
        {list.map((t) => (
          <ToastBanner key={t.id} t={t} depth={Math.max(0, live.indexOf(t))} onTap={() => dismiss(t.id)} />
        ))}
      </div>
    </div>
  );
}

function ToastBanner({ t, depth, onTap }: { t: Toast; depth: number; onTap: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current!;
    el.classList.add("is-enter");
    void el.offsetWidth;
    el.classList.remove("is-enter");
  }, []);
  return (
    <div
      ref={ref}
      className={
        "t-stack-banner ob-toast" +
        (t.tone === "error" ? " is-error" : "") +
        (t.state === "push" ? " is-leaving" : t.state === "dismiss" ? " is-dismiss" : "")
      }
      data-depth={t.state === "live" ? depth : undefined}
      role={t.tone === "error" ? "alert" : "status"}
      onClick={onTap}
    >
      <span className="ob-toast-dot" aria-hidden="true">
        {t.tone === "error" ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 3v3.5M6 9h.01" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6.3l2.2 2.2L9.5 3.7" />
          </svg>
        )}
      </span>
      <span className="ob-toast-text">{t.text}</span>
    </div>
  );
}
