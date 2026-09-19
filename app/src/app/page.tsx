import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Architecture } from "@/components/landing/Architecture";
import { AtAGlance } from "@/components/landing/AtAGlance";
import { Faq } from "@/components/landing/Faq";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Problem } from "@/components/landing/Problem";
import { Roadmap } from "@/components/landing/Roadmap";
import { TokenAnatomy } from "@/components/landing/TokenAnatomy";
import { UseCases } from "@/components/landing/UseCases";
import { WhySolana } from "@/components/landing/WhySolana";

export default function Home() {
  return (
    <>
      <Header variant="landing" />
      <main>
        <Hero />
        <AtAGlance />
        <Problem />
        <HowItWorks />
        <TokenAnatomy />
        <UseCases />
        <Architecture />
        <WhySolana />
        <Roadmap />
        <Faq />

        <section className="border-t border-white/[0.06]">
          <div className="mx-auto max-w-page px-4 py-24 sm:px-6">
            <div className="card relative overflow-hidden px-6 py-16 text-center sm:px-12">
              <div
                aria-hidden
                className="absolute inset-x-0 -top-24 mx-auto h-48 w-2/3 rounded-full bg-emerald-400/15 blur-3xl"
              />
              <h2 className="relative text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Strip your first stock in one transaction.
              </h2>
              <p className="relative mx-auto mt-4 max-w-lg text-zinc-400">
                Connect a Solana wallet, deposit, and start earning from the next dividend.
              </p>
              <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/app" className="btn-primary h-12 px-6 text-[15px]">
                  Launch app
                </Link>
                <a href="#faq" className="btn-secondary h-12 px-6 text-[15px]">
                  Read the FAQ
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
