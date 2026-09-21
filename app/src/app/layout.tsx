import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import localFont from "next/font/local";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import { Backdrop } from "@/components/Backdrop";
import { Providers } from "./providers";

// Editorial pairing: a serif display face for headings over a humanist sans for everything else.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
});
const sans = Figtree({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Stripr · Yield stripping for tokenized stocks",
    template: "%s · Stripr",
  },
  description:
    "Split tokenized stocks into Principal and Yield tokens on Solana. Hold the share, earn the dividends.",
};

export const viewport: Viewport = {
  themeColor: "#05070a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${geistMono.variable}`}>
      <body>
        <Backdrop />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
