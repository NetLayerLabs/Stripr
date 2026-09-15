"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { NetworkProvider, useNetwork } from "@/components/NetworkProvider";
import { ToastProvider } from "@/components/Toast";
import { TransactionModalProvider } from "@/components/TransactionModal";
import { clientRpcUrl } from "@/lib/config";

// Wallet Standard wallets (Phantom, Solflare, Backpack, ...) register themselves.
const WALLETS: never[] = [];

function NetworkConnection({ children }: { children: ReactNode }) {
  const { cluster } = useNetwork();
  const endpoint = useMemo(() => clientRpcUrl(cluster), [cluster]);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={WALLETS} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 1 },
        },
      })
  );

  return (
    <NetworkProvider>
      <NetworkConnection>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <TransactionModalProvider>{children}</TransactionModalProvider>
          </ToastProvider>
        </QueryClientProvider>
      </NetworkConnection>
    </NetworkProvider>
  );
}
