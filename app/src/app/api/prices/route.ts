import { NextResponse } from "next/server";
import deployment from "@/config/deployment.json";
import pythConfig from "@/config/pyth.json";

export const dynamic = "force-dynamic";

/**
 * Reference stock prices for pricing PT and YT.
 *
 * Two sources: Pyth's equity feeds when PYTH_API_KEY has entitlement for them, otherwise
 * Jupiter's public price API for the matching xStock (no key needed; it carries the
 * underlying stock price alongside the token price). If neither works the route reports
 * prices as off and the app hides its price panels.
 */
const HERMES = "https://hermes.pyth.network";
const JUPITER = "https://lite-api.jup.ag/price/v3";
const CACHE_MS = 30_000;
const METADATA_CACHE_MS = 10 * 60_000;

type Feed = { market: string; roundTheClock?: string; xstock?: string };
const FEEDS = (pythConfig as { feeds: Record<string, Feed> }).feeds;
const MAINNET_TOKENS = (deployment as { "mainnet-beta"?: { tokens: Record<string, { symbol: string }> } })["mainnet-beta"]
  ?.tokens ?? {};

export type PriceSource = "pyth" | "jupiter";

export type StockPrice = {
  symbol: string;
  /** Reference price of the stock in USD. */
  price: number;
  /** Pyth's confidence interval in USD; 0 for Jupiter. */
  confidence: number;
  publishTime: number;
  source: PriceSource;
  /** True when this came from Pyth's 24/7 index feed rather than its US market feed. */
  roundTheClock: boolean;
  /** US market hours for the stock, from Pyth feed metadata; null when unknown. */
  marketOpen: boolean | null;
  nextOpen: number | null;
};

export type PricesResponse = {
  enabled: boolean;
  prices: Record<string, StockPrice>;
  source?: PriceSource;
  /** Why prices are off, when they are. */
  reason?: string;
};

let cache: { at: number; body: PricesResponse } | null = null;
let metadataCache: { at: number; hours: Map<string, { open: boolean; nextOpen: number | null }> } | null = null;

const apiKey = () => process.env.PYTH_API_KEY?.trim() || "";

/** Every symbol we can price: the demo stocks (via their xStock twin) and the real xStocks themselves. */
function symbolsToXstockMints(): Record<string, string> {
  const mints: Record<string, string> = {};
  for (const [mint, meta] of Object.entries(MAINNET_TOKENS)) {
    if (meta.symbol !== "USDC") mints[meta.symbol] = mint;
  }
  for (const [symbol, feed] of Object.entries(FEEDS)) {
    if (feed.xstock) mints[symbol] = feed.xstock;
  }
  return mints;
}

/** Market hours per Pyth feed id. Public endpoint, so this works without a key. */
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
        hours.set(feed.id, { open: feed.market_hours?.is_open === true, nextOpen: feed.market_hours?.next_open ?? null });
      }
    }
  } catch {
    // Metadata is a nice-to-have; prices still work without it.
  }
  metadataCache = { at: Date.now(), hours };
  return hours;
}

type PythOutcome = { prices: Record<string, StockPrice> } | { reason: string };

async function fromPyth(key: string): Promise<PythOutcome> {
  const hours = await marketHours();
  // Prefer the 24/7 feed when the US market is closed, so prices show at any hour.
  const wanted = Object.entries(FEEDS).map(([symbol, feed]) => {
    const marketIsOpen = hours.get(feed.market)?.open ?? false;
    const id = !marketIsOpen && feed.roundTheClock ? feed.roundTheClock : feed.market;
    return { symbol, id, roundTheClock: id !== feed.market, marketFeed: feed.market };
  });
  const query = wanted.map((feed) => `ids%5B%5D=${feed.id}`).join("&");
  const response = await fetch(`${HERMES}/v2/updates/price/latest?${query}&parsed=true`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!response.ok) {
    return {
      reason:
        response.status === 403
          ? "This Pyth key has no entitlement for US equity feeds."
          : response.status === 401
            ? "Pyth rejected the API key."
            : `Pyth responded ${response.status}.`,
    };
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
      source: "pyth",
      roundTheClock: feed.roundTheClock,
      marketOpen: marketHour ? marketHour.open : null,
      nextOpen: marketHour?.nextOpen ?? null,
    };
  }
  return { prices };
}

type JupiterEntry = {
  usdPrice?: number;
  stockData?: { price?: number; updatedAt?: string };
};

async function fromJupiter(): Promise<Record<string, StockPrice>> {
  const mints = symbolsToXstockMints();
  const ids = [...new Set(Object.values(mints))];
  if (ids.length === 0) return {};
  const response = await fetch(`${JUPITER}?ids=${ids.join(",")}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Jupiter responded ${response.status}.`);
  const body = (await response.json()) as Record<string, JupiterEntry | undefined>;
  const prices: Record<string, StockPrice> = {};
  for (const [symbol, mint] of Object.entries(mints)) {
    const entry = body[mint];
    // The stock's own price is the anchor for PT/YT; the token's on-chain price is the fallback.
    const price = entry?.stockData?.price ?? entry?.usdPrice;
    if (!entry || !price || price <= 0) continue;
    const updated = entry.stockData?.updatedAt ? Date.parse(entry.stockData.updatedAt) : NaN;
    prices[symbol] = {
      symbol,
      price,
      confidence: 0,
      publishTime: Number.isFinite(updated) ? Math.floor(updated / 1000) : Math.floor(Date.now() / 1000),
      source: "jupiter",
      roundTheClock: false,
      marketOpen: null,
      nextOpen: null,
    };
  }
  return prices;
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) return NextResponse.json(cache.body);

  const reasons: string[] = [];
  const key = apiKey();
  if (key) {
    try {
      const outcome = await fromPyth(key);
      if ("prices" in outcome && Object.keys(outcome.prices).length > 0) {
        const body: PricesResponse = { enabled: true, prices: outcome.prices, source: "pyth" };
        cache = { at: Date.now(), body };
        return NextResponse.json(body);
      }
      reasons.push("reason" in outcome ? outcome.reason : "Pyth returned no prices.");
    } catch {
      reasons.push("Pyth is unreachable right now.");
    }
  } else {
    reasons.push("No PYTH_API_KEY configured.");
  }

  try {
    const prices = await fromJupiter();
    if (Object.keys(prices).length > 0) {
      const body: PricesResponse = { enabled: true, prices, source: "jupiter" };
      cache = { at: Date.now(), body };
      return NextResponse.json(body);
    }
    reasons.push("Jupiter returned no xStock prices.");
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : "Jupiter is unreachable right now.");
  }

  const off: PricesResponse = { enabled: false, prices: {}, reason: reasons.join(" ") };
  if (cache?.body.enabled) return NextResponse.json(cache.body);
  cache = { at: Date.now(), body: off };
  return NextResponse.json(off);
}
