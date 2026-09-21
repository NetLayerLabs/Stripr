import { NextResponse } from "next/server";
import deployment from "@/config/deployment.json";
import { serverRpcUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Live dividend ledger for xStocks on mainnet, read straight from each mint's Token-2022
 * Scaled UI Amount config. An issuer pays a dividend by raising the multiplier; the
 * ratio between the pending and current multiplier is the dividend, and Stripr pays
 * that same ratio of principal to locked YT. No oracle, no admin, no key.
 */
const JUPITER = "https://lite-api.jup.ag/price/v3";
const CACHE_MS = 5 * 60_000;

const MAINNET_TOKENS = (deployment as { "mainnet-beta"?: { tokens: Record<string, { symbol: string; name: string }> } })[
  "mainnet-beta"
]?.tokens ?? {};
const EXTRA: Record<string, { symbol: string; name: string }> = {
  XsGVi5eo1Dh2zUpic4qACcjuWGjNv8GCt3dm5XcX6Dn: { symbol: "JNJx", name: "Johnson & Johnson xStock" },
  XsaBXg8dU5cPM6ehmVctMkVqoiRG2ZjMo1cyBJ3AykQ: { symbol: "KOx", name: "Coca-Cola xStock" },
  XsYdjDjNUygZ7yGKfQaB6TxLh2gC6RRjzLtLAGJrhzV: { symbol: "PGx", name: "Procter & Gamble xStock" },
};

export type DividendRow = {
  symbol: string;
  name: string;
  mint: string;
  /** Multiplier in force now and the one the issuer has scheduled. */
  multiplier: number;
  newMultiplier: number;
  effectiveAt: number;
  /** The most recent dividend as a fraction of principal (newMultiplier / multiplier - 1). */
  lastDividendPct: number;
  /** Stock price in USD (Jupiter), and the dividend in USD per share. */
  price: number | null;
  lastDividendUsdPerShare: number | null;
  /** What 100 locked YT would have received from that dividend, in stock and USD. */
  ytPer100Shares: number;
  ytPer100Usd: number | null;
  paused: boolean;
};

export type DividendLedger = { rows: DividendRow[]; readAt: number };

let cache: { at: number; body: DividendLedger } | null = null;

type ParsedMint = {
  owner: string;
  data: { parsed?: { info?: { extensions?: Array<{ extension: string; state?: Record<string, unknown> }> } } };
};

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) return NextResponse.json(cache.body);

  const mints = { ...MAINNET_TOKENS, ...EXTRA };
  const ids = Object.keys(mints).filter((mint) => mints[mint].symbol !== "USDC");
  try {
    const [accounts, prices] = await Promise.all([
      fetch(serverRpcUrl("mainnet-beta"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getMultipleAccounts",
          params: [ids, { encoding: "jsonParsed" }],
        }),
        cache: "no-store",
      }).then(async (r) => {
        if (!r.ok) throw new Error(`Mainnet RPC responded ${r.status}`);
        return ((await r.json()) as { result?: { value: Array<ParsedMint | null> } }).result?.value ?? [];
      }),
      fetch(`${JUPITER}?ids=${ids.join(",")}`, { cache: "no-store" })
        .then(async (r) => (r.ok ? ((await r.json()) as Record<string, { usdPrice?: number; stockData?: { price?: number } }>) : {}))
        .catch(() => ({}) as Record<string, { usdPrice?: number; stockData?: { price?: number } }>),
    ]);

    const rows: DividendRow[] = [];
    ids.forEach((mint, index) => {
      const account = accounts[index];
      const extensions = account?.data.parsed?.info?.extensions ?? [];
      const scaled = extensions.find((e) => e.extension === "scaledUiAmountConfig")?.state as
        | { multiplier: string; newMultiplier: string; newMultiplierEffectiveTimestamp: number }
        | undefined;
      if (!scaled) return;
      const pausable = extensions.find((e) => e.extension === "pausableConfig")?.state as { paused?: boolean } | undefined;
      const multiplier = Number(scaled.multiplier);
      const newMultiplier = Number(scaled.newMultiplier);
      const pct = multiplier > 0 ? newMultiplier / multiplier - 1 : 0;
      const price = prices[mint]?.stockData?.price ?? prices[mint]?.usdPrice ?? null;
      // A multiplier rise from m to n frees (1 - m/n) of the raw tokens backing principal.
      const freedPerShare = newMultiplier > 0 ? 1 - multiplier / newMultiplier : 0;
      rows.push({
        symbol: mints[mint].symbol,
        name: mints[mint].name,
        mint,
        multiplier,
        newMultiplier,
        effectiveAt: scaled.newMultiplierEffectiveTimestamp,
        lastDividendPct: pct,
        price,
        lastDividendUsdPerShare: price === null ? null : pct * price,
        ytPer100Shares: 100 * freedPerShare,
        ytPer100Usd: price === null ? null : 100 * freedPerShare * price,
        paused: pausable?.paused === true,
      });
    });
    rows.sort((a, b) => b.lastDividendPct - a.lastDividendPct);

    const body: DividendLedger = { rows, readAt: Math.floor(Date.now() / 1000) };
    cache = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch (error) {
    if (cache) return NextResponse.json(cache.body);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Mainnet data unavailable" }, { status: 502 });
  }
}
