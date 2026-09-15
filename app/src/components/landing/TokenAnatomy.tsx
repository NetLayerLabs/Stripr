import { TokenIcon, type TokenKind } from "@/components/ui";
import { cn } from "@/lib/cn";
import { Section } from "./Section";

const ROWS: Array<{ label: string; pt: string; yt: string }> = [
  { label: "Represents", pt: "The claim on the underlying share", yt: "The right to the share’s dividends" },
  { label: "Earns", pt: "No payouts; it carries the stock itself", yt: "Reinvested dividends in the stock, plus cash payouts, while locked" },
  { label: "Redeems", pt: "With equal YT, for the stock, any time", yt: "With equal PT, for the stock, any time" },
  { label: "Trade", pt: "Standard SPL token; list it for USDC in the app", yt: "Standard SPL token; lock it to earn or sell it for USDC" },
  { label: "Built for", pt: "Holders who want the share without the income", yt: "Income investors and dividend traders" },
];

function Chip({ kind, symbol }: { kind: TokenKind; symbol: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-4 text-base font-medium text-white">
      <TokenIcon kind={kind} symbol={symbol} />1 {symbol}
    </span>
  );
}

function TokenCard({ kind }: { kind: "pt" | "yt" }) {
  const isPt = kind === "pt";
  return (
    <div className="card relative overflow-hidden p-6 sm:p-8">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          isPt ? "via-sky-300/70" : "via-emerald-300/70"
        )}
      />
      <div className="flex items-center gap-3">
        <TokenIcon kind={kind} symbol={isPt ? "PT-AAPL" : "YT-AAPL"} size="lg" />
        <div>
          <h3 className="text-lg font-semibold text-white">{isPt ? "Principal Token" : "Yield Token"}</h3>
          <p className={cn("text-sm", isPt ? "text-sky-300" : "text-emerald-300")}>{isPt ? "PT-AAPL" : "YT-AAPL"}</p>
        </div>
      </div>
      <dl className="mt-6 divide-y divide-white/[0.05]">
        {ROWS.map((row) => (
          <div key={row.label} className="grid grid-cols-[96px_1fr] gap-4 py-3 text-sm">
            <dt className="text-zinc-500">{row.label}</dt>
            <dd className="text-zinc-200">{isPt ? row.pt : row.yt}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function TokenAnatomy() {
  return (
    <Section
      id="tokens"
      eyebrow="The tokens"
      title="Two tokens, one share, zero ambiguity."
      description="Stripping never creates value out of thin air. It separates what a share is worth from what a share pays."
    >
      <div className="card flex flex-wrap items-center justify-center gap-3 px-6 py-8 sm:gap-5">
        <Chip kind="stock" symbol="AAPL" />
        <span className="text-2xl font-light text-zinc-500">=</span>
        <Chip kind="pt" symbol="PT-AAPL" />
        <span className="text-2xl font-light text-zinc-500">+</span>
        <Chip kind="yt" symbol="YT-AAPL" />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <TokenCard kind="pt" />
        <TokenCard kind="yt" />
      </div>
    </Section>
  );
}
