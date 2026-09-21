"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Reveals its content when it first scrolls into view, so a section animates as
 * the reader arrives rather than while it is still off-screen. `delay` staggers
 * siblings. Content is rendered either way: with reduced motion, or without an
 * IntersectionObserver, it simply appears.
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      // Fire a little before the element is fully on screen.
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn(className, shown ? "animate-rise" : "opacity-0")}
      style={shown && delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
}
