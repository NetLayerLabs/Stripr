import { Blocks, Landmark, Wallet } from "lucide-react";
import { Section } from "./Section";
import { Reveal } from "./Reveal";

const PERSONAS = [
  {
    icon: Wallet,
    who: "Income investors",
    need: "Want a stock’s dividends without paying for the whole share or riding its price swings.",
    strategy: "Buy YT-AAPL from holders in the app for a fraction of the share price, lock it, and collect every dividend.",
    tone: "text-emerald-300",
  },
  {
    icon: Landmark,
    who: "Long-term holders",
    need: "Believe in the company, but would rather have cash now than small payouts over years.",
    strategy: "Strip, keep PT-AAPL for the share, and sell the YT for USDC today. Selling future dividends takes one transaction.",
    tone: "text-sky-300",
  },
  {
    icon: Blocks,
    who: "DeFi builders",
    need: "Need clean yield primitives for real-world assets.",
    strategy: "Build on PT and YT: standard SPL tokens that AMMs, lending markets and structured products can integrate.",
    tone: "text-violet-300",
  },
];

export function UseCases() {
  return (
    <Section
      id="use-cases"
      eyebrow="Who it’s for"
      title="Different investors want different parts of a share."
      description="Stripr lets each side hold exactly the exposure it wants, from the same underlying stock."
      tinted
    >
      <div className="grid gap-4 md:grid-cols-3">
        {PERSONAS.map(({ icon: Icon, who, need, strategy, tone }, index) => (
          <Reveal key={who} delay={index * 0.08} className="card card-interactive flex flex-col p-6">
            <Icon className={`h-6 w-6 ${tone}`} />
            <h3 className="mt-5 font-display text-lg text-white">{who}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{need}</p>
            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <p className="label">With Stripr</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">{strategy}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
