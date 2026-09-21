"use client";

import { useMarkets } from "@/hooks/useMarkets";
import { useNetwork } from "@/components/NetworkProvider";
import { formatAmount } from "@/lib/format";

export function ProtocolStats() {
  const { data, isPending, isError } = useMarkets();
  const { label } = useNetwork();
  const markets = data ?? [];
  const primary = markets[0];
  const dividends = primary
    ? markets
        .filter((market) => market.account.dividendMint.equals(primary.account.dividendMint))
        .reduce((sum, market) => sum + market.totalDividends, 0n)
    : 0n;

  const stats = [
    { label: "Live markets", value: isError ? "-" : String(markets.length), live: true },
    {
      label: "Dividends paid",
      value: primary ? `${formatAmount(dividends, primary.dividend.decimals, 2)} ${primary.dividendSymbol}` : "-",
      live: true,
    },
    {
      label: "Network",
      value: (
        <>
          <span className="hidden sm:inline">Solana </span>
          {label}
        </>
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
