export const pow10 = (decimals: number) => 10n ** BigInt(decimals);

export const minBigInt = (a: bigint, b: bigint) => (a < b ? a : b);

/** Parses a typed decimal string into base units, or null if it isn't a valid amount. */
export function parseAmount(input: string, decimals: number): bigint | null {
  const match = /^(\d*)(?:\.(\d*))?$/.exec(input.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const [, whole, fraction = ""] = match;
  if (fraction.length > decimals) return null;
  return BigInt(whole || "0") * pow10(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
}

/** Formats base units for display, truncating to `maxFraction` digits. */
export function formatAmount(amount: bigint, decimals: number, maxFraction = 4): string {
  const base = pow10(decimals);
  const whole = amount / base;
  const fraction = (amount % base)
    .toString()
    .padStart(decimals, "0")
    .slice(0, maxFraction)
    .replace(/0+$/, "");
  if (amount > 0n && whole === 0n && !fraction) {
    return `<0.${"0".repeat(Math.max(maxFraction - 1, 0))}1`;
  }
  const wholeText = whole.toLocaleString("en-US");
  return fraction ? `${wholeText}.${fraction}` : wholeText;
}

/** Full-precision value for an input field. */
export function toInputValue(amount: bigint, decimals: number): string {
  const base = pow10(decimals);
  const fraction = (amount % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${amount / base}.${fraction}` : `${amount / base}`;
}

export function formatShare(part: bigint, total: bigint): string {
  if (total === 0n || part === 0n) return "0%";
  const basisPoints = (part * 10_000n) / total;
  if (basisPoints === 0n) return "<0.01%";
  return `${(Number(basisPoints) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

export const shortAddress = (address: string, chars = 4) =>
  `${address.slice(0, chars)}…${address.slice(-chars)}`;
