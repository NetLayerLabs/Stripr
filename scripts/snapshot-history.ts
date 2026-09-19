/**
 * Writes a snapshot of every market's decoded Stripr events to
 * app/src/config/history.<cluster>.json, so the app's history API paints charts
 * at once and only fetches transactions newer than the snapshot.
 *
 *   anchor run snapshot-history --provider.cluster devnet
 *
 * Re-run after seeding or re-pricing, before deploying the app.
 */
import * as anchor from "@anchor-lang/core";
import { EventParser, Program } from "@anchor-lang/core";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Stripr } from "../target/types/stripr";

const { PublicKey } = anchor.web3;
type PublicKey = anchor.web3.PublicKey;

type MarketEvent = {
  signature: string;
  slot: number;
  blockTime: number | null;
  name: string;
  data: Record<string, string>;
};
type Snapshot = Record<string, { newestSignature: string; events: MarketEvent[] }>;

const SIGNATURE_LIMIT = 1000;
const INTERVAL_MS = 350; // public RPC allows ~40 getTransaction calls per 10s

const clusterOf = (endpoint: string) =>
  endpoint.includes("devnet") ? "devnet" : endpoint.includes("mainnet") ? "mainnet-beta" : "localnet";
const camel = (value: string) =>
  value.charAt(0).toLowerCase() + value.slice(1).replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(label: string, run: () => Promise<T>, attempts = 5): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= attempts) throw error;
      console.warn(`  retrying ${label} (${attempt}/${attempts - 1})`);
      await sleep(1500 * attempt);
    }
  }
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.stripr as Program<Stripr>;
  const { connection } = provider;
  const cluster = clusterOf(connection.rpcEndpoint);
  const parser = new EventParser(program.programId, program.coder);
  const file = path.join(__dirname, `../app/src/config/history.${cluster}.json`);

  let previous: Snapshot = {};
  try {
    previous = JSON.parse(readFileSync(file, "utf8")) as Snapshot;
  } catch {
    // First snapshot for this cluster.
  }

  const markets = await withRetry("list markets", () =>
    program.account.market.all([{ dataSize: program.account.market.size }])
  );
  const snapshot: Snapshot = {};
  for (const { publicKey: market } of markets) {
    const key = market.toBase58();
    const known = previous[key];
    // Only transactions newer than the last snapshot are fetched.
    const signatures = (
      await withRetry(`signatures ${key.slice(0, 6)}`, () =>
        connection.getSignaturesForAddress(
          market,
          { limit: SIGNATURE_LIMIT, until: known?.newestSignature },
          "confirmed"
        )
      )
    )
      .filter((signature) => !signature.err)
      .reverse();

    const fresh: MarketEvent[] = [];
    for (const signature of signatures) {
      const transaction = await withRetry(`tx ${signature.signature.slice(0, 6)}`, () =>
        connection.getTransaction(signature.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })
      );
      await sleep(INTERVAL_MS);
      if (!transaction) continue;
      for (const event of parser.parseLogs(transaction.meta?.logMessages ?? [])) {
        const data = Object.fromEntries(
          Object.entries(event.data as Record<string, unknown>).map(([field, value]) => [camel(field), String(value)])
        );
        if (data.market !== key) continue;
        fresh.push({
          signature: signature.signature,
          slot: signature.slot,
          blockTime: signature.blockTime ?? null,
          name: camel(event.name),
          data,
        });
      }
    }

    const events = [...(known?.events ?? []), ...fresh].sort((a, b) => a.slot - b.slot);
    const newest = signatures.length ? signatures[signatures.length - 1].signature : known?.newestSignature ?? "";
    snapshot[key] = { newestSignature: newest, events };
    console.log(`${key.slice(0, 6)}… ${events.length} events (${fresh.length} new)`);
  }

  writeFileSync(file, `${JSON.stringify(snapshot)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), file)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
