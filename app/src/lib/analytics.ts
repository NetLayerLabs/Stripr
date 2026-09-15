import type { MarketEvent } from "@/app/api/markets/[address]/history/route";

export type { MarketEvent };

export type SupplyPoint = { time: number; stripped: bigint; locked: bigint };
export type DividendPoint = { signature: string; time: number; amount: bigint };

const timeOf = (event: MarketEvent) => (event.blockTime ?? 0) * 1000;
const amountOf = (event: MarketEvent) => BigInt(event.data.amount ?? "0");

/** Stock stripped and YT locked after each event, merged per second. */
export function supplySeries(events: MarketEvent[]): SupplyPoint[] {
  let stripped = 0n;
  let locked = 0n;
  const points: SupplyPoint[] = [];

  for (const event of events) {
    const amount = amountOf(event);
    // PT/YT supply is in share units; events from before the multiplier upgrade only carry the raw amount.
    const shares = event.data.shares ? BigInt(event.data.shares) : amount;
    if (event.name === "stripped") stripped += shares;
    else if (event.name === "redeemed") stripped -= shares;
    else if (event.name === "ytLocked") locked += amount;
    else if (event.name === "ytUnlocked") locked -= amount;
    else continue;

    const time = timeOf(event);
    const last = points[points.length - 1];
    if (last && last.time === time) {
      last.stripped = stripped;
      last.locked = locked;
    } else {
      points.push({ time, stripped, locked });
    }
  }
  return points;
}

export function dividendSeries(events: MarketEvent[]): DividendPoint[] {
  return events
    .filter((event) => event.name === "dividendDistributed")
    .map((event) => ({ signature: event.signature, time: timeOf(event), amount: amountOf(event) }));
}

export type ReinvestPoint = { signature: string; time: number; freed: bigint; multiplier: bigint };

/** Multiplier updates that released stock for YT holders (reinvested dividends). */
export function reinvestSeries(events: MarketEvent[]): ReinvestPoint[] {
  return events
    .filter((event) => event.name === "multiplierSynced" && BigInt(event.data.freed ?? "0") > 0n)
    .map((event) => ({
      signature: event.signature,
      time: timeOf(event),
      freed: BigInt(event.data.freed ?? "0"),
      multiplier: BigInt(event.data.multiplier ?? "0"),
    }));
}

export const eventTime = timeOf;
export const eventAmount = amountOf;

export const toUnits = (value: bigint, decimals: number) => Number(value) / 10 ** decimals;

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
export const formatCompact = (value: number) => compact.format(value);

export const formatNumber = (value: number, maxFraction = 2) =>
  value.toLocaleString("en-US", { maximumFractionDigits: maxFraction });

/** Axis tick labels: seconds for short spans, times within a day, dates beyond. */
export function formatChartTime(time: number, spanMs: number) {
  const options: Intl.DateTimeFormatOptions =
    spanMs < 60 * 60_000
      ? { hour: "numeric", minute: "2-digit", second: "2-digit" }
      : spanMs < 24 * 60 * 60_000
        ? { hour: "numeric", minute: "2-digit" }
        : { month: "short", day: "numeric" };
  return new Intl.DateTimeFormat("en-US", options).format(time);
}

export const formatDateTime = (time: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(time);

export function timeAgo(time: number, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
