import { AnchorProvider, BN, Program, type IdlAccounts } from "@anchor-lang/core";
import {
  getAssociatedTokenAddressSync,
  getScaledUiAmountConfig,
  unpackAccount,
  unpackMint,
  type Mint,
} from "@solana/spl-token";
import {
  PublicKey,
  type Connection,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";
import idl from "@/idl/stripr.json";
import type { Stripr } from "@/idl/stripr";
import type { Cluster } from "./config";
import { pow10 } from "./format";
import { isListedMarket, tokenMeta } from "./tokens";

export type MarketAccount = IdlAccounts<Stripr>["market"];
export type PositionAccount = IdlAccounts<Stripr>["yieldPosition"];

export const PROGRAM_ID = new PublicKey(idl.address);

/** Matches `ACC_PRECISION` in the program. */
export const ACC_PRECISION = 1_000_000_000_000n;
/** Matches `MULTIPLIER_ONE` in the program. */
export const MULTIPLIER_ONE = 1_000_000_000_000n;

type SigningWallet = {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
};

const readOnlyWallet: SigningWallet = {
  publicKey: PublicKey.default,
  signTransaction: () => Promise.reject(new Error("Connect a wallet to sign")),
  signAllTransactions: () => Promise.reject(new Error("Connect a wallet to sign")),
};

export function getProgram(connection: Connection, wallet: SigningWallet = readOnlyWallet) {
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  return new Program<Stripr>(idl as Stripr, provider);
}

export const toBigInt = (value: BN) => BigInt(value.toString());
export const toBN = (value: bigint) => new BN(value.toString());

export const findPositionAddress = (market: PublicKey, owner: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("position"), market.toBytes(), owner.toBytes()],
    PROGRAM_ID
  )[0];

export const ataAddress = (mint: PublicKey, owner: PublicKey, tokenProgram: PublicKey) =>
  getAssociatedTokenAddressSync(mint, owner, true, tokenProgram);

export type MintView = {
  address: PublicKey;
  decimals: number;
  programId: PublicKey;
  mintAuthority: PublicKey | null;
  /** Effective scaled UI multiplier right now; 1 for mints without the extension. */
  uiMultiplier: number;
};

export type MarketView = {
  address: PublicKey;
  account: MarketAccount;
  underlying: MintView;
  dividend: MintView;
  symbol: string;
  name: string;
  dividendSymbol: string;
  /** Outstanding PT/YT supply, in share units. */
  totalStripped: bigint;
  totalYtLocked: bigint;
  totalDividends: bigint;
  accDividendPerYt: bigint;
  /** Multiplier the market last synced to, scaled by `MULTIPLIER_ONE`. */
  multiplier: bigint;
  /** The stock mint's multiplier right now, scaled by `MULTIPLIER_ONE`. */
  currentMultiplier: bigint;
  accStockPerYt: bigint;
  pendingStockYield: bigint;
  totalStockYield: bigint;
};

function currentUiMultiplier(mint: Mint) {
  const config = getScaledUiAmountConfig(mint);
  if (!config) return 1;
  const now = BigInt(Math.floor(Date.now() / 1000));
  return now >= config.newMultiplierEffectiveTimestamp ? config.newMultiplier : config.multiplier;
}

export async function fetchMarkets(connection: Connection, cluster: Cluster): Promise<MarketView[]> {
  const program = getProgram(connection);
  // Only accounts with the current layout; markets from older program versions are skipped.
  const markets = await program.account.market.all([{ dataSize: program.account.market.size }]);
  if (markets.length === 0) return [];

  const mintKeys = [
    ...new Map(
      markets
        .flatMap(({ account }) => [account.underlyingMint, account.dividendMint])
        .map((key) => [key.toBase58(), key])
    ).values(),
  ];
  const infos = await connection.getMultipleAccountsInfo(mintKeys);
  const mints = new Map<string, MintView>();
  mintKeys.forEach((address, index) => {
    const info = infos[index];
    if (!info) return;
    const mint = unpackMint(address, info, info.owner);
    mints.set(address.toBase58(), {
      address,
      decimals: mint.decimals,
      programId: info.owner,
      mintAuthority: mint.mintAuthority,
      uiMultiplier: currentUiMultiplier(mint),
    });
  });

  return markets
    .flatMap(({ publicKey, account }) => {
      if (!isListedMarket(account.underlyingMint, account.dividendMint, cluster)) return [];
      const underlying = mints.get(account.underlyingMint.toBase58());
      const dividend = mints.get(account.dividendMint.toBase58());
      if (!underlying || !dividend) return [];
      const meta = tokenMeta(account.underlyingMint, cluster);
      return [
        {
          address: publicKey,
          account,
          underlying,
          dividend,
          symbol: meta.symbol,
          name: meta.name,
          dividendSymbol: tokenMeta(account.dividendMint, cluster).symbol,
          totalStripped: toBigInt(account.totalStripped),
          totalYtLocked: toBigInt(account.totalYtLocked),
          totalDividends: toBigInt(account.totalDividends),
          accDividendPerYt: toBigInt(account.accDividendPerYt),
          multiplier: toBigInt(account.multiplier),
          currentMultiplier: BigInt(Math.floor(underlying.uiMultiplier * Number(MULTIPLIER_ONE))),
          accStockPerYt: toBigInt(account.accStockPerYt),
          pendingStockYield: toBigInt(account.pendingStockYield),
          totalStockYield: toBigInt(account.totalStockYield),
        },
      ];
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export type PositionView = {
  lamports: number;
  /** Raw stock balance; show it with `sharesForRaw`. */
  underlying: bigint;
  pt: bigint;
  yt: bigint;
  dividend: bigint;
  ytLocked: bigint;
  totalClaimed: bigint;
  /** Raw stock yield claimed to date. */
  totalStockClaimed: bigint;
  account: PositionAccount | null;
};

export async function fetchPosition(
  connection: Connection,
  market: MarketView,
  owner: PublicKey
): Promise<PositionView> {
  const { account, underlying, dividend } = market;
  const tokenAccounts = [
    ataAddress(account.underlyingMint, owner, underlying.programId),
    ataAddress(account.ptMint, owner, underlying.programId),
    ataAddress(account.ytMint, owner, underlying.programId),
    ataAddress(account.dividendMint, owner, dividend.programId),
  ];
  const [infos, lamports, position] = await Promise.all([
    connection.getMultipleAccountsInfo(tokenAccounts),
    connection.getBalance(owner),
    getProgram(connection).account.yieldPosition.fetchNullable(
      findPositionAddress(market.address, owner)
    ),
  ]);
  const balance = (index: number) => {
    const info = infos[index];
    return info ? unpackAccount(tokenAccounts[index], info, info.owner).amount : 0n;
  };

  return {
    lamports,
    underlying: balance(0),
    pt: balance(1),
    yt: balance(2),
    dividend: balance(3),
    ytLocked: position ? toBigInt(position.ytLocked) : 0n,
    totalClaimed: position ? toBigInt(position.totalClaimed) : 0n,
    totalStockClaimed: position ? toBigInt(position.totalStockClaimed) : 0n,
    account: position,
  };
}

/** Mirrors the cash-dividend half of `YieldPosition::settle` in the program. */
export function claimableDividends(position: PositionAccount | null, accDividendPerYt: bigint) {
  if (!position) return 0n;
  const accrued = (toBigInt(position.ytLocked) * accDividendPerYt) / ACC_PRECISION;
  const debt = toBigInt(position.dividendDebt);
  return toBigInt(position.unclaimed) + (accrued > debt ? accrued - debt : 0n);
}

/** The multiplier the next instruction will sync to (it never moves down). */
export const effectiveMultiplier = (market: MarketView) =>
  market.currentMultiplier > market.multiplier ? market.currentMultiplier : market.multiplier;

/** Share units for a raw stock amount (mirrors `Market::shares_for_raw`). */
export const sharesForRaw = (market: MarketView, raw: bigint) =>
  (raw * effectiveMultiplier(market)) / MULTIPLIER_ONE;

/** Raw stock for an amount in share units (mirrors `Market::raw_for_shares`). */
export const rawForShares = (market: MarketView, shares: bigint) =>
  (shares * MULTIPLIER_ONE) / effectiveMultiplier(market);

export const multiplierLabel = (market: MarketView) =>
  (Number(effectiveMultiplier(market)) / Number(MULTIPLIER_ONE)).toFixed(4);

const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

/** The stock-yield index after syncing to the mint's current multiplier (mirrors `Market::sync_multiplier`). */
function syncedStockIndex(market: MarketView) {
  let pending = market.pendingStockYield;
  const current = effectiveMultiplier(market);
  if (current > market.multiplier) {
    pending +=
      ceilDiv(market.totalStripped * MULTIPLIER_ONE, market.multiplier) -
      ceilDiv(market.totalStripped * MULTIPLIER_ONE, current);
  }
  if (pending === 0n || market.totalYtLocked === 0n) return market.accStockPerYt;
  return market.accStockPerYt + (pending * ACC_PRECISION) / market.totalYtLocked;
}

/** Raw stock yield the position could claim now, including multiplier growth not yet synced. */
export function claimableStockYield(position: PositionAccount | null, market: MarketView) {
  if (!position) return 0n;
  const accrued = (toBigInt(position.ytLocked) * syncedStockIndex(market)) / ACC_PRECISION;
  const debt = toBigInt(position.stockDebt);
  return toBigInt(position.unclaimedStock) + (accrued > debt ? accrued - debt : 0n);
}

/** Lifetime cash dividends per whole YT, in dividend base units. */
export const dividendPerYt = (market: MarketView) =>
  (market.accDividendPerYt * pow10(market.underlying.decimals)) / ACC_PRECISION;

export type OfferAccount = IdlAccounts<Stripr>["offer"];
export type OfferAsset = "pt" | "yt";

export type OfferView = {
  address: PublicKey;
  maker: PublicKey;
  asset: OfferAsset;
  tokenMint: PublicKey;
  id: bigint;
  /** Quote token base units per whole PT/YT. */
  price: bigint;
  /** Share units still for sale. */
  amount: bigint;
  initialAmount: bigint;
  createdAt: number;
};

const u64Le = (value: bigint) => {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
};

export const findOfferAddress = (market: PublicKey, maker: PublicKey, id: bigint) =>
  PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("offer"), market.toBytes(), maker.toBytes(), u64Le(id)],
    PROGRAM_ID
  )[0];

export const findOfferEscrowAddress = (offer: PublicKey) =>
  PublicKey.findProgramAddressSync([new TextEncoder().encode("offer_escrow"), offer.toBytes()], PROGRAM_ID)[0];

/** Quote tokens owed for `amount` share units (mirrors `Offer::cost`, rounding up). */
export const offerCost = (price: bigint, amount: bigint, decimals: number) =>
  amount === 0n ? 0n : ceilDiv(amount * price, pow10(decimals));

/** Open offers in a market, cheapest first. */
export async function fetchOffers(connection: Connection, market: MarketView): Promise<OfferView[]> {
  const program = getProgram(connection);
  const offers = await program.account.offer.all([
    { dataSize: program.account.offer.size },
    // Offer layout: 8-byte discriminator, maker, then market.
    { memcmp: { offset: 8 + 32, bytes: market.address.toBase58() } },
  ]);
  return offers
    .map(({ publicKey, account }) => ({
      address: publicKey,
      maker: account.maker,
      asset: (account.tokenMint.equals(market.account.ptMint) ? "pt" : "yt") as OfferAsset,
      tokenMint: account.tokenMint,
      id: toBigInt(account.id),
      price: toBigInt(account.price),
      amount: toBigInt(account.amount),
      initialAmount: toBigInt(account.initialAmount),
      createdAt: account.createdAt.toNumber() * 1000,
    }))
    .filter((offer) => offer.amount > 0n)
    .sort((a, b) => (a.price === b.price ? a.createdAt - b.createdAt : a.price < b.price ? -1 : 1));
}
