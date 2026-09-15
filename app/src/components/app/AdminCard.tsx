"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Row } from "@/components/ui";
import type { StriprActions } from "@/hooks/useStriprActions";
import { formatAmount, parseAmount, pow10 } from "@/lib/format";
import type { MarketView, PositionView } from "@/lib/stripr";
import { AmountField } from "./AmountField";
import { SubmitButton } from "./SubmitButton";

export function AdminCard({
  market,
  position,
  actions,
}: {
  market: MarketView;
  position: PositionView | undefined;
  actions: StriprActions;
}) {
  const [value, setValue] = useState("");
  const dividendDecimals = market.dividend.decimals;
  const amount = parseAmount(value, dividendDecimals);
  const perYt =
    amount && market.totalYtLocked > 0n
      ? (amount * pow10(market.underlying.decimals)) / market.totalYtLocked
      : 0n;

  async function submit() {
    if (amount && (await actions.distribute(amount))) setValue("");
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-amber-300" />
        <h2 className="text-sm font-semibold text-white">Distribute dividend</h2>
        <span className="ml-auto rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
          Admin
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        Pay a corporate dividend into the vault. It is split pro-rata across all locked YT.
      </p>
      <div className="mt-4 space-y-3">
        <AmountField
          label="Payout"
          value={value}
          onChange={setValue}
          decimals={dividendDecimals}
          balance={position?.dividend}
          symbol={market.dividendSymbol}
          kind="usd"
        />
        <div className="space-y-2 px-1">
          <Row label="Locked YT receiving it" value={formatAmount(market.totalYtLocked, market.underlying.decimals)} />
          <Row
            label={`Per YT-${market.symbol}`}
            value={`${formatAmount(perYt, dividendDecimals, 6)} ${market.dividendSymbol}`}
          />
        </div>
        <SubmitButton
          amount={amount}
          max={position?.dividend}
          busy={actions.busy}
          readyLabel="Distribute dividend"
          insufficientLabel={`Insufficient ${market.dividendSymbol}`}
          blockedLabel={market.totalYtLocked === 0n ? "No locked YT to pay yet" : undefined}
          onSubmit={submit}
        />
      </div>
    </section>
  );
}
