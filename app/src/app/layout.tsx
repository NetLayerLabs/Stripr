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

// Production resolves the share card against the real domain. VERCEL_URL is the
// per-deployment address, which sits behind Vercel's login, so crawlers following
// it get a redirect instead of the image and the link unfurls with no picture.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_ENV === "production"
    ? "https://stripr.xyz"
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const metadata: Metadata = {
  // Absolute URLs for the share card.
  metadataBase: new URL(siteUrl),
  title: {
    default: "Stripr · Yield stripping for tokenized stocks",
    template: "%s · Stripr",
  },
  description:
    "xStocks pay dividends by raising a multiplier on the token. Stripr turns that into a yield you can own and trade: PT is the share, YT is its dividends.",
  openGraph: {
    type: "website",
    siteName: "Stripr",
    title: "Stripr - yield stripping for tokenized stocks",
    description:
      "Split a stock into its principal and its yield. Locked YT captures every dividend an xStock pays, read on-chain.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#05070a",
  colorScheme: "dark",
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
