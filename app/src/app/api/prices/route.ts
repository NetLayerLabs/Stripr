import { NextResponse } from "next/server";
import pythConfig from "@/config/pyth.json";

export const dynamic = "force-dynamic";

/**
 * Reference stock prices from Pyth, for pricing PT and YT.
 *
 * Pyth's price API needs an API key (free at https://pythdata.app), which stays
 * on the server. Without one the route reports `enabled: false` and the app hides
 * its price panels. Feed metadata, including market hours, is public.
 */
const HERMES = "https://hermes.pyth.network";
const CACHE_MS = 30_000;
const METADATA_CACHE_MS = 10 * 60_000;

type Feed = { market: string; roundTheClock?: string };
const FEEDS = (pythConfig as { feeds: Record<string, Feed> }).feeds;

export type StockPrice = {
  symbol: string;
  /** Reference price in USD. */
  price: number;
  /** Pyth's confidence interval, in USD. */
  confidence: number;
  publishTime: number;
  /** True when this came from a 24/7 index feed rather than the US market feed. */
  roundTheClock: boolean;
  /** US market hours for the stock, from Pyth feed metadata. */
  marketOpen: boolean | null;
  nextOpen: number | null;
};

export type PricesResponse = {
  enabled: boolean;
  prices: Record<string, StockPrice>;
  /** Why prices are off, when they are: no key, or the key lacks equity access. */
  reason?: string;
};

let cache: { at: number; body: PricesResponse } | null = null;
let metadataCache: { at: number; hours: Map<string, { open: boolean; nextOpen: number | null }> } | null = null;

const apiKey = () => process.env.PYTH_API_KEY?.trim() || "";

/** Market hours per feed id. Public endpoint, so this works without a key. */
async function marketHours() {
  if (metadataCache && Date.now() - metadataCache.at < METADATA_CACHE_MS) return metadataCache.hours;
  const hours = new Map<string, { open: boolean; nextOpen: number | null }>();
  try {
    const response = await fetch(`${HERMES}/v2/price_feeds?asset_type=equity`, { cache: "no-store" });
    if (response.ok) {
      const feeds = (await response.json()) as Array<{
        id: string;
        market_hours?: { is_open?: boolean; next_open?: number | null };
      }>;
      for (const feed of feeds) {
        hours.set(feed.id, {
          open: feed.market_hours?.is_open === true,
          nextOpen: feed.market_hours?.next_open ?? null,
        });
      }
    }
  } catch {
    // Metadata is a nice-to-have; prices still work without it.
  }
  metadataCache = { at: Date.now(), hours };
  return hours;
}

export async function GET() {
  const key = apiKey();
  if (!key) {
    return NextResponse.json({
      enabled: false,
      prices: {},
      reason: "No PYTH_API_KEY configured.",
    } satisfies PricesResponse);
  }
  if (cache && Date.now() - cache.at < CACHE_MS) return NextResponse.json(cache.body);

  const hours = await marketHours();
  // Prefer the 24/7 feed when the US market is closed, so prices show at any hour.
  const wanted = Object.entries(FEEDS).map(([symbol, feed]) => {
    const marketIsOpen = hours.get(feed.market)?.open ?? false;
    const id = !marketIsOpen && feed.roundTheClock ? feed.roundTheClock : feed.market;
    return { symbol, id, roundTheClock: id !== feed.market, marketFeed: feed.market };
  });

  const query = wanted.map((feed) => `ids%5B%5D=${feed.id}`).join("&");
  try {
    const response = await fetch(`${HERMES}/v2/updates/price/latest?${query}&parsed=true`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) {
      // A key without equity entitlement (403) or an invalid key (401) isn't an
      // outage: report prices as off so the app hides its price panels quietly.
      const reason =
        response.status === 403
          ? "This Pyth key has no entitlement for US equity feeds."
          : response.status === 401
            ? "Pyth rejected the API key."
            : `Pyth responded ${response.status}.`;
      const off: PricesResponse = { enabled: false, prices: {}, reason };
      cache = { at: Date.now(), body: off };
      return NextResponse.json(off);
    }
    const body = (await response.json()) as {
      parsed?: Array<{ id: string; price: { price: string; conf: string; expo: number; publish_time: number } }>;
    };

    const prices: Record<string, StockPrice> = {};
    for (const entry of body.parsed ?? []) {
      const feed = wanted.find((candidate) => candidate.id.toLowerCase() === entry.id.toLowerCase());
      if (!feed) continue;
      const scale = 10 ** entry.price.expo;
      const marketHour = hours.get(feed.marketFeed);
      prices[feed.symbol] = {
        symbol: feed.symbol,
        price: Number(entry.price.price) * scale,
        confidence: Number(entry.price.conf) * scale,
        publishTime: entry.price.publish_time,
        roundTheClock: feed.roundTheClock,
        marketOpen: marketHour ? marketHour.open : null,
        nextOpen: marketHour?.nextOpen ?? null,
      };
    }

    const result: PricesResponse = { enabled: true, prices };
    cache = { at: Date.now(), body: result };
    return NextResponse.json(result);
  } catch {
    if (cache) return NextResponse.json(cache.body);
    return NextResponse.json({
      enabled: false,
      prices: {},
      reason: "Pyth is unreachable right now.",
    } satisfies PricesResponse);
  }
}
