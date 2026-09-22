export type Cluster = "devnet" | "mainnet-beta";

export const CLUSTERS: Cluster[] = ["devnet", "mainnet-beta"];

export const CLUSTER_LABELS: Record<Cluster, string> = {
  devnet: "Devnet",
  "mainnet-beta": "Mainnet",
};

export const parseCluster = (value: string | null | undefined): Cluster | null =>
  value === "devnet" || value === "mainnet-beta" ? value : null;

/** Network shown before a visitor picks one: the real markets, with devnet a switch away. */
export const DEFAULT_CLUSTER: Cluster =
  parseCluster(process.env.NEXT_PUBLIC_SOLANA_CLUSTER) ?? "mainnet-beta";

/**
 * RPC the browser talks to. The public mainnet RPC rejects browser requests, so mainnet
 * goes through this app's /api/rpc proxy unless a provider URL is configured.
 */
export function clientRpcUrl(cluster: Cluster): string {
  if (cluster === "devnet") {
    return (
      process.env.NEXT_PUBLIC_DEVNET_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com"
    );
  }
  if (process.env.NEXT_PUBLIC_MAINNET_RPC_URL) return process.env.NEXT_PUBLIC_MAINNET_RPC_URL;
  const origin = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
  return `${origin}/api/rpc/mainnet-beta`;
}

/** RPC used by API routes on the server. */
export function serverRpcUrl(cluster: Cluster): string {
  if (cluster === "devnet") {
    return (
      process.env.DEVNET_RPC_URL ||
      process.env.NEXT_PUBLIC_DEVNET_RPC_URL ||
      process.env.NEXT_PUBLIC_RPC_URL ||
      "https://api.devnet.solana.com"
    );
  }
  return process.env.MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com";
}

const explorerQuery = (cluster: Cluster) => (cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`);

export const explorerTxUrl = (signature: string, cluster: Cluster) =>
  `https://explorer.solana.com/tx/${signature}${explorerQuery(cluster)}`;

export const explorerAddressUrl = (address: string, cluster: Cluster) =>
  `https://explorer.solana.com/address/${address}${explorerQuery(cluster)}`;
