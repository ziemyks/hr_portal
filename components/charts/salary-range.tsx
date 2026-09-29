import type { SalaryStat } from "@/lib/types";

const nf = new Intl.NumberFormat("lv-LV", { maximumFractionDigits: 0 });

/**
 * Median with interquartile band per group, on one shared € axis.
 * Band = p25–p75 (wash), tick = median (solid). n printed so small samples are visible.
 */
export function SalaryRange({ rows, labelFor }: { rows: SalaryStat[]; labelFor: (k: string) => string }) {
  const valid = rows.filter((r) => r.median != null);
  if (!valid.length) return <p className="text-sm text-fg-subtle">Nav datu.</p>;
  const lo = Math.floor(Math.min(...valid.map((r) => r.p25 ?? r.median!)) / 500) * 500;
  const hi = Math.ceil(Math.max(...valid.map((r) => r.p75 ?? r.median!)) / 500) * 500;
  const span = Math.max(1, hi - lo);
  const x = (v: number) => `${((v - lo) / span) * 100}%`;
  const ticks = [lo, lo + span / 2, hi];

  return (
    <div>
      <table className="w-full text-[13px]">
        <caption className="sr-only">Mēnešalgas mediāna un starpkvartiļu diapazons</caption>
        <thead className="sr-only">
          <tr><th>Grupa</th><th>Mediāna</th><th>25.–75. procentile</th><th>Sludinājumi</th></tr>
        </thead>
        <tbody>
          {valid.map((r) => (
            <tr key={r.key} className="group">
              <th scope="row" className="w-28 py-1.5 pr-3 text-left font-normal text-fg">
                <span className="block truncate">{labelFor(r.key)}</span>
                <span className="block text-[11px] text-fg-subtle">n = {r.n}{r.n < 5 && " · maz datu"}</span>
              </th>
              <td className="py-1.5">
                <div className="relative h-6" title={`Mediāna € ${nf.format(r.median!)} · 25.–75. procentile € ${nf.format(r.p25 ?? 0)}–${nf.format(r.p75 ?? 0)}`}>
                  <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--chart-grid)]" />
                  <div
                    className="absolute top-1/2 h-3 -translate-y-1/2 rounded-[4px] bg-[var(--chart-wash)] ring-1 ring-inset ring-chart-1/40"
                    style={{ left: x(r.p25 ?? r.median!), width: `calc(${x(r.p75 ?? r.median!)} - ${x(r.p25 ?? r.median!)})` }}
                  />
                  <div className="absolute top-1/2 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-1" style={{ left: x(r.median!) }} />
                </div>
              </td>
              <td className="w-20 py-1.5 pl-3 text-right tabular-nums">
                <span className="font-medium">€ {nf.format(r.median!)}</span>
                <span className="block text-[11px] text-fg-subtle">{nf.format(r.p25 ?? 0)}–{nf.format(r.p75 ?? 0)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-28 mr-20 flex justify-between pt-1 text-[11px] tabular-nums text-fg-subtle" aria-hidden>
        {ticks.map((t) => <span key={t}>€ {nf.format(t)}</span>)}
      </div>
    </div>
  );
}
