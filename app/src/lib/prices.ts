import type { StockPrice } from "@/app/api/prices/route";
import { pow10 } from "./format";
import type { MarketView, OfferView } from "./stripr";

export type { StockPrice };

/** A listing price (quote base units per whole token) as USD. */
export const offerPriceUsd = (market: MarketView, price: bigint) =>
  Number(price) / Number(pow10(market.dividend.decimals));

/** What share of the stock's price a PT or YT listing costs, as a percentage. */
export function shareOfStockPrice(market: MarketView, price: bigint, stock: StockPrice | undefined) {
  if (!stock || stock.price <= 0) return null;
  return (offerPriceUsd(market, price) / stock.price) * 100;
}

/**
 * Cash dividends paid per whole YT over the market's life, in USD. Used to show
 * a YT price against what YT has actually paid out.
 */
export const cashPaidPerYtUsd = (market: MarketView, cashPerYt: bigint) =>
  Number(cashPerYt) / Number(pow10(market.dividend.decimals));

/**
 * What one whole YT has paid over the market's life, in USD: cash dividends plus
 * reinvested stock valued at the reference price. Null without a reference price.
 */
export function paidPerYtUsd(
  market: MarketView,
  cashPerYt: bigint,
  stockPerYtShares: bigint,
  stock: StockPrice | undefined
): number | null {
  if (!stock || stock.price <= 0) return null;
  const stockValue = (Number(stockPerYtShares) / Number(pow10(market.underlying.decimals))) * stock.price;
  return cashPaidPerYtUsd(market, cashPerYt) + stockValue;
}

/** Lifetime payout as a percentage of a listing price: how much of the price is already "paid back". */
export function paybackPercent(market: MarketView, price: bigint, paidUsd: number | null): number | null {
  if (paidUsd === null || price <= 0n) return null;
  return (paidUsd / offerPriceUsd(market, price)) * 100;
}

/** The cheapest listing of an asset, if any. */
export const bestOffer = (offers: OfferView[], asset: "pt" | "yt") =>
  offers.find((offer) => offer.asset === asset);

/**
 * PT + YT priced through Stripr versus the stock itself. Above 100% means the
 * two halves cost more than the share; below means they're cheaper.
 */
export function splitVsStock(market: MarketView, offers: OfferView[], stock: StockPrice | undefined) {
  const pt = bestOffer(offers, "pt");
  const yt = bestOffer(offers, "yt");
  if (!pt || !yt || !stock || stock.price <= 0) return null;
  const combined = offerPriceUsd(market, pt.price) + offerPriceUsd(market, yt.price);
  return { combined, percentOfStock: (combined / stock.price) * 100 };
}

export const formatUsd = (value: number, maxFraction = 2) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: maxFraction })}`;

export const formatPercent = (value: number, maxFraction = 1) =>
  `${value.toLocaleString("en-US", { maximumFractionDigits: maxFraction })}%`;
