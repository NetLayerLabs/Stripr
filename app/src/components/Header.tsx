import Link from "next/link";
import { Wordmark } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NetworkSelect } from "./NetworkSelect";
import { WalletButton } from "./WalletButton";

const LANDING_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#tokens", label: "Tokens" },
  { href: "/#technology", label: "Technology" },
  { href: "/#roadmap", label: "Roadmap" },
  { href: "/#faq", label: "FAQ" },
];

const APP_LINKS = [
  { href: "/app", label: "Markets" },
  { href: "/#how", label: "How it works" },
];

export function Header({ variant }: { variant: "landing" | "app" }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-header items-center gap-8 px-4 sm:px-6">
        <Link href="/" aria-label="Stripr home">
          <Wordmark />
        </Link>

        {variant === "landing" ? (
          <>
            <nav className="ml-auto hidden items-center gap-7 text-sm md:flex">
              {LANDING_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="text-zinc-400 transition-colors hover:text-white">
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="ml-auto md:hidden">
              <MobileMenu links={LANDING_LINKS} action={{ href: "/app", label: "Launch app" }} />
            </div>
          </>
        ) : (
          <>
            <nav className="hidden items-center gap-6 text-sm md:flex">
              {APP_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={link.href === "/app" ? "text-white" : "text-zinc-400 transition-colors hover:text-white"}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            {/* At phone width the network and wallet move into the menu; there is no room beside the wordmark. */}
            <div className="ml-auto hidden items-center gap-2 md:flex sm:gap-3">
              <NetworkSelect />
              <WalletButton />
            </div>
            <div className="ml-auto md:hidden">
              <MobileMenu links={APP_LINKS} withControls />
            </div>
          </>
        )}
      </div>
    </header>
  );
}
