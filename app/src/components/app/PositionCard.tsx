"use client";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Droplets, TriangleAlert, Wallet } from "lucide-react";
import { TokenIcon, type TokenKind } from "@/components/ui";
import { useFaucetEnabled } from "@/hooks/usePosition";
import type { StriprActions } from "@/hooks/useStriprActions";
import { cn } from "@/lib/cn";
import { formatAmount } from "@/lib/format";
import {
  claimableDividends,
  claimableStockYield,
  sharesForRaw,
  type MarketView,
  type PositionView,
} from "@/lib/stripr";

function BalanceRow({
  kind,
  symbol,
  label,
  amount,
  decimals,
  highlight,
}: {
  kind: TokenKind;
  symbol: string;
  label: string;
  amount: bigint | undefined;
  decimals: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.04] py-3 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <TokenIcon kind={kind} symbol={symbol} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-zinc-100">{symbol}</div>
          <div className={cn("text-xs", highlight ? "text-emerald-300/80" : "text-zinc-500")}>{label}</div>
        </div>
      </div>
      {amount === undefined ? (
        <div className="skeleton h-4 w-16" />
      ) : (
        <div className="num text-sm text-zinc-100">{formatAmount(amount, decimals)}</div>
      )}
    </div>
  );
}

function YieldLine({ label, amount, symbol }: { label: string; amount: string; symbol: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="num text-xl font-semibold tracking-tight text-white">
        {amount} <span className="text-sm font-normal text-zinc-500">{symbol}</span>
      </span>
    </div>
  );
}

export function PositionCard({
  market,
  position,
  actions,
}: {
  market: MarketView;
  position: PositionView | undefined;
  actions: StriprActions;
}) {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const faucetEnabled = useFaucetEnabled();

  if (!publicKey) {
    return (
      <section className="card flex flex-col items-center px-6 py-10 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <Wallet className="h-5 w-5 text-zinc-300" />
        </div>
        <h2 className="mt-4 font-semibold text-white">Your position</h2>
        <p className="mt-1 max-w-[17rem] text-sm text-zinc-500">
          Connect a wallet to see your balances, locked YT and claimable yield.
        </p>
        <button type="button" onClick={() => setVisible(true)} className="btn-secondary mt-5 h-10 px-5">
          Connect wallet
        </button>
      </section>
    );
  }

  const { decimals } = market.underlying;
  const dividendDecimals = market.dividend.decimals;
  const claimableCash = position ? claimableDividends(position.account, market.accDividendPerYt) : 0n;
  const claimableStock = position ? claimableStockYield(position.account, market) : 0n;
  const hasYield = claimableCash > 0n || claimableStock > 0n;
  const earning = Boolean(position && position.ytLocked > 0n);
  const lowSol = position !== undefined && position.lamports < 0.01 * LAMPORTS_PER_SOL;

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-white/[0.06] bg-gradient-to-b from-emerald-400/[0.07] to-transparent p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="label">Claimable yield</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs",
              earning ? "text-emerald-300/90" : "text-zinc-500"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", earning ? "bg-emerald-400" : "bg-zinc-600")} />
            {earning ? "Earning" : "Not earning"}
          </span>
        </div>
        {position ? (
          <div className="mt-3 space-y-2">
            <YieldLine
              label="Reinvested dividends"
              amount={formatAmount(sharesForRaw(market, claimableStock), decimals, 6)}
              symbol={market.symbol}
            />
            <YieldLine
              label="Cash dividends"
              amount={formatAmount(claimableCash, dividendDecimals, 4)}
              symbol={market.dividendSymbol}
            />
          </div>
        ) : (
          <div className="skeleton mt-3 h-16 w-full" />
        )}
        <button
          type="button"
          className="btn-primary mt-5 h-11 w-full"
          disabled={!hasYield || actions.busy}
          onClick={() => void actions.claim(claimableCash, claimableStock)}
        >
          {hasYield ? "Claim yield" : "Nothing to claim yet"}
        </button>
      </div>

      <div className="px-5 py-1 sm:px-6">
        <BalanceRow
          kind="stock"
          symbol={market.symbol}
          label="In wallet"
          amount={position && sharesForRaw(market, position.underlying)}
          decimals={decimals}
        />
        <BalanceRow kind="pt" symbol={`PT-${market.symbol}`} label="In wallet" amount={position?.pt} decimals={decimals} />
        <BalanceRow kind="yt" symbol={`YT-${market.symbol}`} label="In wallet" amount={position?.yt} decimals={decimals} />
        <BalanceRow
          kind="yt"
          symbol={`YT-${market.symbol}`}
          label="Locked · earning"
          amount={position?.ytLocked}
          decimals={decimals}
          highlight
        />
        <BalanceRow
          kind="stock"
          symbol={market.symbol}
          label="Reinvested dividends claimed"
          amount={position && sharesForRaw(market, position.totalStockClaimed)}
          decimals={decimals}
        />
        <BalanceRow
          kind="usd"
          symbol={market.dividendSymbol}
          label="Cash dividends claimed"
          amount={position?.totalClaimed}
          decimals={dividendDecimals}
        />
      </div>

      {lowSol || faucetEnabled ? (
        <div className="space-y-3 border-t border-white/[0.06] px-5 py-4 sm:px-6">
          {lowSol ? (
            <p className="flex items-center gap-2 text-xs text-amber-300/90">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              Low SOL balance. You need a little SOL for network fees.
            </p>
          ) : null}
          {faucetEnabled ? (
            <button type="button" className="btn-secondary h-10 w-full" onClick={() => void actions.requestFaucet()}>
              <Droplets className="h-4 w-4 text-sky-300" />
              Get test {market.symbol} + {market.dividendSymbol}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
