import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProtocolStats } from "./ProtocolStats";
import { SplitDiagram } from "./SplitDiagram";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-page items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-24">
      <div>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
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
        <ProtocolStats />
      </div>
      <SplitDiagram />
    </section>
  );
}
