// src/features/guide/ui/reveal.tsx
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades/raises its children in when scrolled into view. Renders children
 * immediately (so they're always in the DOM); only toggles a CSS class.
 * Skips the animation entirely under prefers-reduced-motion or without IO.
 */
export function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`guide-reveal${visible ? " is-visible" : ""}`}>
      {children}
    </div>
  );
}
