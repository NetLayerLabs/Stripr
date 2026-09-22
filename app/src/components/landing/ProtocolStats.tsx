"use client";

import { SolanaMark } from "@/components/SolanaMark";
import { useMarkets } from "@/hooks/useMarkets";
import { useNetwork } from "@/components/NetworkProvider";

export function ProtocolStats() {
  const { data, isPending, isError } = useMarkets();
  const { label } = useNetwork();
  const markets = data ?? [];

  /**
   * What share of the stock people have stripped has its YT locked and earning.
   *
   * The headline used to be cash dividends, which on mainnet is structurally
   * always zero: xStocks pay by raising a multiplier on the token, never by
   * sending USDC, so that figure measured the one thing these stocks don't do.
   * Share units across different stocks aren't the same thing, but the ratio of
   * locked to stripped is the number this page is actually about.
   */
  const stripped = markets.reduce(
    (sum, market) => sum + Number(market.totalStripped) / 10 ** market.underlying.decimals,
    0
  );
  const locked = markets.reduce(
    (sum, market) => sum + Number(market.totalYtLocked) / 10 ** market.underlying.decimals,
    0
  );
  const earningShare = stripped > 0 ? locked / stripped : null;

  const stats = [
    { label: "Live markets", value: isError ? "-" : String(markets.length), live: true },
    {
      label: "YT earning",
      value: earningShare === null ? "-" : `${(earningShare * 100).toFixed(earningShare >= 0.1 ? 0 : 1)}%`,
      live: true,
    },
    {
      label: "Network",
      value: (
        <span className="flex items-center gap-2">
          <SolanaMark className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
      ),
      live: false,
    },
  ];

  return (
    <dl className="mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-white/[0.06] pt-8">
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0">
          <dt className="label">{stat.label}</dt>
          <dd className="num mt-2 truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
            {stat.live && isPending ? <span className="skeleton inline-block h-6 w-16 align-middle" /> : stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
