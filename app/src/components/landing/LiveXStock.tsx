"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Radio } from "lucide-react";
import type { AaplxSnapshot } from "@/app/api/aaplx/route";
import { TokenIcon } from "@/components/ui";

const AAPLX_MINT = "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp";

async function fetchAaplx(): Promise<AaplxSnapshot> {
  const response = await fetch("/api/aaplx");
  if (!response.ok) throw new Error("Mainnet data unavailable");
  return (await response.json()) as AaplxSnapshot;
}

export function LiveXStock() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["aaplx-mainnet"],
    queryFn: fetchAaplx,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const updateApplied = data ? Date.now() / 1000 >= data.newMultiplierEffectiveTimestamp : false;
  const multiplier = data ? (updateApplied ? data.newMultiplier : data.multiplier) : 0;
  const rows = data
    ? [
        { label: "Token program", value: data.isToken2022 ? "Token-2022" : "SPL Token" },
        { label: "Dividend multiplier", value: multiplier.toFixed(6) },
        {
          label: "Change from 1.0",
          value: `+${((multiplier - 1) * 100).toLocaleString("en-US", { maximumFractionDigits: 3 })}%`,
        },
        {
          label: updateApplied ? "Last multiplier update" : "Next multiplier update",
          value: new Date(data.newMultiplierEffectiveTimestamp * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        },
      ]
    : [];

  return (
    <div className="card flex h-full flex-col p-6">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300">
          <Radio className="h-3.5 w-3.5" />
          Live from Solana mainnet
        </span>
        <a
          href={`https://explorer.solana.com/address/${AAPLX_MINT}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Explorer
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <TokenIcon kind="stock" symbol="AAPLx" size="lg" />
        <div>
          <p className="font-semibold text-white">Apple xStock</p>
          <p className="font-mono text-xs text-zinc-500">AAPLx · Xsb…JzJp</p>
        </div>
      </div>

      <dl className="mt-5 divide-y divide-white/[0.05]">
        {isPending ? (
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex justify-between py-3">
              <span className="skeleton h-4 w-28" />
              <span className="skeleton h-4 w-20" />
            </div>
          ))
        ) : isError ? (
          <p className="py-3 text-sm text-zinc-500">Mainnet data is unavailable right now. Try again in a moment.</p>
        ) : (
          rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 py-3 text-sm">
              <dt className="text-zinc-500">{row.label}</dt>
              <dd className="num font-medium text-white">{row.value}</dd>
            </div>
          ))
        )}
      </dl>

      {data ? (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Token-2022 extensions">
          {data.extensions.map((label) => (
            <li
              key={label}
              className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-400"
            >
              {label}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-auto pt-5 text-xs leading-relaxed text-zinc-500">
        xStocks reinvest dividends by raising this multiplier. Stripr reads it on-chain and pays that growth to
        locked YT holders as extra stock.
      </p>
    </div>
  );
}
