import { NextResponse } from "next/server";
import { parseCluster, serverRpcUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

// Public Solana RPCs reject requests from browser origins, so the app's reads and
// transaction submissions go through here. Only methods the app actually uses pass.
const ALLOWED_METHODS = new Set([
  "getAccountInfo",
  "getBalance",
  "getBlockHeight",
  "getEpochInfo",
  "getFeeForMessage",
  "getGenesisHash",
  "getHealth",
  "getLatestBlockhash",
  "getMinimumBalanceForRentExemption",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getRecentPrioritizationFees",
  "getSignatureStatuses",
  "getSlot",
  "getTokenAccountBalance",
  "getTokenAccountsByOwner",
  "getVersion",
  "isBlockhashValid",
  "sendTransaction",
  "simulateTransaction",
]);
const MAX_BODY_BYTES = 256_000;
const MAX_BATCH = 5;

/** Only this app's own pages may relay through here; other sites get 403. */
function sameOrigin(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const reject = (message: string, status: number) =>
  NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message } }, { status });

export async function POST(request: Request, { params }: { params: { cluster: string } }) {
  const cluster = parseCluster(params.cluster);
  if (!cluster) return reject("Unknown network.", 404);
  if (!sameOrigin(request)) return reject("Forbidden.", 403);

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return reject("Request too large.", 413);

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return reject("Invalid JSON.", 400);
  }
  const calls = Array.isArray(payload) ? payload : [payload];
  const allowed =
    calls.length > 0 &&
    calls.length <= MAX_BATCH &&
    calls.every((call) => ALLOWED_METHODS.has((call as { method?: unknown })?.method as string));
  if (!allowed) return reject("Method not allowed.", 403);

  try {
    const upstream = await fetch(serverRpcUrl(cluster), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
    });
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return reject("Upstream RPC is unavailable.", 502);
  }
}
