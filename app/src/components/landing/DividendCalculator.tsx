"use client";

import { useState } from "react";

const usd = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function NumberField({
  label,
  hint,
  value,
  onChange,
  suffix,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
}) {
  return (
    <label className="block rounded-xl border border-white/[0.07] bg-ink-950/60 p-4 transition-colors focus-within:border-emerald-400/40">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        <span className="text-xs text-zinc-500">{hint}</span>
      </span>
      <span className="mt-2 flex items-baseline gap-2">
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) => {
            const next = event.target.value.replace(",", ".");
            if (/^\d*\.?\d*$/.test(next)) onChange(next);
          }}
          className="num w-full min-w-0 bg-transparent text-2xl font-medium tracking-tight text-white outline-none"
        />
        <span className="shrink-0 text-sm text-zinc-500">{suffix}</span>
      </span>
    </label>
  );
}

export function DividendCalculator() {
  const [yours, setYours] = useState("100");
  const [locked, setLocked] = useState("10000");
  const [payout, setPayout] = useState("2500");

  const yourYt = Number(yours) || 0;
  const totalLocked = Math.max(Number(locked) || 0, yourYt);
  const dividend = Number(payout) || 0;
  const share = totalLocked > 0 ? yourYt / totalLocked : 0;
  const clamped = (Number(locked) || 0) < yourYt;

  return (
    <div id="calculator" className="card mt-6 scroll-mt-20 overflow-hidden">
      <div className="grid lg:grid-cols-2">
        <div className="space-y-3 p-6 sm:p-8">
          <p className="label text-emerald-300/90">Try the math</p>
          <h3 className="text-xl font-semibold text-white">What would a dividend pay you?</h3>
          <p className="pb-2 text-sm leading-relaxed text-zinc-400">
            Each payout is split across locked YT in proportion to how much each position holds.
          </p>
          <NumberField label="Your locked YT" hint="YT-AAPL" value={yours} onChange={setYours} suffix="YT" />
          <NumberField
            label="Total locked YT"
            hint="All positions"
            value={locked}
            onChange={setLocked}
            suffix="YT"
          />
          <NumberField label="Dividend payout" hint="One payout, in USDC" value={payout} onChange={setPayout} suffix="USDC" />
        </div>

        <div className="flex flex-col justify-between gap-8 border-t border-white/[0.06] bg-gradient-to-br from-emerald-400/[0.08] via-transparent to-transparent p-6 sm:p-8 lg:border-l lg:border-t-0">
          <div>
            <p className="label">You receive</p>
            <p className="num mt-3 text-5xl font-semibold tracking-tight text-white">
              {usd(dividend * share)}
              <span className="ml-2 text-lg font-medium text-zinc-500">USDC</span>
            </p>
            <div className="mt-8">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Your share of locked YT</span>
                <span className="num font-medium text-white">
                  {(share * 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
                  style={{ width: `${Math.min(share * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-between border-t border-white/[0.06] pt-4 text-sm">
              <span className="text-zinc-400">Paid per locked YT</span>
              <span className="num font-medium text-white">
                {totalLocked > 0 ? usd(dividend / totalLocked) : "0.00"} USDC
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            {clamped
              ? "Total locked YT includes yours, so it can’t be lower than your position. "
              : ""}
            Only locked YT earns. YT that isn’t locked when a dividend lands forfeits that payout to the holders who
            stayed locked.
          </p>
        </div>
      </div>
    </div>
  );
}
