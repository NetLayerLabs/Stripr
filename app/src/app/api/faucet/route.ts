import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  unpackMint,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { NextResponse } from "next/server";
import { serverRpcUrl } from "@/lib/config";
import { describeError } from "@/lib/errors";
import { getProgram } from "@/lib/stripr";

export const dynamic = "force-dynamic";

const STOCK_PER_REQUEST = 100n;
const SOL_TOP_UP = 0.05 * LAMPORTS_PER_SOL;
const COOLDOWN_MS = 10 * 60 * 1000;

// Per server instance only; enough to stop casual spam on a devnet demo faucet.
const lastRequest = new Map<string, number>();
const lastRequestByIp = new Map<string, number>();

/** The faucet signs with the demo stock's mint authority and only ever talks to devnet. */
function faucetKeypair(): Keypair | null {
  // A mainnet deployment has no business running a faucet, even a devnet one.
  if (process.env.NEXT_PUBLIC_SOLANA_CLUSTER === "mainnet-beta") return null;
  const secret = process.env.FAUCET_SECRET_KEY;
  if (!secret) return null;
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret) as number[]));
  } catch {
    return null;
  }
}

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export function GET() {
  return NextResponse.json({ enabled: faucetKeypair() !== null });
}

export async function POST(request: Request) {
  const faucet = faucetKeypair();
  if (!faucet) return fail("The faucet is not enabled.", 404);

  let wallet: PublicKey;
  let market: PublicKey;
  try {
    const body = (await request.json()) as { wallet?: string; market?: string };
    wallet = new PublicKey(body.wallet ?? "");
    market = new PublicKey(body.market ?? "");
  } catch {
    return fail("Invalid wallet or market address.", 400);
  }

  const key = wallet.toBase58();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const waited = Math.min(
    Date.now() - (lastRequest.get(key) ?? 0),
    Date.now() - (lastRequestByIp.get(ip) ?? 0)
  );
  if (waited < COOLDOWN_MS) {
    return fail(`Faucet already used. Try again in ${Math.ceil((COOLDOWN_MS - waited) / 60_000)} min.`, 429);
  }
  lastRequest.set(key, Date.now());
  lastRequestByIp.set(ip, Date.now());

  try {
    const connection = new Connection(serverRpcUrl("devnet"), "confirmed");
    const account = await getProgram(connection).account.market.fetchNullable(market);
    if (!account) throw new Error("Market not found on devnet.");

    const mintInfo = await connection.getAccountInfo(account.underlyingMint);
    if (!mintInfo) throw new Error("Stock mint not found.");
    const tokenProgram = mintInfo.owner;
    const mint = unpackMint(account.underlyingMint, mintInfo, tokenProgram);
    if (!mint.mintAuthority?.equals(faucet.publicKey)) {
      throw new Error("The faucet isn't the mint authority for this stock.");
    }

    const tokenAccount = getAssociatedTokenAddressSync(mint.address, wallet, true, tokenProgram);
    const transaction = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        faucet.publicKey,
        tokenAccount,
        wallet,
        mint.address,
        tokenProgram
      ),
      createMintToInstruction(
        mint.address,
        tokenAccount,
        faucet.publicKey,
        STOCK_PER_REQUEST * 10n ** BigInt(mint.decimals),
        [],
        tokenProgram
      )
    );
    const topUpSol = (await connection.getBalance(wallet)) < SOL_TOP_UP;
    if (topUpSol) {
      transaction.add(
        SystemProgram.transfer({ fromPubkey: faucet.publicKey, toPubkey: wallet, lamports: SOL_TOP_UP })
      );
    }

    const signature = await sendAndConfirmTransaction(connection, transaction, [faucet], {
      commitment: "confirmed",
    });
    return NextResponse.json({ signature, amount: STOCK_PER_REQUEST.toString(), sol: topUpSol });
  } catch (error) {
    lastRequest.delete(key);
    lastRequestByIp.delete(ip);
    return fail(describeError(error), 500);
  }
}
