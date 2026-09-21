import { ChartLine, EyeOff, Package } from "lucide-react";
import { Section } from "./Section";
import { Reveal } from "./Reveal";

const PROBLEMS = [
  {
    icon: Package,
    title: "Price and income are bundled",
    body: "Owning a tokenized share means taking all of its price risk just to receive its dividends. There is no way to hold the cash flow on its own.",
  },
  {
    icon: ChartLine,
    title: "Dividends can’t be priced or traded",
    body: "No on-chain instrument represents a stock’s future payouts, so yield can’t be bought, sold, hedged or built into other products.",
  },
  {
    icon: EyeOff,
    title: "On-chain dividends are silent",
    body: "Tokenized stocks on Solana reflect dividends by raising a multiplier on the token (Token-2022 Scaled UI Amount). The value arrives blended into the price.",
  },
];

const COMPARISON = [
  {
    topic: "Exposure",
    before: "All or nothing: price and dividends come together",
    after: "Choose the share (PT), the dividends (YT), or both",
  },
  {
    topic: "Income",
    before: "Blended into the token price",
    after: "Accrues to locked YT and is claimable as stock or USDC",
  },
  {
    topic: "Ownership",
    before: "Sell the share to give up the income",
    after: "Sell YT for USDC and keep the share through PT",
  },
];

export function Problem() {
  return (
    <Section
      id="problem"
      eyebrow="The problem"
      title="Stocks came on-chain. Their income didn’t get its own market."
      description="Tokenized equities are live on Solana, but each token is still an indivisible bundle of price exposure and dividend income."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {PROBLEMS.map(({ icon: Icon, title, body }, index) => (
          <Reveal key={title} delay={index * 0.08} className="card card-interactive p-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-rose-300/15 bg-rose-400/[0.06]">
              <Icon className="h-5 w-5 text-rose-300" />
            </div>
            <h3 className="mt-5 font-display text-lg leading-snug text-white">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
          </Reveal>
        ))}
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="hidden grid-cols-[160px_1fr_1fr] border-b border-white/[0.06] px-6 py-3 sm:grid">
          <span />
          <span className="label">Tokenized stock today</span>
          <span className="label text-emerald-300/90">With Stripr</span>
        </div>
        {COMPARISON.map((row, index) => (
          <Reveal
            key={row.topic}
            delay={index * 0.06}
            className="grid gap-2 border-b border-white/[0.04] px-6 py-4 last:border-0 sm:grid-cols-[160px_1fr_1fr] sm:gap-6"
          >
            <span className="text-sm font-medium text-white">{row.topic}</span>
            <span className="text-sm text-zinc-500">
              <span className="label mr-2 sm:hidden">Today</span>
              {row.before}
            </span>
            <span className="text-sm text-zinc-200">
              <span className="label mr-2 text-emerald-300/90 sm:hidden">Stripr</span>
              {row.after}
            </span>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
