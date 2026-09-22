import { Plus } from "lucide-react";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

const QUESTIONS = [
  {
    q: "What are PT and YT?",
    a: "When you strip a stock, Stripr mints two SPL tokens in equal amounts. The Principal Token (PT) is the claim on the share itself. The Yield Token (YT) is the right to the share’s dividends. Together they always redeem for the original stock.",
  },
  {
    q: "Is every token really backed?",
    a: "Yes. Stripped stock sits in a vault owned by the market’s program address. PT and YT are minted only against deposits, one of each per share, and a PT and YT pair always redeems for one share of the stock. Only the reinvested surplus above that goes to YT holders.",
  },
  {
    q: "Where do the dividends come from?",
    a: "Two sources. xStocks reinvest dividends by raising the token’s Scaled UI Amount multiplier, so each vault needs fewer raw tokens to back the same shares. Stripr releases that surplus to locked YT as extra stock. Any cash payout, such as USDC deposited by the market admin, is split across locked YT too.",
  },
  {
    q: "Can I sell my future dividends?",
    a: "Yes. List your YT at a USDC price in the market’s Trade section; it sits in an on-chain escrow until someone buys it or you cancel. You keep your PT, and dividends your YT already earned stay claimable. Buyers can lock the YT they buy in the same transaction.",
  },
  {
    q: "Do I need to lock YT to earn?",
    a: "Yes. Only locked YT earns. The app can lock new YT in the same transaction as the strip, and you can unlock at any time. Anything already earned stays claimable after you unlock.",
  },
  {
    q: "What if not all YT is locked?",
    a: "Each dividend is split across locked YT only, so holders who stay locked receive a larger share of every payout.",
  },
  {
    q: "Can I get my stock back?",
    a: "Any time. Redeem equal amounts of PT and YT and the program releases the stock. If some of your YT is locked, the app unlocks it in the same transaction.",
  },
  {
    q: "Are there protocol fees?",
    a: "No. This version charges no protocol fees; you only pay Solana network fees.",
  },
  {
    q: "Is Stripr on mainnet? Is it audited?",
    a: "Yes. The program is deployed on Solana mainnet and the AAPLx market is open, with real xStocks and real USDC. Devnet stays one click away in the header if you’d rather try it with test tokens first. Stripr hasn’t been audited, so treat mainnet use as experimental and start small.",
  },
];

export function Faq() {
  return (
    <Section
      id="faq"
      eyebrow="FAQ"
      title="Questions, answered."
      description="The short version of how Stripr works, what it guarantees, and what it doesn’t do yet."
      tinted
    >
      <div className="mx-auto grid max-w-4xl gap-3">
        {QUESTIONS.map(({ q, a }, index) => (
          <Reveal key={q} delay={index * 0.04}>
            <details className="card group p-0 transition-colors hover:border-white/[0.14] [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left font-medium text-white">
                {q}
                <Plus className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-300 group-open:rotate-45 group-open:text-emerald-300" />
              </summary>
              {/* A grid row animating 0fr -> 1fr expands the answer smoothly. */}
              <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-open:grid-rows-[1fr]">
                <p className="overflow-hidden px-6 text-sm leading-relaxed text-zinc-400">
                  <span className="block pb-6">{a}</span>
                </p>
              </div>
            </details>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
