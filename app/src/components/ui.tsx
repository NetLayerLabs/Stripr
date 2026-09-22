import type { ReactNode } from "react";
import { brandGlyph } from "@/components/BrandGlyphs";
import { cn } from "@/lib/cn";

export type TokenKind = "stock" | "pt" | "yt" | "usd";

const TOKEN_TONES: Record<TokenKind, string> = {
  stock: "bg-zinc-100 text-zinc-900",
  pt: "bg-sky-400/15 text-sky-300 ring-1 ring-inset ring-sky-400/30",
  yt: "bg-emerald-400/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30",
  usd: "bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-400/30",
};

const ICON_SIZES = {
  sm: "h-5 w-5 text-[7px]",
  md: "h-7 w-7 text-[9px]",
  lg: "h-10 w-10 text-xs",
};

export function TokenIcon({
  kind,
  symbol,
  size = "md",
}: {
  kind: TokenKind;
  symbol: string;
  size?: keyof typeof ICON_SIZES;
}) {
  const Brand = kind === "stock" ? brandGlyph(symbol) : null;
  const glyph = kind === "pt" ? "PT" : kind === "yt" ? "YT" : kind === "usd" ? "$" : symbol.slice(0, 1);
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold tracking-tight",
        ICON_SIZES[size],
        TOKEN_TONES[kind]
      )}
    >
      {Brand ? <Brand className="h-[55%] w-auto" /> : glyph}
    </span>
  );
}

export function TokenLabel({
  kind,
  symbol,
  size,
}: {
  kind: TokenKind;
  symbol: string;
  size?: keyof typeof ICON_SIZES;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
      <TokenIcon kind={kind} symbol={symbol} size={size} />
      {symbol}
    </span>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card min-w-0 p-4 sm:p-5">
      <div className="label">{label}</div>
      <div className="num mt-2 truncate font-display text-xl leading-tight text-white sm:text-2xl">{value}</div>
      {sub ? <div className="mt-1 truncate text-xs text-zinc-500">{sub}</div> : null}
    </div>
  );
}

export function Row({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 text-sm", className)}>
      <span className="text-zinc-500">{label}</span>
      <span className="num text-right text-zinc-200">{value}</span>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div role="tablist" className="inline-flex rounded-xl border border-white/[0.07] bg-ink-950/60 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg font-medium transition-colors",
            size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
            option.value === value
              ? "bg-white/[0.09] text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
          checked ? "bg-emerald-400" : "bg-white/15"
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </button>
      <span>
        <span className="block text-sm font-medium text-zinc-100">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="px-1 text-xs leading-relaxed text-zinc-500">{children}</p>;
}
