"use client";

import { useEffect, useRef, useState } from "react";

/** A zero-based axis with round tick steps (1 / 2 / 5 × 10^n). */
export function niceScale(maxValue: number, targetTicks = 4) {
  if (!(maxValue > 0)) return { max: 1, ticks: [0, 0.5, 1] };
  const raw = maxValue / targetTicks;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  const step = (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
  const max = Math.ceil(maxValue / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, index) =>
    Number((index * step).toPrecision(12))
  );
  return { max, ticks };
}

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
