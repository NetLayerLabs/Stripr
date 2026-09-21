"use client";

import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { StatTile, TokenIcon } from "@/components/ui";
import { useMarkets } from "@/hooks/useMarkets";
import { useOffersByMarket } from "@/hooks/useOffers";
import { usePrices } from "@/hooks/usePrices";
import { usePositionCounts } from "@/hooks/usePositionCounts";
import { cn } from "@/lib/cn";
import { useNetwork } from "@/components/NetworkProvider";
import { formatAmount, formatShare } from "@/lib/format";
import { formatYieldPercent, ytYield } from "@/lib/prices";
import { sharesForRaw, type MarketView } from "@/lib/stripr";
import { DashboardSkeleton, ErrorState, NoMarkets } from "./States";

type SortKey = "market" | "stripped" | "locked" | "ytYield" | "reinvested" | "dividends" | "positions";
type Direction = "asc" | "desc";

type Row = {
  market: MarketView;
  address: string;
  stripped: number;
  lockedRatio: number;
  reinvested: number;
  dividends: number;
  positions: number;
  /** Yield on the cheapest YT listing, at the stock's realized dividend rate. */
  ytYieldPercent: number | null;
};

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "market", label: "Market" },
  { key: "stripped", label: "Stock stripped" },
  { key: "locked", label: "YT earning" },
  { key: "ytYield", label: "YT yield" },
  { key: "reinvested", label: "Reinvested dividends" },
  { key: "dividends", label: "Cash dividends" },
  { key: "positions", label: "Earning positions" },
];

const SORT_VALUE: Record<SortKey, (row: Row) => number | string> = {
  market: (row) => row.market.symbol,
  stripped: (row) => row.stripped,
  locked: (row) => row.lockedRatio,
  ytYield: (row) => row.ytYieldPercent ?? -1,
  reinvested: (row) => row.reinvested,
  dividends: (row) => row.dividends,
  positions: (row) => row.positions,
};

export function MarketsOverview() {
  const router = useRouter();
  const { cluster, label } = useNetwork();
  const markets = useMarkets();
  const positions = usePositionCounts();
  const prices = usePrices();
  const offersByMarket = useOffersByMarket(markets.data);
  const [sort, setSort] = useState<{ key: SortKey; direction: Direction }>({ key: "stripped", direction: "desc" });

  const rows = useMemo<Row[]>(
    () =>
      (markets.data ?? []).map((market) => ({
        market,
        address: market.address.toBase58(),
        stripped: Number(market.totalStripped) / 10 ** market.underlying.decimals,
        lockedRatio: market.totalStripped > 0n ? Number(market.totalYtLocked) / Number(market.totalStripped) : 0,
        reinvested: Number(sharesForRaw(market, market.totalStockYield)) / 10 ** market.underlying.decimals,
        dividends: Number(market.totalDividends) / 10 ** market.dividend.decimals,
        positions: positions.data?.counts.get(market.address.toBase58()) ?? 0,
        ytYieldPercent: (() => {
          const stock = prices.data?.enabled ? prices.data.prices[market.symbol] : undefined;
          const best = offersByMarket.data?.get(market.address.toBase58())?.find((offer) => offer.asset === "yt");
          return best ? (ytYield(market, best.price, stock)?.annualPercent ?? null) : null;
        })(),
      })),
    [markets.data, positions.data, prices.data, offersByMarket.data]
  );

  const sorted = useMemo(() => {
    const value = SORT_VALUE[sort.key];
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = value(a);
      const right = value(b);
      return (typeof left === "string" ? left.localeCompare(String(right)) : left - Number(right)) * factor;
    });
  }, [rows, sort]);

  if (markets.isPending) return <DashboardSkeleton />;
  if (markets.isError) return <ErrorState onRetry={() => void markets.refetch()} />;
  if (rows.length === 0) return <NoMarkets />;

  const primary = rows[0].market;
  const dividendTotal = rows
    .filter((row) => row.market.account.dividendMint.equals(primary.account.dividendMint))
    .reduce((sum, row) => sum + row.market.totalDividends, 0n);
  const earningPositions = rows.reduce((sum, row) => sum + row.positions, 0);

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "market" ? "asc" : "desc" }
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Stripr markets</p>
          <h1 className="mt-2 text-[1.75rem] leading-tight text-white sm:text-[2rem]">Markets</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Every stock you can strip on Stripr, with stats read live from the chain.
          </p>
        </div>
        <p className="text-xs text-zinc-500">
          {cluster === "devnet"
            ? `Demo markets on Solana ${label}: mock stocks and demo USDC.`
            : `Live on Solana ${label} with real xStocks.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile label="Live markets" value={rows.length} sub="Tokenized stocks listed" />
        <StatTile
          label="Cash dividends"
          value={formatAmount(dividendTotal, primary.dividend.decimals, 2)}
          sub={`${primary.dividendSymbol} to locked YT, all markets`}
        />
        <StatTile
          label="Earning positions"
          value={positions.isPending ? "—" : earningPositions}
          sub="Locked YT or unclaimed yield"
        />
        <StatTile
          label="Unique holders"
          value={positions.isPending ? "—" : positions.data?.holders ?? 0}
          sub="Wallets with an earning position"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {COLUMNS.map((column, index) => {
                  const active = sort.key === column.key;
                  const Arrow = sort.direction === "asc" ? ArrowUp : ArrowDown;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                      className={cn("px-5 py-3 font-medium", index === 0 ? "text-left" : "text-right")}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn(
                          "label inline-flex items-center gap-1 transition-colors hover:text-zinc-300",
                          active && "text-zinc-200"
                        )}
                      >
                        {column.label}
                        {active ? <Arrow className="h-3 w-3" /> : null}
                      </button>
                    </th>
                  );
                })}
                <th className="w-10" aria-label="Open market" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sorted.map((row) => {
                // Carry the network so the link works when shared or refreshed.
                const href = `/app/markets/${row.address}?network=${cluster}`;
                const { market } = row;
                return (
                  <tr
                    key={row.address}
                    onClick={() => router.push(href)}
                    className="cursor-pointer transition-colors hover:bg-white/[0.025]"
                  >
                    <td className="px-5 py-4">
                      <Link href={href} className="flex items-center gap-3 outline-none" onClick={(event) => event.stopPropagation()}>
                        <TokenIcon kind="stock" symbol={market.symbol} />
                        <span>
                          <span className="block font-medium text-white">{market.symbol}</span>
                          <span className="block text-xs text-zinc-500">{market.name}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="num px-5 py-4 text-right text-zinc-200">
                      {formatAmount(market.totalStripped, market.underlying.decimals, 2)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <span className="num text-zinc-200">{formatShare(market.totalYtLocked, market.totalStripped)}</span>
                        <span
                          aria-hidden
                          className="hidden h-1.5 w-16 overflow-hidden rounded-full sm:block"
                          style={{ background: "color-mix(in srgb, var(--series-1) 22%, transparent)" }}
                        >
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${Math.min(row.lockedRatio * 100, 100)}%`, background: "var(--series-1)" }}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="num px-5 py-4 text-right">
                      {row.ytYieldPercent === null ? (
                        <span className="text-zinc-600">—</span>
                      ) : (
                        <span className="text-emerald-300/90">{formatYieldPercent(row.ytYieldPercent)}</span>
                      )}
                    </td>
                    <td className="num px-5 py-4 text-right text-zinc-200">
                      {formatAmount(sharesForRaw(market, market.totalStockYield), market.underlying.decimals, 4)}{" "}
                      <span className="text-zinc-500">{market.symbol}</span>
                    </td>
                    <td className="num px-5 py-4 text-right text-zinc-200">
                      {formatAmount(market.totalDividends, market.dividend.decimals, 2)}{" "}
                      <span className="text-zinc-500">{market.dividendSymbol}</span>
                    </td>
                    <td className="num px-5 py-4 text-right text-zinc-200">{positions.isPending ? "—" : row.positions}</td>
                    <td className="pr-4 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-zinc-600" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
