import type { Metadata } from "next";
import { MainnetNotice } from "@/components/app/MainnetNotice";
import { MarketsOverview } from "@/components/app/MarketsOverview";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Markets",
};

export default function AppPage() {
  return (
    <>
      <Header variant="app" />
      <MainnetNotice />
      <main className="mx-auto min-h-[70vh] w-full max-w-page px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
        <MarketsOverview />
      </main>
      <Footer />
    </>
  );
}
