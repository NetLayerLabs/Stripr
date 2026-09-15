import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AAPLX_MINT = "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
// The public mainnet RPC rejects browser-origin requests, so the landing page reads it through here.
const MAINNET_RPC = process.env.MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com";
const CACHE_MS = 5 * 60 * 1000;

const EXTENSION_LABELS: Record<string, string> = {
  scaledUiAmountConfig: "Scaled UI Amount",
  pausableConfig: "Pausable",
  permanentDelegate: "Permanent delegate",
  transferHook: "Transfer hook",
  confidentialTransferMint: "Confidential transfers",
  defaultAccountState: "Default account state",
  metadataPointer: "Metadata",
};

export type AaplxSnapshot = {
  isToken2022: boolean;
  multiplier: number;
  newMultiplier: number;
  newMultiplierEffectiveTimestamp: number;
  extensions: string[];
};

type MintExtension = { extension: string; state?: Record<string, unknown> };

let cache: { snapshot: AaplxSnapshot; fetchedAt: number } | null = null;

async function fetchSnapshot(): Promise<AaplxSnapshot> {
  const response = await fetch(MAINNET_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [AAPLX_MINT, { encoding: "jsonParsed" }],
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Mainnet RPC responded ${response.status}`);

  const body = (await response.json()) as {
    result?: { value: { owner: string; data: { parsed?: { info?: { extensions?: MintExtension[] } } } } | null };
  };
  const value = body.result?.value;
  const extensions = value?.data.parsed?.info?.extensions ?? [];
  const scaled = extensions.find((ext) => ext.extension === "scaledUiAmountConfig")?.state as
    | { multiplier: string; newMultiplier: string; newMultiplierEffectiveTimestamp: number }
    | undefined;
  if (!value || !scaled) throw new Error("AAPLx mint data unavailable");

  return {
    isToken2022: value.owner === TOKEN_2022,
    multiplier: Number(scaled.multiplier),
    newMultiplier: Number(scaled.newMultiplier),
    newMultiplierEffectiveTimestamp: scaled.newMultiplierEffectiveTimestamp,
    extensions: [...new Set(extensions.map((ext) => EXTENSION_LABELS[ext.extension]).filter(Boolean))],
  };
}

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return NextResponse.json(cache.snapshot);
  try {
    const snapshot = await fetchSnapshot();
    cache = { snapshot, fetchedAt: Date.now() };
    return NextResponse.json(snapshot);
  } catch {
    if (cache) return NextResponse.json(cache.snapshot);
    return NextResponse.json({ error: "Mainnet data unavailable" }, { status: 502 });
  }
}
