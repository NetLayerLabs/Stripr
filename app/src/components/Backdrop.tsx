"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The page backdrop: a masked grid, two slowly drifting glows, and - on the
 * landing page - a pool of light that follows the pointer and brightens the grid
 * under it. Pointer tracking writes CSS variables from a rAF loop, so it never
 * re-renders React, and it stays off entirely when the visitor prefers reduced
 * motion or has no pointer (touch, keyboard).
 */
export function Backdrop() {
  const interactive = usePathname() === "/";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!interactive || !element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let targetX = 0.5;
    let targetY = 0.18;
    let x = targetX;
    let y = targetY;
    let frame = 0;
    let awake = false;

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX / window.innerWidth;
      targetY = event.clientY / window.innerHeight;
      if (!awake) {
        awake = true;
        element.style.setProperty("--pointer-opacity", "1");
      }
    };

    const tick = () => {
      // Ease toward the pointer so the light trails it rather than snapping.
      x += (targetX - x) * 0.07;
      y += (targetY - y) * 0.07;
      element.style.setProperty("--px", `${(x * 100).toFixed(2)}%`);
      element.style.setProperty("--py", `${(y * 100).toFixed(2)}%`);
      // The glows lean away from the cursor, which reads as depth.
      element.style.setProperty("--mx", `${((0.5 - x) * 40).toFixed(1)}px`);
      element.style.setProperty("--my", `${((0.5 - y) * 28).toFixed(1)}px`);
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [interactive]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={
        { "--px": "50%", "--py": "18%", "--mx": "0px", "--my": "0px", "--pointer-opacity": "0" } as React.CSSProperties
      }
    >
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,black,transparent)]" />

      {/* Two glows drifting on their own, so the page breathes even when nothing moves. */}
      <div
        className="absolute inset-0 transition-transform duration-500 ease-out"
        style={{ transform: "translate3d(var(--mx), var(--my), 0)" }}
      >
        <div className="animate-drift-slow absolute -top-48 left-1/2 h-[560px] w-[1000px] -translate-x-1/2 rounded-full bg-emerald-500/[0.09] blur-[120px]" />
        <div className="animate-drift-slower absolute -top-24 left-[18%] h-[420px] w-[620px] rounded-full bg-sky-500/[0.05] blur-[130px]" />
      </div>

      {interactive ? (
        <>
          {/* The grid brightens under the pointer. */}
          <div
            className="bg-grid-bright absolute inset-0 opacity-0 transition-opacity duration-700"
            style={{
              opacity: "var(--pointer-opacity)",
              maskImage: "radial-gradient(260px circle at var(--px) var(--py), black, transparent 72%)",
              WebkitMaskImage: "radial-gradient(260px circle at var(--px) var(--py), black, transparent 72%)",
            }}
          />
          {/* A pool of light trailing the cursor. */}
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: "var(--pointer-opacity)",
              background:
                "radial-gradient(480px circle at var(--px) var(--py), rgba(52, 211, 153, 0.16), transparent 70%)",
            }}
          />
        </>
      ) : null}
    </div>
  );
}
