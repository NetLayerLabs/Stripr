"use client";

import { ArrowUpRight, Check, CircleCheck, CircleX, Copy, LoaderCircle, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNetwork } from "@/components/NetworkProvider";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/cn";
import { shortAddress } from "@/lib/format";

export type TxDetail = { label: string; value: string };

type Phase = "running" | "success" | "error";

type TxState = {
  title: string;
  subtitle?: string;
  details: TxDetail[];
  steps: string[];
  /** Index of the step in progress (or that failed). */
  step: number;
  phase: Phase;
  signature?: string;
  error?: string;
  visible: boolean;
};

type TransactionModalApi = {
  start: (input: { title: string; subtitle?: string; details: TxDetail[]; steps: string[] }) => void;
  step: (index: number, signature?: string) => void;
  succeed: (signature: string) => void;
  fail: (message: string, signature?: string) => void;
};

const TransactionModalContext = createContext<TransactionModalApi | null>(null);

export function useTransactionModal() {
  const api = useContext(TransactionModalContext);
  if (!api) throw new Error("useTransactionModal must be used inside TransactionModalProvider");
  return api;
}

export function TransactionModalProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const { txUrl } = useNetwork();
  const [tx, setTx] = useState<TxState | null>(null);
  // Set when the user hides a transaction that is still running, so its result arrives as a toast.
  const hiddenRef = useRef(false);
  const titleRef = useRef("");

  const start = useCallback<TransactionModalApi["start"]>((input) => {
    hiddenRef.current = false;
    titleRef.current = input.title;
    setTx({ ...input, step: 0, phase: "running", visible: true });
  }, []);

  const step = useCallback<TransactionModalApi["step"]>((index, signature) => {
    setTx((current) => current && { ...current, step: index, signature: signature ?? current.signature });
  }, []);

  const succeed = useCallback<TransactionModalApi["succeed"]>(
    (signature) => {
      setTx((current) => current && { ...current, phase: "success", step: current.steps.length, signature });
      if (hiddenRef.current) {
        toast.show({ kind: "success", title: titleRef.current, description: "Transaction confirmed.", href: txUrl(signature) });
      }
    },
    [toast, txUrl]
  );

  const fail = useCallback<TransactionModalApi["fail"]>(
    (message, signature) => {
      setTx((current) => current && { ...current, phase: "error", error: message, signature: signature ?? current.signature });
      if (hiddenRef.current) {
        toast.show({
          kind: "error",
          title: `${titleRef.current} failed`,
          description: message,
          href: signature ? txUrl(signature) : undefined,
        });
      }
    },
    [toast, txUrl]
  );

  const close = useCallback(() => {
    setTx((current) => {
      if (!current) return null;
      if (current.phase === "running") {
        hiddenRef.current = true;
        return { ...current, visible: false };
      }
      return null;
    });
  }, []);

  const api = useMemo(() => ({ start, step, succeed, fail }), [start, step, succeed, fail]);

  return (
    <TransactionModalContext.Provider value={api}>
      {children}
      {tx?.visible ? <TransactionDialog tx={tx} onClose={close} /> : null}
    </TransactionModalContext.Provider>
  );
}

function StepIcon({ state }: { state: "done" | "active" | "error" | "upcoming" }) {
  if (state === "done") {
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.06] text-zinc-200">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-400/15 text-rose-300">
        <X className="h-3.5 w-3.5" />
      </span>
    );
  }
  return <span className="h-6 w-6 shrink-0 rounded-full border border-white/10" />;
}

function TransactionDialog({ tx, onClose }: { tx: TxState; onClose: () => void }) {
  const { txUrl } = useNetwork();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function copySignature() {
    if (!tx.signature) return;
    await navigator.clipboard.writeText(tx.signature);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const status =
    tx.phase === "success"
      ? "Confirmed on Solana"
      : tx.phase === "error"
        ? "Transaction didn’t complete"
        : `${tx.steps[tx.step] ?? "Working"}…`;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/75 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-title"
        className="card w-full max-w-md animate-toast-in bg-ink-900 p-6 shadow-2xl"
      >
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-full",
              tx.phase === "success" && "bg-emerald-400/15 text-emerald-300",
              tx.phase === "error" && "bg-rose-400/15 text-rose-300",
              tx.phase === "running" && "bg-white/[0.06] text-zinc-200"
            )}
          >
            {tx.phase === "success" ? (
              <CircleCheck className="h-6 w-6" />
            ) : tx.phase === "error" ? (
              <CircleX className="h-6 w-6" />
            ) : (
              <LoaderCircle className="h-6 w-6 animate-spin" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="transaction-title" className="font-semibold text-white">
              {tx.title}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500" aria-live="polite">
              {tx.subtitle ? `${tx.subtitle} · ` : ""}
              {status}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={tx.phase === "running" ? "Hide" : "Close"}
            className="-m-1 rounded-lg p-1.5 text-zinc-500 outline-none transition-colors hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {tx.details.length > 0 ? (
          <dl className="mt-5 space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
            {tx.details.map((detail) => (
              <div key={detail.label} className="flex justify-between gap-4">
                <dt className="text-zinc-500">{detail.label}</dt>
                <dd className="num text-right text-zinc-100">{detail.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <ol className="mt-5 space-y-3">
          {tx.steps.map((label, index) => {
            const state =
              tx.phase === "success" || index < tx.step
                ? "done"
                : tx.phase === "error" && index === tx.step
                  ? "error"
                  : tx.phase === "running" && index === tx.step
                    ? "active"
                    : "upcoming";
            return (
              <li key={label} className="flex items-center gap-3 text-sm">
                <StepIcon state={state} />
                <span className={cn(state === "upcoming" ? "text-zinc-600" : "text-zinc-200")}>{label}</span>
              </li>
            );
          })}
        </ol>

        {tx.phase === "error" && tx.error ? (
          <p className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200">
            {tx.error}
          </p>
        ) : null}

        {tx.signature ? (
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4 text-sm">
            <span className="text-zinc-500">Transaction</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-300">{shortAddress(tx.signature, 6)}</span>
              <button
                type="button"
                onClick={copySignature}
                aria-label="Copy transaction signature"
                className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </span>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-secondary h-10 px-4">
            {tx.phase === "running" ? "Hide" : "Close"}
          </button>
          {tx.signature ? (
            <a
              href={txUrl(tx.signature)}
              target="_blank"
              rel="noreferrer"
              className={cn(tx.phase === "success" ? "btn-primary" : "btn-secondary", "h-10 px-4")}
            >
              View on Solana Explorer
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>

        {tx.phase === "running" ? (
          <p className="mt-4 text-center text-xs text-zinc-600">
            You can hide this window. We’ll keep tracking the transaction.
          </p>
        ) : null}
      </div>
    </div>
  );
}
