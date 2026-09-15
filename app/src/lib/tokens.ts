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
