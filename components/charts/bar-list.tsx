import Link from "next/link";
import type { ReactNode } from "react";

const nf = new Intl.NumberFormat("lv-LV");

export type BarItem = { key: string; label: ReactNode; n: number; href?: string; note?: ReactNode };

/**
 * Horizontal single-series bars in HTML: label left, value at the bar tip.
 * Values are always printed, so colour is never the only channel.
 */
export function BarList({ items, total, max: maxProp, showPct = true }: { items: BarItem[]; total?: number; max?: number; showPct?: boolean }) {
  const max = maxProp ?? Math.max(1, ...items.map((i) => i.n));
  const sum = total ?? items.reduce((s, i) => s + i.n, 0);
  if (!items.length) return <p className="text-sm text-fg-subtle">Nav datu.</p>;
  return (
    <ul className="space-y-2">
      {items.map((i) => {
        const pct = sum ? Math.round((i.n / sum) * 100) : 0;
        const body = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-fg">{i.label}</span>
              <span className="shrink-0 tabular-nums text-fg-muted">
                <span className="font-medium text-fg">{nf.format(i.n)}</span>
                {showPct && <span className="ml-1.5 text-fg-subtle">{pct}%</span>}
                {i.note}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-2">
              <div className="h-1.5 rounded-full bg-chart-1" style={{ width: `${Math.max(1.5, (i.n / max) * 100)}%` }} />
            </div>
          </>
        );
        return (
          <li key={i.key}>
            {i.href ? (
              <Link href={i.href} className="group block rounded-sm [&:hover_span.truncate]:text-accent [&:hover_span.truncate]:underline">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
