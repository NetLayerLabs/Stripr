import { Blocks, Landmark, Wallet } from "lucide-react";
import { Section } from "./Section";

const PERSONAS = [
  {
    icon: Wallet,
    who: "Income seekers",
    need: "Want a stock’s dividends without riding its daily price swings.",
    strategy: "Hold and lock YT-AAPL to collect every payout in USDC.",
    tone: "text-emerald-300",
  },
  {
    icon: Landmark,
    who: "Long-term holders",
    need: "Believe in the company and don’t need the income stream.",
    strategy: "Keep PT-AAPL for the share and pass the YT to someone who values the income.",
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
        {PERSONAS.map(({ icon: Icon, who, need, strategy, tone }) => (
          <div key={who} className="card flex flex-col p-6">
            <Icon className={`h-6 w-6 ${tone}`} />
            <h3 className="mt-5 text-lg font-semibold text-white">{who}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{need}</p>
            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <p className="label">With Stripr</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">{strategy}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
