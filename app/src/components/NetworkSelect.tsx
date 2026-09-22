"use client";

import { Check, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useNetwork } from "@/components/NetworkProvider";
import { cn } from "@/lib/cn";
import { CLUSTERS, CLUSTER_LABELS, type Cluster } from "@/lib/config";

const DESCRIPTIONS: Record<Cluster, string> = {
  devnet: "Try it free with test tokens",
  "mainnet-beta": "Real xStocks · unaudited",
};

const DOTS: Record<Cluster, string> = {
  devnet: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]",
  "mainnet-beta": "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.8)]",
};

export function NetworkSelect() {
  const { cluster, setCluster } = useNetwork();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      const outside =
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !menuRef.current?.contains(event.target as Node);
      if (outside) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function choose(next: Cluster) {
    setOpen(false);
    if (next === cluster) return;
    setCluster(next);
    // Market addresses differ per network, so a market page goes back to the list.
    if (pathname.startsWith("/app/markets/")) router.push("/app");
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Network: ${CLUSTER_LABELS[cluster]}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-zinc-300 transition-colors hover:border-white/15 hover:bg-white/[0.06]"
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[cluster])} />
        {CLUSTER_LABELS[cluster]}
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
      </button>

      {open ? (
        <ul role="listbox" aria-label="Network" className="card absolute right-0 top-11 z-50 w-60 bg-ink-900 p-1.5 shadow-2xl">
          {CLUSTERS.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === cluster}
                onClick={() => choose(option)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
              >
                <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", DOTS[option])} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-100">{CLUSTER_LABELS[option]}</span>
                  <span className="block text-xs text-zinc-500">{DESCRIPTIONS[option]}</span>
                </span>
                {option === cluster ? <Check className="mt-0.5 h-4 w-4 text-emerald-300" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
