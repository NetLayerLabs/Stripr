"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import { StatTile, TokenIcon } from "@/components/ui";
import { useNetwork } from "@/components/NetworkProvider";
import { formatAmount, formatShare, shortAddress } from "@/lib/format";
import { multiplierLabel, sharesForRaw, type MarketView } from "@/lib/stripr";

export function MarketHeader({
  markets,
  market,
  onSelect,
}: {
  markets: MarketView[];
  market: MarketView;
  onSelect: (address: string) => void;
}) {
  const { addressUrl } = useNetwork();
  const address = market.address.toBase58();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <TokenIcon kind="stock" symbol={market.symbol} size="lg" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{market.symbol}</h1>
            <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[11px] font-medium text-zinc-400">
              PT · YT
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-zinc-500">
            <span>{market.name}</span>
            <span aria-hidden>·</span>
            <a
              href={addressUrl(address)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs transition-colors hover:text-zinc-300"
            >
              Market {shortAddress(address)}
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {markets.length > 1 ? (
        <label className="relative">
          <span className="sr-only">Market</span>
          <select
            value={address}
            onChange={(event) => onSelect(event.target.value)}
            className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] pl-3 pr-9 text-sm text-zinc-100 outline-none transition-colors hover:border-white/20 focus:border-emerald-400/40 sm:w-60"
          >
            {markets.map((option) => (
              <option key={option.address.toBase58()} value={option.address.toBase58()}>
                {option.symbol} · {option.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-zinc-500" />
        </label>
      ) : null}
    </div>
  );
}

export function MarketStats({ market }: { market: MarketView }) {
  const { decimals } = market.underlying;
  const dividendDecimals = market.dividend.decimals;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <StatTile
        label="Stock in vault"
        value={formatAmount(market.totalStripped, decimals, 2)}
        sub={`${market.symbol} backing PT and YT`}
      />
      <StatTile
        label="YT earning"
        value={formatShare(market.totalYtLocked, market.totalStripped)}
        sub={`${formatAmount(market.totalYtLocked, decimals, 2)} YT locked`}
      />
      <StatTile
        label="Reinvested dividends"
        value={formatAmount(sharesForRaw(market, market.totalStockYield), decimals, 4)}
        sub={`${market.symbol} paid to locked YT · multiplier ${multiplierLabel(market)}`}
      />
      <StatTile
        label="Cash dividends"
        value={formatAmount(market.totalDividends, dividendDecimals, 2)}
        sub={`${market.dividendSymbol} paid to locked YT`}
      />
    </div>
  );
}
