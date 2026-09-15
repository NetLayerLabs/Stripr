import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProtocolStats } from "./ProtocolStats";
import { SplitDiagram } from "./SplitDiagram";

const BUILT_WITH = ["Anchor 1.2", "SPL Token interface", "Next.js 14", "Open source · Apache-2.0"];

export function Hero() {
  return (
    <section className="mx-auto grid max-w-page items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-24">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-xs font-medium text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Stocklana Hackathon · Credit &amp; Yield
        </span>
        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
          Split a stock into its <span className="text-sky-300">principal</span> and its{" "}
          <span className="text-emerald-300">yield</span>.
        </h1>
        <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-zinc-400">
          Stripr is a Pendle-style yield-stripping protocol for tokenized equities on Solana. Deposit a
          dividend-paying stock and receive two SPL tokens: PT, the claim on the share, and YT, the right to its
          dividends.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app" className="btn-primary h-12 px-6 text-[15px]">
            Launch app
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#how" className="btn-secondary h-12 px-6 text-[15px]">
            See how it works
          </a>
        </div>
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Built with">
          {BUILT_WITH.map((item) => (
            <li key={item} className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-zinc-500">
              {item}
            </li>
          ))}
        </ul>
        <ProtocolStats />
      </div>
      <SplitDiagram />
    </section>
  );
}
