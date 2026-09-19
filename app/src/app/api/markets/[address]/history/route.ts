import { EventParser } from "@anchor-lang/core";
import { Connection, PublicKey, type ConfirmedSignatureInfo } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { DEFAULT_CLUSTER, parseCluster, serverRpcUrl, type Cluster } from "@/lib/config";
import { PROGRAM_ID, getProgram } from "@/lib/stripr";
import devnetSnapshot from "@/config/history.devnet.json";

export const dynamic = "force-dynamic";
// Rebuilding history crawls many transactions; give a serverless host time to finish.
export const runtime = "nodejs";
export const maxDuration = 60;

const SIGNATURE_LIMIT = 500;
// Public RPCs allow ~40 getTransaction calls per 10s per IP, so every lookup
// goes through one queue with a pause between calls.
const MIN_INTERVAL_MS = 350;
const LIST_CACHE_MS = 20_000;

export type MarketEvent = {
  signature: string;
  slot: number;
  blockTime: number | null;
  /** camelCase event name, e.g. "stripped" or "dividendDistributed". */
  name: string;
  /** Event fields as strings (u64/u128 amounts stay exact). */
  data: Record<string, string>;
};

type Snapshot = Record<string, { newestSignature: string; events: MarketEvent[] }>;
// Committed by scripts/snapshot-history.ts: charts paint from this at once, and only
// transactions newer than each market's snapshot are fetched from the RPC.
// The JSON import is typed from its current contents; the snapshot shape is what matters.
const SNAPSHOTS: Partial<Record<Cluster, Snapshot>> = { devnet: devnetSnapshot as unknown as Snapshot };

// Confirmed transactions never change, so decoded events are cached per signature;
// an interrupted load resumes where it stopped on the next request.
const eventsBySignature = new Map<string, MarketEvent[]>();
const marketCache = new Map<string, { events: MarketEvent[]; fetchedAt: number }>();
const inflight = new Map<string, Promise<MarketEvent[]>>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let queue: Promise<unknown> = Promise.resolve();
function throttled<T>(run: () => Promise<T>): Promise<T> {
  const result = queue.then(run);
  queue = result.then(
    () => sleep(MIN_INTERVAL_MS),
    () => sleep(MIN_INTERVAL_MS)
  );
  return result;
}

async function withBackoff<T>(run: () => Promise<T>, attempts = 5): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt >= attempts || !/429|too many requests/i.test(message)) throw error;
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
}

const camel = (value: string) =>
  value.charAt(0).toLowerCase() + value.slice(1).replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());

async function decodeTransaction(
  cluster: Cluster,
  connection: Connection,
  parser: EventParser,
  signature: ConfirmedSignatureInfo
): Promise<MarketEvent[]> {
  const cacheKey = `${cluster}:${signature.signature}`;
  const cached = eventsBySignature.get(cacheKey);
  if (cached) return cached;

  const transaction = await withBackoff(() =>
    throttled(() =>
      connection.getTransaction(signature.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })
    )
  );
  if (!transaction) return [];

  const events: MarketEvent[] = [];
  for (const event of parser.parseLogs(transaction.meta?.logMessages ?? [])) {
    events.push({
      signature: signature.signature,
      slot: signature.slot,
      blockTime: signature.blockTime ?? null,
      name: camel(event.name),
      data: Object.fromEntries(
        Object.entries(event.data as Record<string, unknown>).map(([key, value]) => [camel(key), String(value)])
      ),
    });
  }
  eventsBySignature.set(cacheKey, events);
  return events;
}

async function loadEvents(cluster: Cluster, market: PublicKey): Promise<MarketEvent[]> {
  const connection = new Connection(serverRpcUrl(cluster), "confirmed");
  const parser = new EventParser(PROGRAM_ID, getProgram(connection).coder);
  const key = market.toBase58();
  const snapshot = SNAPSHOTS[cluster]?.[key];
  const signatures = (
    await withBackoff(() =>
      connection.getSignaturesForAddress(market, { limit: SIGNATURE_LIMIT, until: snapshot?.newestSignature })
    )
  )
    .filter((signature) => !signature.err)
    .reverse(); // oldest first, so events within a slot keep their on-chain order

  const events: MarketEvent[] = [...(snapshot?.events ?? [])];
  for (const signature of signatures) {
    for (const event of await decodeTransaction(cluster, connection, parser, signature)) {
      if (event.data.market === key) events.push(event);
    }
  }
  return events.sort((a, b) => a.slot - b.slot);
}

export async function GET(request: Request, { params }: { params: { address: string } }) {
  let market: PublicKey;
  try {
    market = new PublicKey(params.address);
  } catch {
    return NextResponse.json({ error: "Invalid market address." }, { status: 400 });
  }
  const cluster = parseCluster(new URL(request.url).searchParams.get("cluster")) ?? DEFAULT_CLUSTER;

  const key = `${cluster}:${market.toBase58()}`;
  const cached = marketCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < LIST_CACHE_MS) return NextResponse.json(cached.events);

  let pending = inflight.get(key);
  if (!pending) {
    pending = loadEvents(cluster, market).finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }

  try {
    const events = await pending;
    marketCache.set(key, { events, fetchedAt: Date.now() });
    return NextResponse.json(events);
  } catch (error) {
    if (cached) return NextResponse.json(cached.events);
    const message = error instanceof Error ? error.message : "History unavailable.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
