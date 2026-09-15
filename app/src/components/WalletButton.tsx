"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  LogOut,
  Repeat,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNetwork } from "@/components/NetworkProvider";
import { shortAddress } from "@/lib/format";

const MENU_ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-zinc-300 hover:bg-white/[0.06] hover:text-white";

function MenuItem({ icon: Icon, onClick, children }: { icon: LucideIcon; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={MENU_ITEM}>
      <Icon className="h-4 w-4 text-zinc-500" />
      {children}
    </button>
  );
}

export function WalletButton() {
  const { publicKey, wallet, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { addressUrl } = useNetwork();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      const outside =
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !menuRef.current?.contains(event.target as Node);
      if (outside) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!publicKey) {
    return (
      <button
        type="button"
        className="btn-primary h-9 px-4"
        disabled={connecting}
        onClick={() => setVisible(true)}
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  const address = publicKey.toBase58();

  async function copyAddress() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="btn-secondary h-9 px-3"
      >
        {wallet?.adapter.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={wallet.adapter.icon} alt="" className="h-4 w-4 rounded" />
        ) : null}
        <span className="font-mono text-[13px] font-medium">{shortAddress(address)}</span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
      </button>

      {open ? (
        <div role="menu" className="card absolute right-0 top-11 z-50 w-56 bg-ink-900 p-1.5 text-sm shadow-2xl">
          <MenuItem icon={copied ? Check : Copy} onClick={copyAddress}>
            {copied ? "Copied" : "Copy address"}
          </MenuItem>
          <a
            role="menuitem"
            href={addressUrl(address)}
            target="_blank"
            rel="noreferrer"
            className={MENU_ITEM}
          >
            <ArrowUpRight className="h-4 w-4 text-zinc-500" />
            View on explorer
          </a>
          <MenuItem
            icon={Repeat}
            onClick={() => {
              setOpen(false);
              setVisible(true);
            }}
          >
            Change wallet
          </MenuItem>
          <MenuItem
            icon={LogOut}
            onClick={() => {
              setOpen(false);
              void disconnect();
            }}
          >
            Disconnect
          </MenuItem>
        </div>
      ) : null}
    </div>
  );
}
