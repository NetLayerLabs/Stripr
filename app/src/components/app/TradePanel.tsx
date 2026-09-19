"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo, useState } from "react";
import { Note, Row, Segmented, StatTile, Toggle, TokenIcon } from "@/components/ui";
import { useOffers } from "@/hooks/useOffers";
import { usePrices } from "@/hooks/usePrices";
import type { StriprActions } from "@/hooks/useStriprActions";
import { cn } from "@/lib/cn";
import { formatAmount, parseAmount, pow10, shortAddress } from "@/lib/format";
import {
  formatPercent,
  formatUsd,
  paidPerYtUsd,
  paybackPercent,
  shareOfStockPrice,
  splitVsStock,
  type StockPrice,
} from "@/lib/prices";
import {
  ACC_PRECISION,
  dividendPerYt,
  offerCost,
  sharesForRaw,
  type MarketView,
  type OfferAsset,
  type OfferView,
  type PositionView,
} from "@/lib/stripr";
import { AmountField } from "./AmountField";
import { SubmitButton } from "./SubmitButton";

type Props = {
  market: MarketView;
  position: PositionView | undefined;
  actions: StriprActions;
};

const ASSETS = [
  { value: "yt", label: "YT · dividends" },
  { value: "pt", label: "PT · principal" },
] as const;

const MODES = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
] as const;

const tokenSymbol = (market: MarketView, asset: OfferAsset) => `${asset.toUpperCase()}-${market.symbol}`;

/** Where a Pyth reference price came from: live, last close, or the 24/7 feed. */
function priceNote(stock: StockPrice) {
  if (stock.source === "jupiter") return "xStock price via Jupiter";
  if (stock.roundTheClock) return "Pyth · 24/7 feed";
  if (stock.marketOpen === false) return "Pyth · at last close";
  return "Pyth · live";
}

export function TradePanel({ market, position, actions }: Props) {
  const offers = useOffers(market);
  const { publicKey } = useWallet();
  const [asset, setAsset] = useState<OfferAsset>("yt");
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [selected, setSelected] = useState<string | null>(null);

  const prices = usePrices();
  const stock = prices.data?.enabled ? prices.data.prices[market.symbol] : undefined;
  const all = useMemo(() => offers.data ?? [], [offers.data]);
  const book = useMemo(() => all.filter((offer) => offer.asset === asset), [all, asset]);
  const isOwn = (offer: OfferView) => Boolean(publicKey && offer.maker.equals(publicKey));
  const chosen =
    book.find((offer) => offer.address.toBase58() === selected) ?? book.find((offer) => !isOwn(offer));

  const quoteDecimals = market.dividend.decimals;
  const bestPt = all.find((offer) => offer.asset === "pt");
  const bestYt = all.find((offer) => offer.asset === "yt");
  const price = (offer: OfferView | undefined) =>
    offer ? `${formatAmount(offer.price, quoteDecimals, 2)} ${market.dividendSymbol}` : "—";
  const shareSub = (offer: OfferView | undefined, fallback: string) => {
    const percent = offer ? shareOfStockPrice(market, offer.price, stock) : null;
    return percent === null ? fallback : `${formatPercent(percent)} of the share price`;
  };
  const split = splitVsStock(market, all, stock);

  // What one whole YT has earned over the market's life, as context for its price.
  const cashPerYt = dividendPerYt(market);
  const stockPerYt = sharesForRaw(market, (market.accStockPerYt * pow10(market.underlying.decimals)) / ACC_PRECISION);
  const earnedParts = [
    cashPerYt > 0n ? `${formatAmount(cashPerYt, quoteDecimals, 2)} ${market.dividendSymbol}` : null,
    stockPerYt > 0n ? `${formatAmount(stockPerYt, market.underlying.decimals, 4)} ${market.symbol}` : null,
  ].filter(Boolean);
  const paidUsd = paidPerYtUsd(market, cashPerYt, stockPerYt, stock);

  return (
    <section aria-labelledby="trade-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="trade-heading" className="text-lg font-semibold text-white">
            Trade PT and YT
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Sell your future dividends for {market.dividendSymbol} today, or buy someone else’s. Settled on-chain,
            no intermediary.
          </p>
          {split ? (
            <p className="mt-1.5 text-xs text-zinc-500">
              Cheapest PT + YT together: {formatUsd(split.combined)} ·{" "}
              <span className={split.percentOfStock <= 100 ? "text-emerald-300" : "text-amber-300"}>
                {formatPercent(split.percentOfStock)} of one {market.symbol} share
              </span>
            </p>
          ) : null}
        </div>
        <Segmented
          options={ASSETS}
          value={asset}
          onChange={(next) => {
            setAsset(next);
            setSelected(null);
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stock ? (
          <StatTile
            label={`${market.symbol} reference price`}
            value={formatUsd(stock.price)}
            sub={priceNote(stock)}
          />
        ) : (
          <StatTile
            label="Open listings"
            value={offers.isPending ? "—" : all.length}
            sub={`${all.filter((offer) => offer.asset === "yt").length} YT · ${all.filter((offer) => offer.asset === "pt").length} PT`}
          />
        )}
        <StatTile label="Best YT price" value={price(bestYt)} sub={shareSub(bestYt, "Future dividends, per share")} />
        <StatTile label="Best PT price" value={price(bestPt)} sub={shareSub(bestPt, "The share without dividends")} />
        <StatTile
          label="Paid per YT so far"
          value={earnedParts.length ? earnedParts.join(" + ") : "—"}
          sub={paidUsd !== null && paidUsd > 0 ? `≈ ${formatUsd(paidUsd)} per YT at the reference price` : "Lifetime dividends per share"}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <OrderBook
          market={market}
          asset={asset}
          offers={book}
          stock={stock}
          loading={offers.isPending}
          chosen={chosen}
          isOwn={isOwn}
          busy={actions.busy}
          onBuy={(offer) => {
            setSelected(offer.address.toBase58());
            setMode("buy");
          }}
          onCancel={(offer) => void actions.cancelOffer(offer)}
        />

        <div className="card p-5 sm:p-6">
          <Segmented options={MODES} value={mode} onChange={setMode} />
          <div className="mt-5">
            {mode === "buy" ? (
              <BuyForm
                key={chosen?.address.toBase58() ?? "none"}
                market={market}
                position={position}
                actions={actions}
                asset={asset}
                offer={chosen}
                stock={stock}
                paidUsd={paidUsd}
                own={chosen ? isOwn(chosen) : false}
              />
            ) : (
              <SellForm
                key={asset}
                market={market}
                position={position}
                actions={actions}
                asset={asset}
                stock={stock}
                paidUsd={paidUsd}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function OrderBook({
  market,
  asset,
  offers,
  stock,
  loading,
  chosen,
  isOwn,
  busy,
  onBuy,
  onCancel,
}: {
  market: MarketView;
  asset: OfferAsset;
  offers: OfferView[];
  stock: StockPrice | undefined;
  loading: boolean;
  chosen: OfferView | undefined;
  isOwn: (offer: OfferView) => boolean;
  busy: boolean;
  onBuy: (offer: OfferView) => void;
  onCancel: (offer: OfferView) => void;
}) {
  const { decimals } = market.underlying;
  const quoteDecimals = market.dividend.decimals;
  const symbol = tokenSymbol(market, asset);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <h3 className="flex items-center gap-2.5 font-semibold text-white">
          <TokenIcon kind={asset} symbol={market.symbol} size="sm" />
          {symbol} for sale
        </h3>
        <span className="text-xs text-zinc-500">
          {offers.length > 0 ? `${offers.length} listed · cheapest first` : "Cheapest first"}
        </span>
      </div>
      {offers.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-zinc-500">
          {loading ? "Loading listings…" : `No ${symbol} listed yet. Switch to Sell to list the first.`}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left">
                <th className="label px-5 py-3 font-medium sm:px-6">Price</th>
                {stock ? <th className="label px-5 py-3 text-right font-medium">% of share</th> : null}
                <th className="label px-5 py-3 text-right font-medium">Available</th>
                <th className="label px-5 py-3 text-right font-medium">Total</th>
                <th className="label px-5 py-3 font-medium">Seller</th>
                <th className="px-5 py-3 sm:px-6" aria-label="Action" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {offers.map((offer) => {
                const own = isOwn(offer);
                const active = chosen?.address.equals(offer.address);
                return (
                  <tr key={offer.address.toBase58()} className={cn(active && "bg-emerald-400/[0.04]")}>
                    <td className="num px-5 py-3 font-medium text-white sm:px-6">
                      {formatAmount(offer.price, quoteDecimals, 2)} {market.dividendSymbol}
                    </td>
                    {stock ? (
                      <td className="num px-5 py-3 text-right text-zinc-400">
                        {(() => {
                          const percent = shareOfStockPrice(market, offer.price, stock);
                          return percent === null ? "—" : formatPercent(percent);
                        })()}
                      </td>
                    ) : null}
                    <td className="num px-5 py-3 text-right text-zinc-200">{formatAmount(offer.amount, decimals, 2)}</td>
                    <td className="num px-5 py-3 text-right text-zinc-400">
                      {formatAmount(offerCost(offer.price, offer.amount, decimals), quoteDecimals, 2)}
                    </td>
                    <td className="px-5 py-3">
                      {own ? (
                        <span className="rounded-md border border-emerald-400/30 px-1.5 py-0.5 text-[11px] font-medium text-emerald-300">
                          You
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-zinc-400">{shortAddress(offer.maker.toBase58())}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right sm:px-6">
                      {own ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onCancel(offer)}
                          className="btn-secondary h-8 px-3 text-xs"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onBuy(offer)}
                          className={cn("h-8 px-3 text-xs", active ? "btn-primary" : "btn-secondary")}
                        >
                          {active ? "Selected" : "Buy"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BuyForm({
  market,
  position,
  actions,
  asset,
  offer,
  stock,
  paidUsd,
  own,
}: Props & {
  asset: OfferAsset;
  offer: OfferView | undefined;
  stock: StockPrice | undefined;
  paidUsd: number | null;
  own: boolean;
}) {
  const [value, setValue] = useState("");
  const [lock, setLock] = useState(true);
  const { decimals } = market.underlying;
  const symbol = tokenSymbol(market, asset);

  if (!offer) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        No {symbol} to buy right now. Pick another token or check back soon.
      </p>
    );
  }

  const amount = parseAmount(value, decimals);
  const cost = offerCost(offer.price, amount ?? 0n, decimals);
  const blockedLabel = own
    ? "This is your listing"
    : position && cost > position.dividend
      ? `Insufficient ${market.dividendSymbol}`
      : undefined;

  async function submit() {
    if (amount && offer && (await actions.buyOffer(offer, amount, lock))) setValue("");
  }

  return (
    <div className="space-y-3">
      <AmountField
        label="You buy"
        value={value}
        onChange={setValue}
        decimals={decimals}
        balance={offer.amount}
        balanceLabel="Available"
        symbol={symbol}
        kind={asset}
      />
      <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <Row label="Price" value={`${formatAmount(offer.price, market.dividend.decimals, 2)} ${market.dividendSymbol}`} />
        <Row label="You pay" value={`${formatAmount(cost, market.dividend.decimals, 2)} ${market.dividendSymbol}`} />
        {asset === "yt" && paidUsd !== null && paidUsd > 0 ? (
          <Row
            label="Paid so far per YT"
            value={`${formatUsd(paidUsd)} · ${formatPercent(paybackPercent(market, offer.price, paidUsd) ?? 0)} of price`}
          />
        ) : null}
        {stock ? (
          <Row
            label={`Share of the ${market.symbol} price`}
            value={(() => {
              const percent = shareOfStockPrice(market, offer.price, stock);
              return percent === null ? "—" : formatPercent(percent);
            })()}
          />
        ) : null}
        <Row
          label={`Your ${market.dividendSymbol}`}
          value={position ? formatAmount(position.dividend, market.dividend.decimals, 2) : "—"}
        />
      </div>
      {asset === "yt" ? (
        <Toggle
          checked={lock}
          onChange={setLock}
          label="Lock to start earning"
          description="Locks the YT in the same transaction, so the next dividend is yours."
        />
      ) : (
        <Note>PT is the claim on the share itself. Pair it with YT to redeem the stock.</Note>
      )}
      <div className="pt-2">
        <SubmitButton
          amount={amount}
          max={offer.amount}
          busy={actions.busy}
          readyLabel={asset === "yt" ? (lock ? "Buy & lock YT" : "Buy YT") : "Buy PT"}
          insufficientLabel="More than is listed"
          blockedLabel={amount ? blockedLabel : undefined}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}

function SellForm({
  market,
  position,
  actions,
  asset,
  stock,
  paidUsd,
}: Props & { asset: OfferAsset; stock: StockPrice | undefined; paidUsd: number | null }) {
  const [value, setValue] = useState("");
  const [priceValue, setPriceValue] = useState("");
  const { decimals } = market.underlying;
  const quoteDecimals = market.dividend.decimals;
  const symbol = tokenSymbol(market, asset);

  const amount = parseAmount(value, decimals);
  const price = parseAmount(priceValue, quoteDecimals);
  const sellable = position ? (asset === "yt" ? position.yt + position.ytLocked : position.pt) : undefined;
  const unlockFirst = asset === "yt" && position && amount && amount > position.yt ? amount - position.yt : 0n;
  const proceeds = offerCost(price ?? 0n, amount ?? 0n, decimals);

  async function submit() {
    if (amount && price && (await actions.listOffer(asset, amount, price, unlockFirst))) {
      setValue("");
      setPriceValue("");
    }
  }

  return (
    <div className="space-y-3">
      <AmountField
        label="You sell"
        value={value}
        onChange={setValue}
        decimals={decimals}
        balance={sellable}
        balanceLabel={asset === "yt" ? "YT (incl. locked)" : "In wallet"}
        symbol={symbol}
        kind={asset}
      />
      <AmountField
        label={`Price per ${symbol}`}
        value={priceValue}
        onChange={setPriceValue}
        decimals={quoteDecimals}
        symbol={market.dividendSymbol}
        kind="usd"
      />
      <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <Row label="You receive when it sells" value={`${formatAmount(proceeds, quoteDecimals, 2)} ${market.dividendSymbol}`} />
        {asset === "yt" && price && paidUsd !== null && paidUsd > 0 ? (
          <Row
            label="Paid so far per YT"
            value={`${formatUsd(paidUsd)} · ${formatPercent(paybackPercent(market, price, paidUsd) ?? 0)} of price`}
          />
        ) : null}
        {stock && price ? (
          <Row
            label={`Your price vs the ${market.symbol} share`}
            value={(() => {
              const percent = shareOfStockPrice(market, price, stock);
              return percent === null ? "—" : `${formatPercent(percent)} (${formatUsd(stock.price)} share)`;
            })()}
          />
        ) : null}
        {unlockFirst > 0n ? <Row label="Unlocked first" value={formatAmount(unlockFirst, decimals, 2)} /> : null}
        <Row label="Fees" value="None" />
      </div>
      <Note>
        {asset === "yt"
          ? "Selling YT hands future dividends to the buyer. You keep your PT, and anything your YT already earned stays claimable."
          : "Selling PT sells the claim on the share itself. You keep the YT and its dividends."}{" "}
        Cancel any time to get unsold tokens back.
      </Note>
      <div className="pt-2">
        <SubmitButton
          amount={amount}
          max={sellable}
          busy={actions.busy}
          readyLabel={asset === "yt" ? "List future dividends" : "List PT for sale"}
          insufficientLabel={`Not enough ${symbol}`}
          blockedLabel={amount && !price ? "Enter a price" : undefined}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
