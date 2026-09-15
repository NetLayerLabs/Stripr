"use client";

import { TokenLabel, type TokenKind } from "@/components/ui";
import { formatAmount, toInputValue } from "@/lib/format";

type AmountFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  decimals: number;
  symbol: string;
  kind: TokenKind;
  balance?: bigint;
  balanceLabel?: string;
};

export function AmountField({
  label,
  value,
  onChange,
  decimals,
  symbol,
  kind,
  balance,
  balanceLabel = "Balance",
}: AmountFieldProps) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-ink-950/60 p-4 transition-colors focus-within:border-emerald-400/40">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-zinc-500">{label}</span>
        {balance !== undefined ? (
          <button
            type="button"
            onClick={() => onChange(toInputValue(balance, decimals))}
            className="num truncate text-zinc-500 transition-colors hover:text-zinc-300"
          >
            {balanceLabel} {formatAmount(balance, decimals)}
            <span className="ml-1.5 font-semibold text-emerald-400">MAX</span>
          </button>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <input
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="0.00"
          aria-label={label}
          value={value}
          onChange={(event) => {
            const next = event.target.value.replace(",", ".");
            if (/^\d*\.?\d*$/.test(next)) onChange(next);
          }}
          className="num w-full min-w-0 bg-transparent text-3xl font-medium tracking-tight text-white outline-none placeholder:text-zinc-700"
        />
        <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3">
          <TokenLabel kind={kind} symbol={symbol} />
        </div>
      </div>
    </div>
  );
}
