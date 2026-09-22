/**
 * The Solana logomark, inline so it stays crisp at any size and needs no extra
 * request. Gradient ids are prefixed because two gradients in one document with
 * the same id would make whichever renders second inherit the first one's stops.
 */
export function SolanaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 398 312" role="img" aria-label="Solana" className={className}>
      <defs>
        <linearGradient id="solana-mark-a" x1="360.9" y1="-37.5" x2="141.2" y2="383.2" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id="solana-mark-b" x1="264.8" y1="-87.6" x2="45.2" y2="333.1" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id="solana-mark-c" x1="312.5" y1="-62.7" x2="92.9" y2="358" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <path
        fill="url(#solana-mark-b)"
        d="M64.6 237.9a11.6 11.6 0 0 1 8.2-3.4h318.6c5.2 0 7.8 6.3 4.1 10l-62.7 62.7a11.6 11.6 0 0 1-8.2 3.4H5.9c-5.2 0-7.8-6.3-4.1-10l62.8-62.7Z"
      />
      <path
        fill="url(#solana-mark-a)"
        d="M64.6 3.4A11.6 11.6 0 0 1 72.8 0h318.6c5.2 0 7.8 6.3 4.1 10l-62.7 62.8a11.6 11.6 0 0 1-8.2 3.4H5.9c-5.2 0-7.8-6.3-4.1-10L64.6 3.4Z"
      />
      <path
        fill="url(#solana-mark-c)"
        d="M333.4 119.8a11.6 11.6 0 0 0-8.2-3.4H6.6c-5.2 0-7.8 6.3-4.1 10l62.7 62.8a11.6 11.6 0 0 0 8.2 3.4h318.6c5.2 0 7.8-6.3 4.1-10l-62.7-62.8Z"
      />
    </svg>
  );
}
