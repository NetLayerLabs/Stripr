"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNetwork } from "@/components/NetworkProvider";

const ACK_KEY = "stripr:mainnet-ack";

const POINTS = [
  "Stripr is an unaudited hackathon build. Use amounts you can afford to lose.",
  "xStocks issuers keep control of their tokens: they can pause transfers or move tokens out of any account, including Stripr’s vaults.",
  "PT and YT are claims on what Stripr’s vault holds, not shares and not a promise of dividends.",
  "xStocks aren’t offered in some jurisdictions, including to US persons. It’s your responsibility to check yours.",
];

function readAck() {
  try {
    return window.localStorage.getItem(ACK_KEY) === "1";
  } catch {
    return false;
  }
}

/** A short banner on every mainnet page, plus a one-time dialog before the first mainnet session. */
export function MainnetNotice() {
  const { cluster, setCluster } = useNetwork();
  const [acknowledged, setAcknowledged] = useState(true);
  const primary = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (cluster !== "mainnet-beta") return;
    setAcknowledged(readAck());
  }, [cluster]);

  useEffect(() => {
    if (cluster === "mainnet-beta" && !acknowledged) primary.current?.focus();
  }, [cluster, acknowledged]);

  if (cluster !== "mainnet-beta") return null;

  function acknowledge() {
    try {
      window.localStorage.setItem(ACK_KEY, "1");
    } catch {
      // Not persisted; the dialog will show again next visit.
    }
    setAcknowledged(true);
  }

  return (
    <>
      <div className="border-b border-amber-300/15 bg-amber-300/[0.06]">
        <p className="mx-auto flex max-w-page items-start gap-2.5 px-4 py-3 text-xs leading-relaxed text-amber-100/90 sm:px-6">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span>
            You’re on Solana Mainnet with real assets. Stripr hasn’t been audited, and xStocks issuers can pause
            transfers or move tokens held in any account, including Stripr’s vaults. xStocks aren’t offered in some
            jurisdictions, including the US. Only use amounts you can afford to lose.
          </span>
        </p>
      </div>

      {!acknowledged ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mainnet-ack-title"
            className="card w-full max-w-lg p-6 sm:p-8"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/[0.08]">
                <TriangleAlert className="h-5 w-5 text-amber-300" />
              </span>
              <h2 id="mainnet-ack-title" className="text-lg font-semibold text-white">
                Before you use Stripr on Mainnet
              </h2>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-zinc-300">
              {POINTS.map((point) => (
                <li key={point} className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
              <button ref={primary} type="button" onClick={acknowledge} className="btn-primary h-11 px-5">
                I understand, continue
              </button>
              <button type="button" onClick={() => setCluster("devnet")} className="btn-secondary h-11 px-5">
                Switch to Devnet
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
