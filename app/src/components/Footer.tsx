import Link from "next/link";
import { Wordmark } from "./Logo";

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
  {
    title: "Product",
    links: [
      { label: "Launch app", href: "/app" },
      { label: "How it works", href: "/#how" },
      { label: "Dividend calculator", href: "/#calculator" },
    ],
  },
  {
    title: "Protocol",
    links: [
      { label: "PT & YT", href: "/#tokens" },
      { label: "Technology", href: "/#technology" },
      { label: "Roadmap", href: "/#roadmap" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "Stocklana Hackathon", href: "https://hackathons.solana.com/hackathons/stocklana", external: true },
      { label: "Why Solana", href: "/#solana" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto grid max-w-page gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
            Yield stripping for tokenized stocks on Solana. Built by NetLayer Labs for the Stocklana Hackathon.
          </p>
          <a
            href="https://x.com/StriprHQ"
            target="_blank"
            rel="noreferrer"
            aria-label="Stripr on X"
            title="Stripr on X"
            className="mt-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:border-white/25 hover:text-white"
          >
            {/* The X mark, drawn inline: lucide only ships the old Twitter bird. */}
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="label">{column.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a href={link.href} target="_blank" rel="noreferrer" className="text-zinc-400 transition-colors hover:text-white">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-zinc-400 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
