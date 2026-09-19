/**
 * Opens a Stripr market for each real xStocks mint on Solana mainnet, with
 * mainnet USDC as the dividend mint.
 *
 *   anchor run open-mainnet-markets --provider.cluster mainnet --provider.wallet ~/.config/solana/stripr-mainnet-deployer.json
 *
 * The xStocks mints come from the "mainnet-beta" key of app/src/config/deployment.json
 * (the USDC entry is skipped). Each mint gets one initialize_market call, paid for and
 * administered by the provider wallet; mints whose market PDA already exists are skipped.
 *
 * DRY_RUN=1, the default when the variable is unset, only reads the chain: it verifies
 * each mint (owner program, decimals, Token-2022 extensions), derives the market PDA,
 * quotes rent for the six accounts initialize_market creates and prints the plan with
 * the total SOL. Nothing is signed or sent unless DRY_RUN=0.
 *
 *   DRY_RUN=1 anchor run open-mainnet-markets ...                  plan only (default)
 *   DRY_RUN=0 SYMBOLS=AAPLx,SPYx anchor run open-mainnet-markets ... open just those markets
 *   PRIORITY_FEE_MICROLAMPORTS=50000 ...                            add a compute-unit price per transaction
 *
 * A live run refuses to send when the connected cluster is not mainnet, the program is
 * not deployed there, or the wallet holds less than the estimate plus a small headroom.
 */
import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import {
  ACCOUNT_SIZE,
  AccountState,
  ExtensionType,
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAccountLen,
  getDefaultAccountState,
  getExtensionTypes,
  getMint,
} from "@solana/spl-token";
import { readFileSync } from "fs";
import path from "path";
import type { Stripr } from "../target/types/stripr";

const { ComputeBudgetProgram, LAMPORTS_PER_SOL, PublicKey } = anchor.web3;
type PublicKey = anchor.web3.PublicKey;

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const MAINNET_GENESIS_HASH = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const DEPLOYMENT_FILE = path.join(__dirname, "../app/src/config/deployment.json");
/** Base fee of the single-signer initialize_market transaction. */
const SIGNATURE_FEE_LAMPORTS = 5_000;
/** Compute-unit limit set on each transaction; initialize_market creates six accounts through CPIs. */
const COMPUTE_UNITS = 300_000;
/** Kept in the wallet beyond the estimate so a fee bump can't strand a half-opened set. */
const HEADROOM_LAMPORTS = 5_000_000;

type TokenMeta = { symbol: string; name: string };
type Deployment = Record<string, { tokens: Record<string, TokenMeta> }>;
type Stock = TokenMeta & { mint: PublicKey };
type Plan = Stock & {
  tokenProgram: PublicKey;
  decimals: number;
  extensions: string[];
  frozenByDefault: boolean;
  market: PublicKey;
  /** `open`: no market yet. `exists`: already open. `unreadable`: an account sits at the PDA but isn't a Market. */
  status: "open" | "exists" | "unreadable";
  vaultSize: number;
  rentLamports: number;
};

const sleep = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));
const sol = (lamports: number) => `${(lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`;
const short = (key: PublicKey) => `${key.toBase58().slice(0, 4)}…${key.toBase58().slice(-4)}`;
const programName = (id: PublicKey) =>
  id.equals(TOKEN_2022_PROGRAM_ID) ? "Token-2022" : id.equals(TOKEN_PROGRAM_ID) ? "SPL Token" : id.toBase58();

/** Retries transient RPC failures (rate limits, expired blockhashes) with backoff. */
async function withRetry<T>(label: string, run: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= attempts) throw error;
      console.warn(`  retrying ${label} (${attempt}/${attempts - 1}): ${(error as Error).message.split("\n")[0]}`);
      await sleep(2 * attempt);
    }
  }
}

/**
 * Extensions Token-2022 requires on a new token account for a mint with
 * `mintExtensions`: the rule the program's `init` constraint applies on-chain
 * (spl-token-2022's `get_required_init_account_extensions`). Deliberately not
 * spl-token's `getAccountLenForMint`, which also budgets a confidential-transfer
 * account extension the on-chain rule leaves out.
 */
function requiredAccountExtensions(mintExtensions: ExtensionType[]): ExtensionType[] {
  const required: ExtensionType[] = [];
  for (const extension of mintExtensions) {
    if (extension === ExtensionType.TransferFeeConfig) required.push(ExtensionType.TransferFeeAmount);
    if (extension === ExtensionType.NonTransferable)
      required.push(ExtensionType.NonTransferableAccount, ExtensionType.ImmutableOwner);
    if (extension === ExtensionType.TransferHook) required.push(ExtensionType.TransferHookAccount);
    if (extension === ExtensionType.PausableConfig) required.push(ExtensionType.PausableAccount);
  }
  return required;
}

function selectStocks(): Stock[] {
  const deployment = JSON.parse(readFileSync(DEPLOYMENT_FILE, "utf8")) as Deployment;
  const tokens = deployment["mainnet-beta"]?.tokens ?? {};
  const listedUsdc = Object.entries(tokens).find(([, meta]) => meta.symbol === "USDC")?.[0];
  if (listedUsdc && listedUsdc !== USDC_MINT.toBase58()) {
    throw new Error(`deployment.json lists USDC as ${listedUsdc}, but this script pays dividends in ${USDC_MINT}`);
  }
  const stocks = Object.entries(tokens)
    .filter(([, meta]) => meta.symbol !== "USDC")
    .map(([mint, meta]) => ({ ...meta, mint: new PublicKey(mint) }));
  if (stocks.length === 0) throw new Error("No xStocks mints under mainnet-beta in app/src/config/deployment.json");

  const wanted = (process.env.SYMBOLS ?? "")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);
  if (wanted.length === 0) return stocks;
  return wanted.map((symbol) => {
    const stock = stocks.find((candidate) => candidate.symbol.toLowerCase() === symbol.toLowerCase());
    if (!stock) throw new Error(`Unknown symbol ${symbol}; mainnet-beta lists ${stocks.map((s) => s.symbol).join(", ")}`);
    return stock;
  });
}

async function main() {
  const dryRun = process.env.DRY_RUN !== "0";
  const priorityFee = Number(process.env.PRIORITY_FEE_MICROLAMPORTS ?? 0);
  if (!Number.isInteger(priorityFee) || priorityFee < 0) throw new Error("PRIORITY_FEE_MICROLAMPORTS must be a non-negative integer");
  const stocks = selectStocks();

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.stripr as Program<Stripr>;
  const { connection } = provider;
  const admin = provider.wallet.publicKey;
  const pda = (...seeds: Buffer[]) => PublicKey.findProgramAddressSync(seeds, program.programId)[0];

  console.log(`${dryRun ? "DRY RUN (nothing will be signed or sent)" : "LIVE RUN"} against ${connection.rpcEndpoint}`);
  const genesis = await withRetry("read genesis hash", () => connection.getGenesisHash());
  if (genesis !== MAINNET_GENESIS_HASH) {
    throw new Error(`This script targets mainnet-beta (genesis ${MAINNET_GENESIS_HASH}); the endpoint reports ${genesis}`);
  }

  const balance = await withRetry("read admin balance", () => connection.getBalance(admin));
  console.log(`Admin wallet: ${admin.toBase58()} (${sol(balance)})`);

  const programInfo = await withRetry("read program", () => connection.getAccountInfo(program.programId));
  const programDeployed = programInfo?.executable === true;
  console.log(`Program ${program.programId.toBase58()}: ${programDeployed ? "deployed" : "NOT deployed on mainnet"}`);

  const usdcInfo = await withRetry("read USDC mint", () => connection.getAccountInfo(USDC_MINT));
  if (!usdcInfo) throw new Error(`USDC mint ${USDC_MINT} not found`);
  if (!usdcInfo.owner.equals(TOKEN_PROGRAM_ID)) {
    throw new Error(`USDC mint ${USDC_MINT} is owned by ${usdcInfo.owner}, expected the SPL Token program`);
  }
  const usdc = await withRetry("decode USDC mint", () => getMint(connection, USDC_MINT, "confirmed", TOKEN_PROGRAM_ID));
  if (usdc.decimals !== 6) throw new Error(`USDC mint reports ${usdc.decimals} decimals, expected 6`);
  console.log(`Dividend mint: USDC ${USDC_MINT.toBase58()} (SPL Token, ${usdc.decimals} decimals)`);

  const rentQuotes = new Map<number, number>();
  const rentFor = async (size: number) => {
    let quote = rentQuotes.get(size);
    if (quote === undefined) {
      quote = await withRetry(`rent quote for ${size} bytes`, () => connection.getMinimumBalanceForRentExemption(size));
      rentQuotes.set(size, quote);
    }
    return quote;
  };
  const marketSize = program.account.market.size;

  const plans: Plan[] = [];
  for (const stock of stocks) {
    const info = await withRetry(`read ${stock.symbol} mint`, () => connection.getAccountInfo(stock.mint));
    if (!info) throw new Error(`${stock.symbol} mint ${stock.mint} does not exist on mainnet`);
    const tokenProgram = info.owner;
    if (!tokenProgram.equals(TOKEN_2022_PROGRAM_ID) && !tokenProgram.equals(TOKEN_PROGRAM_ID)) {
      throw new Error(`${stock.symbol} mint ${stock.mint} is owned by ${tokenProgram}, not a token program`);
    }
    const mint = await withRetry(`decode ${stock.symbol} mint`, () =>
      getMint(connection, stock.mint, "confirmed", tokenProgram)
    );
    const extensionTypes = getExtensionTypes(mint.tlvData);
    const market = pda(Buffer.from("market"), stock.mint.toBuffer());
    const marketInfo = await withRetry(`read ${stock.symbol} market`, () => connection.getAccountInfo(market));
    let status: Plan["status"] = "open";
    if (marketInfo) {
      try {
        program.coder.accounts.decode("Market", marketInfo.data);
        status = marketInfo.owner.equals(program.programId) ? "exists" : "unreadable";
      } catch {
        status = "unreadable";
      }
    }
    // initialize_market creates the market, the PT and YT mints (no extensions), the
    // underlying vault (sized for the stock mint's extensions), the YT escrow and the
    // USDC dividend vault.
    const vaultSize = tokenProgram.equals(TOKEN_2022_PROGRAM_ID)
      ? getAccountLen(requiredAccountExtensions(extensionTypes))
      : ACCOUNT_SIZE;
    let rentLamports = 0;
    for (const size of [marketSize, MINT_SIZE, MINT_SIZE, vaultSize, ACCOUNT_SIZE, ACCOUNT_SIZE]) {
      rentLamports += await rentFor(size);
    }
    plans.push({
      ...stock,
      tokenProgram,
      decimals: mint.decimals,
      extensions: extensionTypes.map((type) => ExtensionType[type]),
      frozenByDefault: getDefaultAccountState(mint)?.state === AccountState.Frozen,
      market,
      status,
      vaultSize,
      rentLamports,
    });
  }

  const feePerTx = SIGNATURE_FEE_LAMPORTS + Math.ceil((COMPUTE_UNITS * priorityFee) / 1_000_000);
  console.log("\nPlan:");
  for (const plan of plans) {
    console.log(`  ${plan.symbol.padEnd(6)} ${plan.mint.toBase58()}  ${programName(plan.tokenProgram)}, ${plan.decimals} decimals`);
    console.log(`         extensions: ${plan.extensions.length ? plan.extensions.join(", ") : "none"}`);
    console.log(`         market PDA: ${plan.market.toBase58()}`);
    if (plan.frozenByDefault) {
      console.log("         WARNING: new token accounts of this mint start frozen; the vault needs thawing before anyone can strip");
    }
    if (plan.status === "exists") console.log("         already open, skipping");
    else if (plan.status === "unreadable") console.log("         an account that is not a Market sits at the PDA, skipping");
    else {
      console.log(
        `         rent ${sol(plan.rentLamports)} (market ${marketSize} B, PT+YT mints 2×${MINT_SIZE} B, vault ${plan.vaultSize} B, ` +
          `escrow ${ACCOUNT_SIZE} B, dividend vault ${ACCOUNT_SIZE} B) + fee ${sol(feePerTx)}`
      );
    }
  }

  const pending = plans.filter((plan) => plan.status === "open");
  const rentTotal = pending.reduce((sum, plan) => sum + plan.rentLamports, 0);
  const feeTotal = pending.length * feePerTx;
  const estimate = rentTotal + feeTotal;
  const required = estimate + HEADROOM_LAMPORTS;
  console.log(
    `\n${pending.length} of ${plans.length} market(s) to open: rent ${sol(rentTotal)} + fees ${sol(feeTotal)} = ${sol(estimate)}` +
      ` (wallet needs ${sol(required)} incl. ${sol(HEADROOM_LAMPORTS)} headroom; holds ${sol(balance)})`
  );
  if (!programDeployed) console.log("The program is not deployed on mainnet yet; deploy it before opening markets.");

  if (dryRun) {
    console.log("Dry run: nothing was signed or sent. Re-run with DRY_RUN=0 to open the markets.");
    return;
  }
  if (pending.length === 0) {
    console.log("Nothing to open.");
    return;
  }
  if (!programDeployed) throw new Error("Refusing to send: the Stripr program is not deployed on mainnet");
  if (balance < required) {
    throw new Error(
      `Refusing to send: ${short(admin)} holds ${sol(balance)} but opening ${pending.length} market(s) needs ${sol(required)}`
    );
  }

  const budget = [ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNITS })];
  if (priorityFee > 0) budget.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }));
  for (const plan of pending) {
    const signature = await withRetry(`open ${plan.symbol} market`, async () => {
      // A retry after a confirmation timeout must not trip over the market it already opened.
      if (await program.account.market.fetchNullable(plan.market)) return "already open";
      return program.methods
        .initializeMarket()
        .accountsPartial({
          admin,
          underlyingMint: plan.mint,
          dividendMint: USDC_MINT,
          tokenProgram: plan.tokenProgram,
          dividendTokenProgram: TOKEN_PROGRAM_ID,
        })
        .preInstructions(budget)
        .rpc();
    });
    console.log(`Opened ${plan.symbol} market ${plan.market.toBase58()} (${signature})`);
  }

  const remaining = await connection.getBalance(admin);
  console.log(`Done. Admin balance: ${sol(remaining)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
