"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { niceScale, useElementWidth } from "./chart-utils";

export type LineSeries = {
  key: string;
  label: string;
  shortLabel: string;
  color: string;
  values: number[];
};

const MARGIN = { top: 16, right: 84, bottom: 30, left: 52 };

type StepLineChartProps = {
  times: number[];
  series: LineSeries[];
  ariaLabel: string;
  formatValue: (value: number) => string;
  formatAxis: (value: number) => string;
  formatTime: (time: number) => string;
  formatTooltipTime: (time: number) => string;
  height?: number;
};

/** Step lines for state that changes at discrete events (supply, locked balances). */
export function StepLineChart({
  times,
  series,
  ariaLabel,
  formatValue,
  formatAxis,
  formatTime,
  formatTooltipTime,
  height = 260,
}: StepLineChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const empty = times.length === 0;
  const lastIndex = times.length - 1;
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const right = MARGIN.left + plotWidth;
  const base = MARGIN.top + plotHeight;
  const start = empty ? 0 : times[0];
  const end = empty ? 1 : Math.max(times[lastIndex], start + 60_000);

  const x = (time: number) => MARGIN.left + ((time - start) / (end - start)) * plotWidth;
  const { max, ticks } = niceScale(Math.max(0, ...series.flatMap((line) => line.values)));
  const y = (value: number) => base - (value / max) * plotHeight;
  // Enough room per label for a time like "7:24:22 PM" without collisions.
  const xTickCount = plotWidth < 320 ? 2 : plotWidth < 520 ? 3 : 4;
  const xTicks = Array.from(
    { length: xTickCount },
    (_, index) => start + ((end - start) * index) / (xTickCount - 1)
  );

  const linePath = (values: number[]) =>
    values
      .map((value, index) => (index === 0 ? `M${x(times[0])},${y(value)}` : `H${x(times[index])}V${y(value)}`))
      .join("") + `H${right}`;

  const endYs = series.map((line) => y(line.values[lastIndex] ?? 0));
  const endLabelsCollide = endYs.some((a, i) => endYs.some((b, j) => i < j && Math.abs(a - b) < 14));

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const time = start + ((event.clientX - rect.left - MARGIN.left) / plotWidth) * (end - start);
    let index = 0;
    times.forEach((t, i) => {
      if (t <= time) index = i;
    });
    setActive(index);
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    setActive((current) => Math.min(lastIndex, Math.max(0, (current ?? lastIndex) + delta)));
  }

  const tooltipLeft =
    active === null ? 0 : Math.min(Math.max(x(times[active]) - 96, 0), Math.max(width - 192, 0));

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {empty ? (
        <div className="grid h-full place-items-center text-sm text-zinc-500">No activity yet</div>
      ) : width > 0 ? (
        <>
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            className="block touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(lastIndex)}
            onBlur={() => setActive(null)}
            onKeyDown={onKeyDown}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={tick === 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text x={MARGIN.left - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="num fill-zinc-500 text-[11px]">
                  {formatAxis(tick)}
                </text>
              </g>
            ))}
            {xTicks.map((tick, index) => (
              <text
                key={index}
                x={x(tick)}
                y={base + 20}
                textAnchor={index === 0 ? "start" : index === xTicks.length - 1 ? "end" : "middle"}
                className="num fill-zinc-500 text-[11px]"
              >
                {formatTime(tick)}
              </text>
            ))}

            {series.map((line) => (
              <path
                key={line.key}
                d={linePath(line.values)}
                fill="none"
                stroke={line.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {series.map((line, index) => (
              <g key={`${line.key}-end`}>
                <circle cx={right} cy={endYs[index]} r={4} fill={line.color} stroke="var(--chart-surface)" strokeWidth={2} />
                {endLabelsCollide ? null : (
                  <text x={right + 10} y={endYs[index]} dy="0.32em" className="fill-zinc-300 text-[11px]">
                    {line.shortLabel}
                  </text>
                )}
              </g>
            ))}

            {active !== null ? (
              <g pointerEvents="none">
                <line
                  x1={x(times[active])}
                  x2={x(times[active])}
                  y1={MARGIN.top}
                  y2={base}
                  stroke="rgba(255,255,255,0.28)"
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                {series.map((line) => (
                  <circle
                    key={line.key}
                    cx={x(times[active])}
                    cy={y(line.values[active])}
                    r={4}
                    fill={line.color}
                    stroke="var(--chart-surface)"
                    strokeWidth={2}
                  />
                ))}
              </g>
            ) : null}
          </svg>

          {active !== null ? (
            <div
              className="pointer-events-none absolute top-0 w-48 rounded-lg border border-white/10 bg-ink-850/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
              style={{ left: tooltipLeft }}
            >
              <p className="text-zinc-500">{formatTooltipTime(times[active])}</p>
              {series.map((line) => (
                <p key={line.key} className="mt-1.5 flex items-center gap-2">
                  <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: line.color }} />
                  <span className="num font-semibold text-white">{formatValue(line.values[active])}</span>
                  <span className="truncate text-zinc-400">{line.shortLabel}</span>
                </p>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
