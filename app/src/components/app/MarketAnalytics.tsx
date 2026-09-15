"use client";

import { ArrowUpRight } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { BarTimeline } from "@/components/charts/BarTimeline";
import { ChartCard, DataTable, Legend } from "@/components/charts/ChartCard";
import { StepLineChart, type LineSeries } from "@/components/charts/StepLineChart";
import { TokenIcon, type TokenKind } from "@/components/ui";
import { useMarketHistory } from "@/hooks/useMarketHistory";
import {
  dividendSeries,
  eventAmount,
  eventTime,
  formatChartTime,
  formatCompact,
  formatDateTime,
  formatNumber,
  reinvestSeries,
  supplySeries,
  timeAgo,
  toUnits,
  type MarketEvent,
} from "@/lib/analytics";
import { useNetwork } from "@/components/NetworkProvider";
import { formatAmount, shortAddress } from "@/lib/format";
import { MULTIPLIER_ONE, sharesForRaw, type MarketView } from "@/lib/stripr";

const EVENT_META: Record<string, { label: string; asset: TokenKind }> = {
  stripped: { label: "Strip", asset: "stock" },
  redeemed: { label: "Redeem", asset: "stock" },
  ytLocked: { label: "Lock YT", asset: "yt" },
  ytUnlocked: { label: "Unlock YT", asset: "yt" },
  dividendDistributed: { label: "Cash dividend", asset: "usd" },
  yieldClaimed: { label: "Claim cash", asset: "usd" },
  multiplierSynced: { label: "Dividend reinvested", asset: "stock" },
  stockYieldClaimed: { label: "Claim stock", asset: "stock" },
};

const CHART_HEIGHT = 260;

const multiplierText = (multiplier: bigint) => (Number(multiplier) / Number(MULTIPLIER_ONE)).toFixed(4);

export function MarketAnalytics({ market }: { market: MarketView }) {
  const history = useMarketHistory(market.address.toBase58());
  const supply = useMemo(() => supplySeries(history.data ?? []), [history.data]);
  const dividends = useMemo(() => dividendSeries(history.data ?? []), [history.data]);
  const reinvested = useMemo(() => reinvestSeries(history.data ?? []), [history.data]);

  const { decimals } = market.underlying;
  const dividendDecimals = market.dividend.decimals;
  const times = supply.map((point) => point.time);
  const span = (points: Array<{ time: number }>) => (points.length ? points[points.length - 1].time - points[0].time : 0);

  const series: LineSeries[] = [
    {
      key: "stripped",
      label: `${market.symbol} stripped into PT and YT`,
      shortLabel: "Stripped",
      color: "var(--series-1)",
      values: supply.map((point) => toUnits(point.stripped, decimals)),
    },
    {
      key: "locked",
      label: "YT locked and earning",
      shortLabel: "YT locked",
      color: "var(--series-2)",
      values: supply.map((point) => toUnits(point.locked, decimals)),
    },
  ];

  // Reinvested stock is shown in share units at the multiplier it was released at.
  const reinvestBars = reinvested.map((point) => ({
    key: point.signature,
    time: point.time,
    value: toUnits((point.freed * point.multiplier) / MULTIPLIER_ONE, decimals),
  }));
  const cashBars = dividends.map((dividend) => ({
    key: dividend.signature,
    time: dividend.time,
    value: toUnits(dividend.amount, dividendDecimals),
  }));

  const withState = (content: ReactNode) => {
    if (history.isPending) return <div className="skeleton w-full" style={{ height: CHART_HEIGHT }} />;
    if (history.isError && !history.data) {
      return (
        <div className="grid place-items-center text-sm text-zinc-500" style={{ height: CHART_HEIGHT }}>
          Market history is unavailable right now.
        </div>
      );
    }
    return <div className={history.isFetching ? "opacity-70 transition-opacity" : undefined}>{content}</div>;
  };

  return (
    <section aria-labelledby="analytics-heading" className="space-y-6">
      <div>
        <h2 id="analytics-heading" className="text-lg font-semibold text-white">
          Market analytics
        </h2>
        <p className="mt-1 text-sm text-zinc-500">Rebuilt from this market’s on-chain Stripr events.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          className="xl:col-span-2"
          title="Supply over time"
          description={`${market.symbol} stripped into PT and YT (share units), and how much of that YT is locked and earning.`}
          legend={<Legend items={series.map((line) => ({ label: line.label, color: line.color }))} />}
          table={
            <DataTable
              columns={["Time", `Stripped (${market.symbol})`, "YT locked"]}
              rows={supply
                .map((point) => [
                  formatDateTime(point.time),
                  formatNumber(toUnits(point.stripped, decimals)),
                  formatNumber(toUnits(point.locked, decimals)),
                ])
                .reverse()}
            />
          }
        >
          {withState(
            <StepLineChart
              times={times}
              series={series}
              height={CHART_HEIGHT}
              ariaLabel={`Supply over time for ${market.symbol}. Use left and right arrow keys to step through events.`}
              formatValue={(value) => formatNumber(value)}
              formatAxis={formatCompact}
              formatTime={(time) => formatChartTime(time, span(supply))}
              formatTooltipTime={formatDateTime}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Reinvested dividends"
          description={`${market.symbol} released to locked YT each time the stock’s multiplier rose.`}
          table={
            <DataTable
              columns={["Time", `Reinvested (${market.symbol})`, "Multiplier"]}
              rows={reinvested
                .map((point) => [
                  formatDateTime(point.time),
                  formatNumber(toUnits((point.freed * point.multiplier) / MULTIPLIER_ONE, decimals), 6),
                  multiplierText(point.multiplier),
                ])
                .reverse()}
            />
          }
        >
          {withState(
            <BarTimeline
              bars={reinvestBars}
              color="var(--series-1)"
              height={CHART_HEIGHT}
              emptyLabel="No reinvested dividends yet"
              ariaLabel={`Reinvested ${market.symbol} dividends paid to locked YT`}
              formatValue={(value) => `${formatNumber(value, 4)} ${market.symbol}`}
              formatAxis={formatCompact}
              formatTime={(time) => formatChartTime(time, span(reinvested))}
              formatTooltipTime={formatDateTime}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Cash dividends"
          description={`${market.dividendSymbol} paid to locked YT in each distribution.`}
          table={
            <DataTable
              columns={["Time", `Payout (${market.dividendSymbol})`]}
              rows={dividends
                .map((dividend) => [formatDateTime(dividend.time), formatNumber(toUnits(dividend.amount, dividendDecimals))])
                .reverse()}
            />
          }
        >
          {withState(
            <BarTimeline
              bars={cashBars}
              color="var(--series-1)"
              height={CHART_HEIGHT}
              emptyLabel="No cash dividends distributed yet"
              ariaLabel={`${market.dividendSymbol} dividend distributions for ${market.symbol}`}
              formatValue={(value) => `${formatNumber(value)} ${market.dividendSymbol}`}
              formatAxis={formatCompact}
              formatTime={(time) => formatChartTime(time, span(dividends))}
              formatTooltipTime={formatDateTime}
            />
          )}
        </ChartCard>
      </div>

      <RecentActivity
        market={market}
        events={history.data ?? []}
        loading={history.isPending}
        unavailable={history.isError && !history.data}
      />
    </section>
  );
}

function RecentActivity({
  market,
  events,
  loading,
  unavailable,
}: {
  market: MarketView;
  events: MarketEvent[];
  loading: boolean;
  unavailable: boolean;
}) {
  const { addressUrl, txUrl } = useNetwork();
  const recent = useMemo(() => [...events].reverse().slice(0, 12), [events]);

  const amountLabel = (event: MarketEvent) => {
    const meta = EVENT_META[event.name];
    const amount = eventAmount(event);
    const { decimals } = market.underlying;
    if (event.name === "multiplierSynced") {
      const multiplier = BigInt(event.data.multiplier ?? "0");
      const released = (BigInt(event.data.freed ?? "0") * multiplier) / MULTIPLIER_ONE;
      return `+${formatAmount(released, decimals, 4)} ${market.symbol} · ×${multiplierText(multiplier)}`;
    }
    if (meta?.asset === "usd") return `${formatAmount(amount, market.dividend.decimals, 2)} ${market.dividendSymbol}`;
    if (meta?.asset === "yt") return `${formatAmount(amount, decimals, 2)} YT-${market.symbol}`;
    const shares = event.data.shares ? BigInt(event.data.shares) : sharesForRaw(market, amount);
    return `${formatAmount(shares, decimals, 4)} ${market.symbol}`;
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <h3 className="font-semibold text-white">Recent activity</h3>
        <span className="text-xs text-zinc-500">
          {loading ? "Loading…" : unavailable ? "Unavailable" : `${events.length} on-chain events`}
        </span>
      </div>
      {recent.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-zinc-500">
          {loading
            ? "Loading activity…"
            : unavailable
              ? "Activity is unavailable right now. It will retry automatically."
              : "No activity in this market yet."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left">
                <th className="label px-5 py-3 font-medium sm:px-6">Event</th>
                <th className="label px-5 py-3 font-medium">Account</th>
                <th className="label px-5 py-3 text-right font-medium">Amount</th>
                <th className="label px-5 py-3 text-right font-medium">Time</th>
                <th className="label px-5 py-3 text-right font-medium sm:px-6">Transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {recent.map((event, index) => {
                const meta = EVENT_META[event.name] ?? { label: event.name, asset: "stock" as TokenKind };
                const time = eventTime(event);
                return (
                  <tr key={`${event.signature}-${event.name}-${index}`}>
                    <td className="px-5 py-3 sm:px-6">
                      <span className="flex items-center gap-2.5 text-zinc-100">
                        <TokenIcon kind={meta.asset} symbol={market.symbol} size="sm" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {event.data.user ? (
                        <a
                          href={addressUrl(event.data.user)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-zinc-400 transition-colors hover:text-zinc-200"
                        >
                          {shortAddress(event.data.user)}
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-500">
                          {event.name === "multiplierSynced" ? "Stock issuer" : "Market admin"}
                        </span>
                      )}
                    </td>
                    <td className="num px-5 py-3 text-right text-zinc-200">{amountLabel(event)}</td>
                    <td className="num px-5 py-3 text-right text-zinc-500" title={formatDateTime(time)}>
                      {timeAgo(time)}
                    </td>
                    <td className="px-5 py-3 text-right sm:px-6">
                      <a
                        href={txUrl(event.signature)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-zinc-400 transition-colors hover:text-zinc-200"
                      >
                        {shortAddress(event.signature, 5)}
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
