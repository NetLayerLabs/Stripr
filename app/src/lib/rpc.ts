import { serverRpcUrl, type Cluster } from "@/lib/config";

const PUBLIC_RPC: Record<Cluster, string> = {
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

/** The configured provider first, then the network's public RPC. */
export function serverRpcUrls(cluster: Cluster): string[] {
  return [...new Set([serverRpcUrl(cluster), PUBLIC_RPC[cluster]])];
}

/** A provider answering this is out of quota or unwell; the next endpoint should get a turn. */
const shouldFallBack = (status: number) => status === 429 || status >= 500;

/**
 * POSTs a JSON-RPC body to the provider, falling back to the public RPC when the
 * provider is rate-limited, out of credits, or down. Without this, an exhausted plan
 * on one provider takes every mainnet page down with it. The last response is
 * returned as-is when every endpoint refuses.
 */
export async function rpcFetch(cluster: Cluster, body: string): Promise<Response> {
  const urls = serverRpcUrls(cluster);
  let last: Response | null = null;
  for (const [i, url] of urls.entries()) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        cache: "no-store",
      });
      if (!shouldFallBack(response.status) || i === urls.length - 1) return response;
      last = response;
    } catch (error) {
      if (i === urls.length - 1) throw error;
    }
  }
  return last as Response;
}

/**
 * A `fetch` for web3.js `Connection` that applies the same fallback, so code that talks
 * to the chain through a Connection survives an exhausted provider too.
 */
export function fallbackFetch(cluster: Cluster) {
  return async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
    rpcFetch(cluster, typeof init?.body === "string" ? init.body : String(init?.body ?? ""));
}
