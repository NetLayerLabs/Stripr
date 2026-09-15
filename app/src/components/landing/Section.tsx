import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className="label text-emerald-300/90">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-pretty text-lg leading-relaxed text-zinc-400">{description}</p> : null}
    </div>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  align,
  tinted,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tinted?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-16 border-t border-white/[0.06]", tinted && "bg-white/[0.012]")}>
      <div className="mx-auto max-w-page px-4 py-20 sm:px-6 sm:py-28">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} align={align} />
        <div className="mt-12 sm:mt-14">{children}</div>
      </div>
    </section>
  );
}
