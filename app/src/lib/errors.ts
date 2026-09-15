import idl from "@/idl/stripr.json";

const programErrors = new Map(idl.errors.map((error) => [error.code, error.msg]));

function collectText(error: unknown, depth = 0): string[] {
  if (!error || depth > 3) return [];
  if (typeof error === "string") return [error];
  if (typeof error !== "object") return [String(error)];
  const { message, logs, error: inner } = error as {
    message?: unknown;
    logs?: unknown;
    error?: unknown;
  };
  return [
    ...(typeof message === "string" ? [message] : []),
    ...(Array.isArray(logs) ? logs.filter((line): line is string => typeof line === "string") : []),
    ...collectText(inner, depth + 1),
  ];
}

/** Turns wallet, RPC and program errors into a sentence a user can act on. */
export function describeError(error: unknown): string {
  const parts = collectText(error);
  const text = parts.join("\n");

  if (/user rejected|rejected the request|request was rejected|declined/i.test(text)) {
    return "Request was cancelled in your wallet.";
  }
  const anchorMessage = /Error Message: ([^\n]+?)\.?$/m.exec(text);
  if (anchorMessage) return `${anchorMessage[1]}.`;

  const custom = /custom program error: 0x([0-9a-f]+)/i.exec(text);
  if (custom) {
    const code = parseInt(custom[1], 16);
    const message = programErrors.get(code);
    if (message) return `${message}.`;
    if (code === 1) return "Insufficient token balance.";
  }
  if (/insufficient (lamports|funds for fee)|no record of a prior credit/i.test(text)) {
    return "Not enough SOL to pay network fees.";
  }
  if (/blockhash not found|block height exceeded/i.test(text)) {
    return "The transaction expired before it confirmed. Please try again.";
  }
  const fallback = parts[0] ?? "Something went wrong.";
  return fallback.length > 160 ? `${fallback.slice(0, 157)}…` : fallback;
}
