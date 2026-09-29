import type { ReactNode } from "react";

/**
 * Company share (bar, series colour) against the market share (thin ink tick) on a
 * shared 0–100% scale. Both values are printed, so identity never relies on colour.
 */
export function CompareBars({ items, max: maxProp }: { items: { key: string; label: ReactNode; pct: number; market_pct: number; n?: number }[]; max?: number }) {
  if (!items.length) return <p className="text-sm text-fg-subtle">Nav datu.</p>;
  const max = maxProp ?? Math.min(100, Math.max(10, ...items.map((i) => Math.max(i.pct, i.market_pct))));
  const w = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <ul className="space-y-2.5">
      {items.map((i) => {
        const diff = i.pct - i.market_pct;
        return (
          <li key={i.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-fg">{i.label}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-medium text-fg">{Math.round(i.pct)}%</span>
                {i.n != null && <span className="ml-1 text-fg-subtle">({i.n})</span>}
                <span className="ml-2 text-xs text-fg-subtle">tirgū {Math.round(i.market_pct)}%</span>
                {Math.abs(diff) >= 10 && (
                  <span className="ml-1.5 text-xs font-medium text-fg-muted">{diff > 0 ? "▲" : "▼"}{Math.abs(Math.round(diff))}</span>
                )}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-surface-2">
              <div className="h-2 rounded-full bg-chart-1" style={{ width: w(i.pct) }} />
              <div className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-fg-muted" style={{ left: w(i.market_pct) }} aria-hidden />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CompareLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[11px] text-fg-subtle" aria-hidden>
      <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-chart-1" /> šis uzņēmums</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 rounded-full bg-fg-muted" /> tirgus vidēji</span>
    </div>
  );
}
