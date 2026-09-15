"use client";

import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, type Connection, type PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useTransactionModal, type TxDetail } from "@/components/TransactionModal";
import { describeError } from "@/lib/errors";
import { formatAmount } from "@/lib/format";
import {
  ataAddress,
  getProgram,
  rawForShares,
  sharesForRaw,
  toBN,
  type MarketView,
} from "@/lib/stripr";

type StriprProgram = ReturnType<typeof getProgram>;

type BuildInstructions = (
  program: StriprProgram,
  market: MarketView,
  user: PublicKey
) => Promise<TransactionInstruction[]>;

type Describe = (market: MarketView) => TxDetail[];

const TRANSACTION_STEPS = ["Prepare transaction", "Approve in your wallet", "Confirm on Solana"];
const FAUCET_STEPS = ["Request test tokens", "Confirm on Solana"];
const FAUCET_AMOUNT = "100";

/** A raw stock amount, shown in share units like wallets display it. */
const stock = (market: MarketView, raw: bigint) =>
  `${formatAmount(sharesForRaw(market, raw), market.underlying.decimals)} ${market.symbol}`;
const pt = (market: MarketView, shares: bigint) =>
  `${formatAmount(shares, market.underlying.decimals)} PT-${market.symbol}`;
const yt = (market: MarketView, shares: bigint) =>
  `${formatAmount(shares, market.underlying.decimals)} YT-${market.symbol}`;
const dividend = (market: MarketView, amount: bigint) =>
  `${formatAmount(amount, market.dividend.decimals)} ${market.dividendSymbol}`;

function ytAccounts(market: MarketView, user: PublicKey) {
  return {
    user,
    market: market.address,
    underlyingMint: market.account.underlyingMint,
    ytMint: market.account.ytMint,
    userYt: ataAddress(market.account.ytMint, user, market.underlying.programId),
    tokenProgram: market.underlying.programId,
  };
}

const lockInstruction = (program: StriprProgram, market: MarketView, user: PublicKey, amount: bigint) =>
  program.methods.lockYt(toBN(amount)).accountsPartial(ytAccounts(market, user)).instruction();

const unlockInstruction = (program: StriprProgram, market: MarketView, user: PublicKey, amount: bigint) =>
  program.methods.unlockYt(toBN(amount)).accountsPartial(ytAccounts(market, user)).instruction();

/**
 * Waits for a signature by polling its status. Public RPCs block browser websockets,
 * so this avoids the subscription that confirmTransaction opens.
 */
async function waitForConfirmation(connection: Connection, signature: string, lastValidBlockHeight: number) {
  for (;;) {
    const status = (await connection.getSignatureStatuses([signature])).value[0];
    if (status?.err) throw new Error("The transaction failed on-chain.");
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return;
    if ((await connection.getBlockHeight("confirmed")) > lastValidBlockHeight) {
      throw new Error("The transaction expired before it confirmed. Please try again.");
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

export type StriprActions = ReturnType<typeof useStriprActions>;

export function useStriprActions(market: MarketView | undefined) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { sendTransaction } = useWallet();
  const queryClient = useQueryClient();
  const modal = useTransactionModal();
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["markets"] }),
        queryClient.invalidateQueries({ queryKey: ["position"] }),
        queryClient.invalidateQueries({ queryKey: ["position-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["history"] }),
      ]),
    [queryClient]
  );

  /** Builds, signs and confirms one transaction, walking the user through it in the modal. */
  const execute = useCallback(
    async (title: string, describe: Describe, build: BuildInstructions) => {
      if (!wallet || !market) return null;
      setBusy(true);
      modal.start({ title, subtitle: `${market.symbol} market`, details: describe(market), steps: TRANSACTION_STEPS });

      let signature: string | undefined;
      try {
        const program = getProgram(connection, wallet);
        const instructions = await build(program, market, wallet.publicKey);
        const latest = await connection.getLatestBlockhash("confirmed");
        const transaction = new Transaction({ feePayer: wallet.publicKey, ...latest }).add(...instructions);

        modal.step(1);
        signature = await sendTransaction(transaction, connection);

        modal.step(2, signature);
        await waitForConfirmation(connection, signature, latest.lastValidBlockHeight);

        modal.succeed(signature);
        return signature;
      } catch (error) {
        modal.fail(describeError(error), signature);
        return null;
      } finally {
        setBusy(false);
        void refresh();
      }
    },
    [connection, market, modal, refresh, sendTransaction, wallet]
  );

  const requestFaucet = useCallback(async () => {
    if (!wallet || !market) return;
    setBusy(true);
    modal.start({
      title: `Get test ${market.symbol}`,
      subtitle: "Devnet faucet",
      details: [
        { label: "You receive", value: `${FAUCET_AMOUNT} ${market.symbol}` },
        { label: "Network fees", value: "Devnet SOL top-up if you’re low" },
      ],
      steps: FAUCET_STEPS,
    });
    try {
      const response = await fetch("/api/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet: wallet.publicKey.toBase58(), market: market.address.toBase58() }),
      });
      const body = (await response.json()) as { error?: string; signature?: string };
      if (!response.ok || !body.signature) throw new Error(body.error ?? "Faucet request failed.");
      modal.step(1, body.signature);
      modal.succeed(body.signature);
    } catch (error) {
      modal.fail(describeError(error));
    } finally {
      setBusy(false);
      void refresh();
    }
  }, [market, modal, refresh, wallet]);

  return useMemo(
    () => ({
      busy,
      requestFaucet,

      /** `raw` is the raw stock amount; PT and YT are minted in share units. */
      strip: (raw: bigint, lock: boolean) =>
        execute(
          lock ? "Strip & lock YT" : "Strip",
          (m) => {
            const minted = sharesForRaw(m, raw);
            return [
              { label: "Deposit", value: stock(m, raw) },
              { label: "Receive", value: `${pt(m, minted)} + ${yt(m, minted)}` },
              ...(lock ? [{ label: "Lock to earn", value: yt(m, minted) }] : []),
            ];
          },
          async (program, m, user) => {
            const strip = await program.methods
              .strip(toBN(raw))
              .accountsPartial({
                user,
                market: m.address,
                underlyingMint: m.account.underlyingMint,
                ptMint: m.account.ptMint,
                ytMint: m.account.ytMint,
                userUnderlying: ataAddress(m.account.underlyingMint, user, m.underlying.programId),
                tokenProgram: m.underlying.programId,
              })
              .instruction();
            return lock ? [strip, await lockInstruction(program, m, user, sharesForRaw(m, raw))] : [strip];
          }
        ),

      /** `shares` of PT and YT to burn. */
      redeem: (shares: bigint, unlockFirst: bigint) =>
        execute(
          "Redeem",
          (m) => [
            ...(unlockFirst > 0n ? [{ label: "Unlock first", value: yt(m, unlockFirst) }] : []),
            { label: "Burn", value: `${pt(m, shares)} + ${yt(m, shares)}` },
            { label: "Receive", value: stock(m, rawForShares(m, shares)) },
          ],
          async (program, m, user) => {
            const redeem = await program.methods
              .redeem(toBN(shares))
              .accountsPartial({
                user,
                market: m.address,
                underlyingMint: m.account.underlyingMint,
                ptMint: m.account.ptMint,
                ytMint: m.account.ytMint,
                userUnderlying: ataAddress(m.account.underlyingMint, user, m.underlying.programId),
                userPt: ataAddress(m.account.ptMint, user, m.underlying.programId),
                userYt: ataAddress(m.account.ytMint, user, m.underlying.programId),
                tokenProgram: m.underlying.programId,
              })
              .instruction();
            return unlockFirst > 0n ? [await unlockInstruction(program, m, user, unlockFirst), redeem] : [redeem];
          }
        ),

      lock: (amount: bigint) =>
        execute(
          "Lock YT",
          (m) => [
            { label: "Lock", value: yt(m, amount) },
            { label: "Earns", value: `Reinvested ${m.symbol} dividends and ${m.dividendSymbol} payouts` },
          ],
          async (program, m, user) => [await lockInstruction(program, m, user, amount)]
        ),

      unlock: (amount: bigint) =>
        execute(
          "Unlock YT",
          (m) => [
            { label: "Unlock", value: yt(m, amount) },
            { label: "Earned so far", value: "Stays claimable" },
          ],
          async (program, m, user) => [await unlockInstruction(program, m, user, amount)]
        ),

      /** Claims cash dividends and raw stock yield in one transaction; either may be zero. */
      claim: (cash: bigint, stockRaw: bigint) =>
        execute(
          "Claim yield",
          (m) => [
            ...(stockRaw > 0n ? [{ label: "Reinvested dividends", value: stock(m, stockRaw) }] : []),
            ...(cash > 0n ? [{ label: "Cash dividends", value: dividend(m, cash) }] : []),
            { label: "Sent to", value: "Your wallet" },
          ],
          async (program, m, user) => {
            const instructions: TransactionInstruction[] = [];
            if (stockRaw > 0n) {
              instructions.push(
                await program.methods
                  .claimStockYield()
                  .accountsPartial({
                    user,
                    market: m.address,
                    underlyingMint: m.account.underlyingMint,
                    userUnderlying: ataAddress(m.account.underlyingMint, user, m.underlying.programId),
                    tokenProgram: m.underlying.programId,
                  })
                  .instruction()
              );
            }
            if (cash > 0n) {
              instructions.push(
                await program.methods
                  .claimYield()
                  .accountsPartial({
                    user,
                    market: m.address,
                    dividendMint: m.account.dividendMint,
                    dividendTokenProgram: m.dividend.programId,
                  })
                  .instruction()
              );
            }
            return instructions;
          }
        ),

      distribute: (amount: bigint) =>
        execute(
          "Distribute dividend",
          (m) => [
            { label: "Pay out", value: dividend(m, amount) },
            { label: "Recipients", value: `All locked YT-${m.symbol}, pro-rata` },
          ],
          async (program, m, user) => [
            await program.methods
              .distributeDividend(toBN(amount))
              .accountsPartial({
                admin: user,
                market: m.address,
                dividendMint: m.account.dividendMint,
                adminDividend: ataAddress(m.account.dividendMint, user, m.dividend.programId),
                dividendTokenProgram: m.dividend.programId,
              })
              .instruction(),
          ]
        ),
    }),
    [busy, execute, requestFaucet]
  );
}
