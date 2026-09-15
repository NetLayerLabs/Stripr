"use client";

import { useState } from "react";
import { niceScale, useElementWidth } from "./chart-utils";

export type TimelineBar = { key: string; time: number; value: number };

const MARGIN = { top: 24, right: 16, bottom: 30, left: 52 };

/** Column with a 4px rounded data end and a square baseline. */
function columnPath(x: number, top: number, width: number, base: number) {
  const height = base - top;
  if (height <= 0) return "";
  const radius = Math.min(4, height, width / 2);
  return `M${x},${base}V${top + radius}Q${x},${top} ${x + radius},${top}H${x + width - radius}Q${x + width},${top} ${x + width},${top + radius}V${base}Z`;
}

type BarTimelineProps = {
  bars: TimelineBar[];
  color: string;
  ariaLabel: string;
  emptyLabel: string;
  formatValue: (value: number) => string;
  formatAxis: (value: number) => string;
  formatTime: (time: number) => string;
  formatTooltipTime: (time: number) => string;
  height?: number;
};

/** One column per event, in time order. */
export function BarTimeline({
  bars,
  color,
  ariaLabel,
  emptyLabel,
  formatValue,
  formatAxis,
  formatTime,
  formatTooltipTime,
  height = 260,
}: BarTimelineProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const right = MARGIN.left + plotWidth;
  const base = MARGIN.top + plotHeight;
  const { max, ticks } = niceScale(Math.max(0, ...bars.map((bar) => bar.value)));
  const y = (value: number) => base - (value / max) * plotHeight;
  const band = plotWidth / Math.max(bars.length, 1);
  const barWidth = Math.min(24, band * 0.6);
  const center = (index: number) => MARGIN.left + band * index + band / 2;
  const maxTimeLabels = Math.max(2, Math.floor(plotWidth / 110));
  const timeLabelEvery = Math.max(1, Math.ceil(bars.length / maxTimeLabels));

  // Label selectively: the largest payout and the latest one.
  const largest = bars.reduce((best, bar, index) => (bar.value > bars[best].value ? index : best), 0);
  const labeled = new Set([largest, bars.length - 1]);

  const tooltipLeft =
    active === null ? 0 : Math.min(Math.max(center(active) - 80, 0), Math.max(width - 160, 0));

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {bars.length === 0 ? (
        <div className="grid h-full place-items-center text-sm text-zinc-500">{emptyLabel}</div>
      ) : width > 0 ? (
        <>
          <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block">
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

            {bars.map((bar, index) => {
              const top = y(bar.value);
              return (
                <g key={bar.key}>
                  <path
                    d={columnPath(center(index) - barWidth / 2, top, barWidth, base)}
                    fill={color}
                    opacity={active === null || active === index ? 1 : 0.55}
                  />
                  {labeled.has(index) ? (
                    <text x={center(index)} y={top - 8} textAnchor="middle" className="num fill-zinc-300 text-[11px]">
                      {formatValue(bar.value)}
                    </text>
                  ) : null}
                  {index % timeLabelEvery === 0 ? (
                    <text x={center(index)} y={base + 20} textAnchor="middle" className="num fill-zinc-500 text-[11px]">
                      {formatTime(bar.time)}
                    </text>
                  ) : null}
                  <rect
                    x={MARGIN.left + band * index}
                    y={MARGIN.top}
                    width={band}
                    height={plotHeight}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${formatTooltipTime(bar.time)}: ${formatValue(bar.value)}`}
                    className="outline-none"
                    onPointerEnter={() => setActive(index)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                  />
                </g>
              );
            })}
          </svg>

          {active !== null ? (
            <div
              className="pointer-events-none absolute top-0 w-40 rounded-lg border border-white/10 bg-ink-850/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
              style={{ left: tooltipLeft }}
            >
              <p className="text-zinc-500">{formatTooltipTime(bars[active].time)}</p>
              <p className="num mt-1 font-semibold text-white">{formatValue(bars[active].value)}</p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
