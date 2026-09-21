"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Radio } from "lucide-react";
import type { DividendLedger as Ledger, DividendRow } from "@/app/api/dividends/route";
import { cn } from "@/lib/cn";

const pct = (value: number) => `${(value * 100).toFixed(3)}%`;
const usd = (value: number | null, digits = 2) =>
  value === null ? "—" : `$${value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const day = (seconds: number) =>
  seconds > 0 ? new Date(seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

function Row({ row, best }: { row: DividendRow; best: number }) {
  const share = best > 0 ? Math.max(row.lastDividendPct / best, 0) : 0;
  return (
    <tr className="border-t border-white/[0.05]">
      <td className="py-3 pr-4">
        <span className="font-medium text-zinc-100">{row.symbol}</span>
        <span className="ml-2 hidden text-xs text-zinc-500 sm:inline">{row.name.replace(" xStock", "")}</span>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2.5">
          <div aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.07] sm:w-24">
            <div className="h-full rounded-full bg-emerald-400/80" style={{ width: `${Math.max(share * 100, row.lastDividendPct > 0 ? 4 : 0)}%` }} />
          </div>
          <span className="num text-zinc-200">{pct(row.lastDividendPct)}</span>
        </div>
      </td>
      <td className="num py-3 pr-4 text-right text-zinc-300">{usd(row.lastDividendUsdPerShare, 3)}</td>
      <td className="num hidden py-3 pr-4 text-right text-zinc-400 sm:table-cell">×{row.newMultiplier.toFixed(6)}</td>
      <td className="num hidden py-3 text-right text-zinc-500 md:table-cell">{day(row.effectiveAt)}</td>
    </tr>
  );
}

/**
 * Every xStock's most recent dividend, computed from the mint's own Scaled UI Amount
 * config on mainnet. This is the exact number Stripr pays to locked YT.
 */
export function DividendLedger() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["mainnet-dividends"],
    queryFn: async (): Promise<Ledger> => {
      const response = await fetch("/api/dividends");
      if (!response.ok) throw new Error("Mainnet data unavailable");
      return (await response.json()) as Ledger;
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const rows = data?.rows ?? [];
  const best = rows.length ? Math.max(...rows.map((row) => row.lastDividendPct)) : 0;
  const payer = rows.find((row) => row.lastDividendPct > 0);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300">
            <Radio className="h-3.5 w-3.5" />
            Live from Solana mainnet
          </span>
          <h3 className="mt-1.5 font-display text-lg text-white">What each xStock last paid</h3>
        </div>
        <a
          href="https://explorer.solana.com/address/XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Verify on explorer
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>

      <div className="px-5 py-4 sm:px-6">
        {isError ? (
          <p className="py-6 text-center text-sm text-zinc-500">Mainnet data is unavailable right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <caption className="sr-only">
                Each xStock&apos;s most recent dividend, read from its Token-2022 Scaled UI Amount multiplier on Solana
                mainnet.
              </caption>
              <thead>
                <tr className="text-left">
                  <th className="label pb-2 pr-4 font-medium">Stock</th>
                  <th className="label pb-2 pr-4 font-medium">Last dividend</th>
                  <th className="label pb-2 pr-4 text-right font-medium">Per share</th>
                  <th className="label hidden pb-2 pr-4 text-right font-medium sm:table-cell">Multiplier</th>
                  <th className="label hidden pb-2 text-right font-medium md:table-cell">Paid</th>
                </tr>
              </thead>
              <tbody>
                {isPending
                  ? Array.from({ length: 6 }, (_, index) => (
                      <tr key={index} className="border-t border-white/[0.05]">
                        <td colSpan={5} className="py-3">
                          <span className="skeleton block h-4 w-full" />
                        </td>
                      </tr>
                    ))
                  : rows.map((row) => <Row key={row.mint} row={row} best={best} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className={cn("border-t border-white/[0.06] px-5 py-4 text-xs leading-relaxed text-zinc-500 sm:px-6")}>
        Issuers pay by raising each token&apos;s multiplier, so the dividend is visible on-chain and needs no oracle.
        {payer ? (
          <>
            {" "}
            {payer.symbol}&apos;s last one moved holders {pct(payer.lastDividendPct)} — on Stripr that is{" "}
            <span className="text-zinc-300">
              {payer.ytPer100Shares.toFixed(4)} {payer.symbol} ({usd(payer.ytPer100Usd)})
            </span>{" "}
            paid to 100 locked YT, and nothing to PT.
          </>
        ) : null}
      </p>
    </div>
  );
}
