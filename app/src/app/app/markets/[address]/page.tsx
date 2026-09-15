import type { Metadata } from "next";
import { MainnetNotice } from "@/components/app/MainnetNotice";
import { MarketDetail } from "@/components/app/MarketDetail";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Market",
};

export default function MarketPage({ params }: { params: { address: string } }) {
  return (
    <>
      <Header variant="app" />
      <MainnetNotice />
      <main className="mx-auto min-h-[70vh] w-full max-w-page px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
        <MarketDetail address={params.address} />
      </main>
      <Footer />
    </>
  );
}
