import { TokenIcon, type TokenKind } from "@/components/ui";
import { cn } from "@/lib/cn";

function TokenCard({
  kind,
  symbol,
  role,
  detail,
}: {
  kind: TokenKind;
  symbol: string;
  role: string;
  detail: string;
}) {
  return (
    <div className="card relative overflow-hidden p-4">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          kind === "pt" ? "via-sky-300/70" : "via-emerald-300/70"
        )}
      />
      <div className="flex items-center gap-2">
        <TokenIcon kind={kind} symbol={symbol} size="sm" />
        <span className="text-sm font-medium text-white">{symbol}</span>
      </div>
      <div
        className={cn(
          "mt-4 text-[11px] font-medium uppercase tracking-[0.08em]",
          kind === "pt" ? "text-sky-300" : "text-emerald-300"
        )}
      >
        {role}
      </div>
      <p className="mt-1 text-sm leading-snug text-zinc-400">{detail}</p>
    </div>
  );
}

export function SplitDiagram() {
  return (
    <figure className="animate-rise relative mx-auto w-full max-w-md lg:ml-auto">
      <div aria-hidden className="absolute -inset-8 -z-10 rounded-[40px] bg-emerald-500/[0.07] blur-3xl" />

      <div className="card flex items-center gap-3 p-5">
        <TokenIcon kind="stock" symbol="AAPL" size="lg" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white">AAPL</div>
          <div className="text-xs text-zinc-500">Tokenized stock · pays dividends</div>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400">Deposit</span>
      </div>

      <svg viewBox="0 0 320 56" preserveAspectRatio="none" className="block h-14 w-full" fill="none" aria-hidden>
        {[
          { d: "M160 0v14c0 16-80 12-80 28v14", stroke: "#7dd3fc" },
          { d: "M160 0v14c0 16 80 12 80 28v14", stroke: "#34d399" },
        ].map((path) => (
          <path
            key={path.stroke}
            d={path.d}
            stroke={path.stroke}
            strokeOpacity={0.6}
            strokeWidth={1.5}
            strokeDasharray="4 6"
            vectorEffect="non-scaling-stroke"
            className="animate-dash"
          />
        ))}
      </svg>

      <div className="grid grid-cols-2 gap-3">
        <TokenCard
          kind="pt"
          symbol="PT-AAPL"
          role="Principal"
          detail="The claim on the share. Recombine with YT to redeem."
        />
        <TokenCard
          kind="yt"
          symbol="YT-AAPL"
          role="Yield"
          detail="Earns every dividend while locked, or sell it for USDC."
        />
      </div>

      <div className="card mt-3 flex items-center gap-3 px-4 py-3">
        <TokenIcon kind="usd" symbol="USDC" size="sm" />
        <span className="text-sm text-zinc-400">Dividend declared</span>
        <span className="ml-auto text-sm font-medium text-emerald-300">Paid to locked YT</span>
      </div>

      <figcaption className="mt-4 text-xs leading-relaxed text-zinc-500">
        <span className="font-display italic text-zinc-400">Fig. 1</span> Depositing AAPL mints PT-AAPL and
        YT-AAPL; every dividend the issuer pays goes to whoever holds the locked YT.
      </figcaption>
    </figure>
  );
}
