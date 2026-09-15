"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LoaderCircle } from "lucide-react";

type SubmitButtonProps = {
  amount: bigint | null;
  /** Spendable balance; undefined while it is still loading. */
  max: bigint | undefined;
  busy: boolean;
  readyLabel: string;
  insufficientLabel: string;
  /** Shown (disabled) instead of the ready label when the action can't run. */
  blockedLabel?: string;
  onSubmit: () => void;
};

const CLASS_NAME = "btn-primary h-12 w-full text-[15px]";

export function SubmitButton({
  amount,
  max,
  busy,
  readyLabel,
  insufficientLabel,
  blockedLabel,
  onSubmit,
}: SubmitButtonProps) {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  if (!publicKey) {
    return (
      <button type="button" className={CLASS_NAME} onClick={() => setVisible(true)}>
        Connect wallet
      </button>
    );
  }

  const blocker =
    blockedLabel ??
    (max === undefined
      ? "Loading balances…"
      : !amount
        ? "Enter an amount"
        : amount > max
          ? insufficientLabel
          : null);

  return (
    <button type="button" className={CLASS_NAME} disabled={busy || blocker !== null} onClick={onSubmit}>
      {busy ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Waiting for confirmation
        </>
      ) : (
        (blocker ?? readyLabel)
      )}
    </button>
  );
}
