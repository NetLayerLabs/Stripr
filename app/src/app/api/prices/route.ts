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
  /**
   * The dividend rate this stock's Scaled UI Amount multiplier has actually delivered
   * since its token launched, annualized. Null when it can't be measured.
   */
  annualizedRate: number | null;
  /** US market hours for the stock, from Pyth feed metadata; null when unknown. */
  marketOpen: boolean | null;
  nextOpen: number | null;
  /**
   * What the xStock itself trades at on-chain, per share, when `price` is Pyth's price
   * for the underlying stock. Null when there is no second opinion to compare.
   */
  tokenPrice: number | null;
  /** tokenPrice / price - 1: how far the token trades above (+) or below (-) the stock. */
  premium: number | null;
};

export type PricesResponse = {
  enabled: boolean;
  prices: Record<string, StockPrice>;
  /** "pyth" when at least one stock is priced by Pyth; the rest still come from Jupiter. */
  source?: PriceSource;
  /** Underlying stocks Pyth priced, e.g. ["QQQ", "TSLA"]. */
  pyth?: string[];
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

/**
 * Pyth's price for each underlying stock the key is entitled to. Every feed is asked for
 * on its own: Hermes refuses a whole batch if any one feed in it is outside the key's
 * plan, and a key usually covers only some equities. A refused feed is simply absent.
 */
async function fromPyth(key: string): Promise<Record<string, StockPrice>> {
  const hours = await marketHours();
  const fetchFeed = async (id: string) => {
    const response = await fetch(`${HERMES}/v2/updates/price/latest?ids%5B%5D=${id}&parsed=true`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      parsed?: Array<{ price: { price: string; conf: string; expo: number; publish_time: number } }>;
    };
    return body.parsed?.[0]?.price ?? null;
  };

  const entries = await Promise.all(
    Object.entries(FEEDS).map(async ([symbol, feed]) => {
      const marketHour = hours.get(feed.market);
      const open = marketHour?.open ?? false;
      // Out of US hours the 24/7 feed is the live one; the US feed holds the last close.
      const order = !open && feed.roundTheClock ? [feed.roundTheClock, feed.market] : [feed.market];
      for (const id of order) {
        const price = await fetchFeed(id).catch(() => null);
        if (!price) continue;
        const scale = 10 ** price.expo;
        const quote: StockPrice = {
          symbol,
          price: Number(price.price) * scale,
          confidence: Number(price.conf) * scale,
          publishTime: price.publish_time,
          source: "pyth",
          annualizedRate: null,
          roundTheClock: id !== feed.market,
          marketOpen: marketHour ? marketHour.open : null,
          nextOpen: marketHour?.nextOpen ?? null,
          tokenPrice: null,
          premium: null,
        };
        return [symbol, quote] as const;
      }
      return null;
    }),
  );
  return Object.fromEntries(entries.filter((e): e is readonly [string, StockPrice] => e !== null));
}

type JupiterEntry = {
  /** What the token itself trades at, per displayed token (the multiplier is already in it). */
  usdPrice?: number;
  stockData?: { price?: number; updatedAt?: string };
  createdAt?: string;
  scaledUiConfig?: { multiplier?: number; newMultiplier?: number; newMultiplierEffectiveAt?: string };
};

/** The multiplier in force right now: a scheduled one only counts once its timestamp passes. */
function effectiveMultiplier(config: JupiterEntry["scaledUiConfig"]): number | undefined {
  if (!config) return undefined;
  const effectiveAt = config.newMultiplierEffectiveAt ? Date.parse(config.newMultiplierEffectiveAt) : NaN;
  if (config.newMultiplier && Number.isFinite(effectiveAt) && Date.now() >= effectiveAt) return config.newMultiplier;
  return config.multiplier ?? config.newMultiplier;
}

/** Total growth of the in-force multiplier since launch, annualized. */
function annualize(multiplier: number | undefined, createdAt: string | undefined): number | null {
  if (!multiplier || multiplier <= 1 || !createdAt) return null;
  const days = (Date.now() - Date.parse(createdAt)) / 86_400_000;
  if (!Number.isFinite(days) || days < 30) return null;
  return multiplier ** (365 / days) - 1;
}

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
      annualizedRate: annualize(effectiveMultiplier(entry.scaledUiConfig), entry.createdAt),
      roundTheClock: false,
      marketOpen: null,
      nextOpen: null,
      tokenPrice: entry.usdPrice && entry.usdPrice > 0 ? entry.usdPrice : null,
      premium: null,
    };
  }
  return prices;
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) return NextResponse.json(cache.body);

  const reasons: string[] = [];
  let jupiter: Record<string, StockPrice> = {};
  try {
    jupiter = await fromJupiter();
    if (Object.keys(jupiter).length === 0) reasons.push("Jupiter returned no xStock prices.");
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : "Jupiter is unreachable right now.");
  }

  const key = apiKey();
  const pyth = key ? await fromPyth(key).catch(() => ({}) as Record<string, StockPrice>) : {};
  if (!key) reasons.push("No PYTH_API_KEY configured.");

  // Jupiter prices every xStock and supplies its dividend rate. Where Pyth has the
  // underlying stock, its price becomes the reference and the token's own price is
  // kept beside it, so the gap between the two can be shown rather than hidden.
  const prices: Record<string, StockPrice> = {};
  for (const [symbol, jup] of Object.entries(jupiter)) {
    const stock = pyth[symbol.replace(/x$/, "")];
    if (!stock) {
      prices[symbol] = jup;
      continue;
    }
    const tokenPrice = jup.tokenPrice;
    prices[symbol] = {
      ...stock,
      symbol,
      annualizedRate: jup.annualizedRate,
      tokenPrice,
      premium: tokenPrice ? tokenPrice / stock.price - 1 : null,
    };
  }

  if (Object.keys(prices).length > 0) {
    const pythSymbols = Object.keys(pyth).sort();
    const body: PricesResponse = {
      enabled: true,
      prices,
      source: pythSymbols.length > 0 ? "pyth" : "jupiter",
      pyth: pythSymbols,
    };
    cache = { at: Date.now(), body };
    return NextResponse.json(body);
  }

  const off: PricesResponse = { enabled: false, prices: {}, reason: reasons.join(" ") };
  if (cache?.body.enabled) return NextResponse.json(cache.body);
  cache = { at: Date.now(), body: off };
  return NextResponse.json(off);
}
