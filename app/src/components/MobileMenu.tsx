"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useNetwork } from "@/components/NetworkProvider";
import { WalletButton } from "@/components/WalletButton";
import { CLUSTERS, CLUSTER_LABELS, type Cluster } from "@/lib/config";
import { cn } from "@/lib/cn";

export type MenuLink = { href: string; label: string };

const DOTS: Record<Cluster, string> = {
  devnet: "bg-emerald-400",
  "mainnet-beta": "bg-amber-300",
};

/** The network choice, laid out flat so there is no dropdown inside the menu. */
function NetworkRow({ onPick }: { onPick: () => void }) {
  const { cluster, setCluster } = useNetwork();
  return (
    <div className="px-1 pb-2">
      <p className="label px-2 pb-1.5">Network</p>
      <div className="grid grid-cols-2 gap-1.5">
        {CLUSTERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === cluster}
            onClick={() => {
              setCluster(option);
              onPick();
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
              option === cluster
                ? "border-white/15 bg-white/[0.08] text-white"
                : "border-white/[0.07] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[option])} />
            {CLUSTER_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The header menu on phones, where the inline nav is hidden. On app pages it also
 * carries the network choice and the wallet, which do not fit beside the wordmark
 * at 390px. The button's three bars fold into an X while open; it closes on
 * Escape, on a tap outside, on any link, and once the viewport is wide enough for
 * the inline header to return.
 */
export function MobileMenu({
  links,
  action,
  withControls = false,
}: {
  links: MenuLink[];
  action?: MenuLink;
  withControls?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const wide = window.matchMedia("(min-width: 768px)");
    const onWiden = () => wide.matches && setOpen(false);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    wide.addEventListener("change", onWiden);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      wide.removeEventListener("change", onWiden);
    };
  }, [open]);

  const bar = "block h-[1.5px] w-5 origin-center rounded-full bg-current transition-transform duration-300 ease-out";

  return (
    <div ref={container} className="relative md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-zinc-200 transition-colors hover:border-white/20 hover:text-white"
      >
        <span aria-hidden className="flex flex-col items-center gap-[5px]">
          <span className={cn(bar, open && "translate-y-[6.5px] rotate-45")} />
          <span className={cn(bar, "transition-opacity", open && "opacity-0")} />
          <span className={cn(bar, open && "-translate-y-[6.5px] -rotate-45")} />
        </span>
      </button>

      <div
        id={panelId}
        className={cn(
          "absolute right-0 top-12 w-[15rem] origin-top-right transition-all duration-200 ease-out",
          open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"
        )}
      >
        <nav className="card bg-ink-900 p-2 shadow-lift" aria-label="Site">
          {withControls ? (
            <>
              <NetworkRow onPick={() => setOpen(false)} />
              <div className="px-1 pb-2 [&_button]:w-full [&>div]:w-full">
                <WalletButton />
              </div>
              <div className="mx-1 mb-2 border-t border-white/[0.07]" />
            </>
          ) : null}

          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              tabIndex={open ? undefined : -1}
              className="block rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {link.label}
            </Link>
          ))}

          {action ? (
            <Link
              href={action.href}
              onClick={() => setOpen(false)}
              tabIndex={open ? undefined : -1}
              className="btn-primary mt-2 h-10 w-full text-sm"
            >
              {action.label}
            </Link>
          ) : null}
        </nav>
      </div>
    </div>
  );
}
