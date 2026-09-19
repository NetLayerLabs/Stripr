import type { PublicKey } from "@solana/web3.js";
import deployment from "@/config/deployment.json";
import type { Cluster } from "./config";
import { shortAddress } from "./format";

export type TokenMeta = { symbol: string; name: string };

// Token names per network, maintained by the seed scripts; unknown mints fall back to their address.
const registries = deployment as unknown as Partial<Record<Cluster, { tokens: Record<string, TokenMeta> }>>;

export function tokenMeta(mint: PublicKey, cluster: Cluster): TokenMeta {
  const address = mint.toBase58();
  return registries[cluster]?.tokens[address] ?? { symbol: shortAddress(address, 3), name: "Unlisted token" };
}

/**
 * initialize_market is permissionless, so on mainnet anyone could open a market on a junk
 * mint or squat a real one with a fake quote token. The app only shows mainnet markets whose
 * stock and dividend mints are both in the registry; devnet shows everything.
 */
export function isListedMarket(underlying: PublicKey, dividend: PublicKey, cluster: Cluster): boolean {
  if (cluster !== "mainnet-beta") return true;
  const tokens = registries[cluster]?.tokens ?? {};
  return underlying.toBase58() in tokens && dividend.toBase58() in tokens;
}
