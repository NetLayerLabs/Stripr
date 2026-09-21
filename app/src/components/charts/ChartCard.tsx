"use client";

import { useState, type ReactNode } from "react";
import { Segmented } from "@/components/ui";
import { cn } from "@/lib/cn";

const VIEWS = [
  { value: "chart", label: "Chart" },
  { value: "table", label: "Table" },
] as const;

/** A chart with its accessible table twin one toggle away. */
export function ChartCard({
  title,
  description,
  legend,
  table,
  className,
  children,
}: {
  title: string;
  description?: string;
  legend?: ReactNode;
  table: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <figure className={cn("card flex min-w-0 flex-col p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <figcaption className="font-display text-base text-white">{title}</figcaption>
          {description ? <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p> : null}
        </div>
        <Segmented size="sm" options={VIEWS} value={view} onChange={setView} />
      </div>
      {view === "chart" && legend ? <div className="mt-4">{legend}</div> : null}
      <div className="mt-4">{view === "chart" ? children : <div className="max-h-[260px] overflow-auto">{table}</div>}</div>
    </figure>
  );
}

export function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-300">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function DataTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-left text-xs">
      <thead className="sticky top-0 bg-ink-900">
        <tr>
          {columns.map((column, index) => (
            <th key={column} className={cn("label py-2 pr-4 font-medium", index > 0 && "text-right")}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-white/[0.05]">
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, index) => (
              <td key={index} className={cn("num py-2 pr-4 text-zinc-300", index > 0 && "text-right")}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
