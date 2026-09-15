"use client";

import { ArrowUpRight, Layers, RefreshCw, TriangleAlert } from "lucide-react";
import { useNetwork } from "@/components/NetworkProvider";
import { shortAddress } from "@/lib/format";
import { PROGRAM_ID } from "@/lib/stripr";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading markets">
      <div className="flex items-center gap-4">
        <div className="skeleton h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton h-6 w-24" />
          <div className="skeleton h-4 w-44" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="card p-5">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-3 h-7 w-28" />
            <div className="skeleton mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="card h-[520px]" />
        <div className="card h-[420px]" />
      </div>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { label } = useNetwork();
  return (
    <div className="card mx-auto max-w-lg px-6 py-12 text-center">
      <TriangleAlert className="mx-auto h-6 w-6 text-amber-300" />
      <h1 className="mt-4 text-lg font-semibold text-white">Couldn’t load markets</h1>
      <p className="mt-2 text-sm text-zinc-500">
        The Solana {label} RPC didn’t respond. Check your connection or RPC endpoint and try again.
      </p>
      <button type="button" onClick={onRetry} className="btn-secondary mt-6 h-10 px-5">
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}

export function NoMarkets() {
  const { cluster, label, setCluster, addressUrl } = useNetwork();
  const programId = PROGRAM_ID.toBase58();

  if (cluster === "mainnet-beta") {
    return (
      <div className="card mx-auto max-w-2xl px-6 py-12 sm:px-10">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <Layers className="h-5 w-5 text-amber-300" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-white">No markets on {label} yet</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Stripr’s xStocks markets haven’t opened on Solana {label} yet. The full product runs on Devnet with demo
          stocks, including reinvested-dividend yield.
        </p>
        <button type="button" onClick={() => setCluster("devnet")} className="btn-primary mt-6 h-10 px-5">
          Switch to Devnet
        </button>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-2xl px-6 py-12 sm:px-10">
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <Layers className="h-5 w-5 text-emerald-300" />
      </div>
      <h1 className="mt-5 text-xl font-semibold text-white">No markets on {label} yet</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        The Stripr program doesn’t have any markets on this network. Deploy it and open demo markets with
        reinvested and cash dividends:
      </p>
      <pre className="mt-5 overflow-x-auto rounded-xl border border-white/[0.07] bg-ink-950 p-4 font-mono text-[13px] leading-6 text-zinc-300">
        <code>{"npm run deploy:devnet\nnpm run seed:devnet"}</code>
      </pre>
      <p className="mt-5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
        Program
        <a
          href={addressUrl(programId)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-zinc-400 transition-colors hover:text-zinc-200"
        >
          {shortAddress(programId, 6)}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </p>
    </div>
  );
}
