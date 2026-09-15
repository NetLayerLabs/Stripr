"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/components/NetworkProvider";
import { fetchPosition, type MarketView } from "@/lib/stripr";

export function usePosition(market: MarketView | undefined) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { cluster } = useNetwork();
  return useQuery({
    queryKey: ["position", cluster, market?.address.toBase58(), publicKey?.toBase58()],
    queryFn: () => fetchPosition(connection, market!, publicKey!),
    enabled: Boolean(market && publicKey),
    refetchInterval: 15_000,
  });
}

/** The test-token faucet only exists on devnet. */
export function useFaucetEnabled() {
  const { cluster } = useNetwork();
  const { data } = useQuery({
    queryKey: ["faucet-enabled"],
    queryFn: async () => {
      const response = await fetch("/api/faucet");
      if (!response.ok) return false;
      const body = (await response.json()) as { enabled?: boolean };
      return body.enabled === true;
    },
    enabled: cluster === "devnet",
    staleTime: Infinity,
  });
  return cluster === "devnet" && (data ?? false);
}
