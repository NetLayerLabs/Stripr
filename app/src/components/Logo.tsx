export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="2" y="6" width="22" height="9" rx="4.5" fill="#7dd3fc" />
      <rect x="8" y="17" width="22" height="9" rx="4.5" fill="#34d399" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <Logo className="h-7 w-7" />
      <span className="text-[17px] font-semibold tracking-tight text-white">Stripr</span>
    </span>
  );
}
