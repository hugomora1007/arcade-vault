"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Elemento HTML a renderizar. Por defecto `section`. */
  as?: "section" | "div";
  "aria-hidden"?: boolean;
}

/**
 * Envuelve una sección con la clase `.reveal` y le añade `in` cuando entra
 * en el viewport (IntersectionObserver, threshold 0.12). Con
 * prefers-reduced-motion se muestra de inmediato, sin animación.
 */
export default function Reveal({
  children,
  className = "",
  as: Tag = "section",
  "aria-hidden": ariaHidden,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.classList.add("in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`${className} reveal`.trim()}
      aria-hidden={ariaHidden}
    >
      {children}
    </Tag>
  );
}
