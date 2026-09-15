"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Note, Row, Segmented, Toggle, TokenLabel, type TokenKind } from "@/components/ui";
import type { StriprActions } from "@/hooks/useStriprActions";
import { formatAmount, formatShare, minBigInt, parseAmount } from "@/lib/format";
import { rawForShares, sharesForRaw, type MarketView, type PositionView } from "@/lib/stripr";
import { AmountField } from "./AmountField";
import { SubmitButton } from "./SubmitButton";

type FormProps = {
  market: MarketView;
  position: PositionView | undefined;
  actions: StriprActions;
};

function FlowArrow() {
  return (
    <div aria-hidden className="relative z-10 flex h-0 justify-center">
      <div className="grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl border border-white/10 bg-ink-850 text-zinc-400">
        <ArrowDown className="h-4 w-4" />
      </div>
    </div>
  );
}

function OutputTile({
  kind,
  symbol,
  amount,
  caption,
}: {
  kind: TokenKind;
  symbol: string;
  amount: string;
  caption: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-ink-950/40 p-4">
      <TokenLabel kind={kind} symbol={symbol} size="sm" />
      <div className="num mt-3 truncate text-2xl font-medium tracking-tight text-white">{amount}</div>
      <div className="mt-1 text-xs text-zinc-500">{caption}</div>
    </div>
  );
}

function Breakdown({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">{children}</div>;
}

function Change({ from, to, changed }: { from: string; to: string; changed: boolean }) {
  if (!changed) return <>{from}</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-zinc-500">{from}</span>
      <ArrowRight className="h-3 w-3 text-zinc-600" />
      <span className="text-white">{to}</span>
    </span>
  );
}

export function StripForm({ market, position, actions }: FormProps) {
  const [value, setValue] = useState("");
  const [lock, setLock] = useState(true);
  const { decimals } = market.underlying;
  // Amounts are typed and shown in share units, like wallets display them; the program takes raw tokens.
  const typed = parseAmount(value, decimals);
  const raw = typed === null ? null : rawForShares(market, typed);
  const minted = raw ? sharesForRaw(market, raw) : 0n;

  async function submit() {
    if (raw && (await actions.strip(raw, lock))) setValue("");
  }

  return (
    <div className="space-y-3">
      <AmountField
        label="You deposit"
        value={value}
        onChange={setValue}
        decimals={decimals}
        balance={position && sharesForRaw(market, position.underlying)}
        symbol={market.symbol}
        kind="stock"
      />
      <FlowArrow />
      <div className="grid gap-3 sm:grid-cols-2">
        <OutputTile
          kind="pt"
          symbol={`PT-${market.symbol}`}
          amount={formatAmount(minted, decimals)}
          caption="Principal · redeemable for the stock"
        />
        <OutputTile
          kind="yt"
          symbol={`YT-${market.symbol}`}
          amount={formatAmount(minted, decimals)}
          caption={lock ? "Yield · locked and earning" : "Yield · sent to your wallet"}
        />
      </div>
      <Toggle
        checked={lock}
        onChange={setLock}
        label="Lock YT to earn dividends"
        description="Locks the new YT in the same transaction. You can unlock it at any time."
      />
      {lock && minted > 0n ? (
        <Row
          className="px-1"
          label="Your share of future dividends"
          value={formatShare((position?.ytLocked ?? 0n) + minted, market.totalYtLocked + minted)}
        />
      ) : null}
      <div className="pt-2">
        <SubmitButton
          amount={raw}
          max={position?.underlying}
          busy={actions.busy}
          readyLabel={lock ? "Strip & lock YT" : "Strip"}
          insufficientLabel={`Insufficient ${market.symbol}`}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}

export function RedeemForm({ market, position, actions }: FormProps) {
  const [value, setValue] = useState("");
  const { decimals } = market.underlying;
  const amount = parseAmount(value, decimals);
  const pairs = amount ?? 0n;
  const redeemable = position && minBigInt(position.pt, position.yt + position.ytLocked);
  const unlockFirst = position && pairs > position.yt ? pairs - position.yt : 0n;

  async function submit() {
    if (amount && (await actions.redeem(amount, unlockFirst))) setValue("");
  }

  return (
    <div className="space-y-3">
      <AmountField
        label="You redeem"
        value={value}
        onChange={setValue}
        decimals={decimals}
        balance={redeemable}
        balanceLabel="Redeemable"
        symbol="PT + YT"
        kind="pt"
      />
      <FlowArrow />
      <OutputTile
        kind="stock"
        symbol={market.symbol}
        amount={formatAmount(sharesForRaw(market, rawForShares(market, pairs)), decimals)}
        caption="Principal released from the vault"
      />
      <Breakdown>
        <Row label={`Burn PT-${market.symbol}`} value={formatAmount(pairs, decimals)} />
        <Row label={`Burn YT-${market.symbol}`} value={formatAmount(pairs, decimals)} />
        {unlockFirst > 0n ? <Row label="Unlocked first" value={formatAmount(unlockFirst, decimals)} /> : null}
      </Breakdown>
      {unlockFirst > 0n ? (
        <Note>
          Part of this YT is locked, so it is unlocked in the same transaction. Yield it already earned stays
          claimable.
        </Note>
      ) : null}
      <div className="pt-2">
        <SubmitButton
          amount={amount}
          max={redeemable}
          busy={actions.busy}
          readyLabel="Redeem"
          insufficientLabel="Not enough PT + YT"
          onSubmit={submit}
        />
      </div>
    </div>
  );
}

const EARN_MODES = [
  { value: "lock", label: "Lock" },
  { value: "unlock", label: "Unlock" },
] as const;

export function EarnForm({ market, position, actions }: FormProps) {
  const [mode, setMode] = useState<"lock" | "unlock">("lock");
  const [value, setValue] = useState("");
  const { decimals } = market.underlying;
  const amount = parseAmount(value, decimals);
  const locking = mode === "lock";
  const lockedNow = position?.ytLocked ?? 0n;
  const change = locking ? (amount ?? 0n) : minBigInt(amount ?? 0n, lockedNow);
  const lockedAfter = locking ? lockedNow + change : lockedNow - change;
  const poolAfter = locking ? market.totalYtLocked + change : market.totalYtLocked - change;
  const ytSymbol = `YT-${market.symbol}`;

  async function submit() {
    if (!amount) return;
    const signature = locking ? await actions.lock(amount) : await actions.unlock(amount);
    if (signature) setValue("");
  }

  return (
    <div className="space-y-3">
      <Segmented
        options={EARN_MODES}
        value={mode}
        size="sm"
        onChange={(next) => {
          setMode(next);
          setValue("");
        }}
      />
      <AmountField
        label={locking ? "Lock from wallet" : "Unlock to wallet"}
        value={value}
        onChange={setValue}
        decimals={decimals}
        balance={locking ? position?.yt : position?.ytLocked}
        balanceLabel={locking ? "In wallet" : "Locked"}
        symbol={ytSymbol}
        kind="yt"
      />
      <Breakdown>
        <Row
          label="Your locked YT"
          value={
            <Change
              from={formatAmount(lockedNow, decimals)}
              to={formatAmount(lockedAfter, decimals)}
              changed={change > 0n}
            />
          }
        />
        <Row
          label="Share of dividends"
          value={
            <Change
              from={formatShare(lockedNow, market.totalYtLocked)}
              to={formatShare(lockedAfter, poolAfter)}
              changed={change > 0n}
            />
          }
        />
      </Breakdown>
      <Note>
        {locking
          ? "Locked YT earns a pro-rata share of every reinvested dividend and cash payout while it stays locked."
          : "Unlocking stops future earnings. Yield already earned stays claimable."}
      </Note>
      <div className="pt-2">
        <SubmitButton
          amount={amount}
          max={locking ? position?.yt : position?.ytLocked}
          busy={actions.busy}
          readyLabel={locking ? "Lock YT" : "Unlock YT"}
          insufficientLabel={locking ? `Not enough ${ytSymbol}` : "Not enough locked YT"}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
