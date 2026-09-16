"use client";

import { useQuery } from "@tanstack/react-query";
import type { PricesResponse, StockPrice } from "@/app/api/prices/route";

/** Reference stock prices from Pyth. Empty when no API key is configured. */
export function usePrices() {
  return useQuery({
    queryKey: ["pyth-prices"],
    queryFn: async (): Promise<PricesResponse> => {
      const response = await fetch("/api/prices");
      if (!response.ok) throw new Error("Reference prices are unavailable.");
      return (await response.json()) as PricesResponse;
    },
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

export function useStockPrice(symbol: string): StockPrice | undefined {
  const { data } = usePrices();
  return data?.enabled ? data.prices[symbol] : undefined;
}
