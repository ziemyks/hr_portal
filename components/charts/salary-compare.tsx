import type { CompanyProfile } from "@/lib/types";

const nf = new Intl.NumberFormat("lv-LV", { maximumFractionDigits: 0 });

/** Per seniority: company min–max range + median dot vs market median dot, one shared € axis. */
export function SalaryCompare({ rows, labelFor }: { rows: CompanyProfile["salary_by_seniority"]; labelFor: (k: string) => string }) {
  const valid = rows.filter((r) => r.median != null);
  if (!valid.length) return <p className="text-sm text-fg-subtle">Nav mēneša algu datu.</p>;
  const vals = valid.flatMap((r) => [r.min, r.max, r.median, r.market_median].filter((v): v is number => v != null));
  const lo = Math.floor(Math.min(...vals) / 500) * 500;
  const hi = Math.ceil(Math.max(...vals) / 500) * 500;
  const span = Math.max(1, hi - lo);
  const x = (v: number) => `${((v - lo) / span) * 100}%`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-fg-subtle" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-chart-1" /> uzņēmuma mediāna (līnija: min–maks)</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-chart-2" /> tirgus mediāna</span>
      </div>
      <table className="w-full text-[13px]">
        <caption className="sr-only">Mēnešalga pēc līmeņa: uzņēmums pret tirgu</caption>
        <tbody>
          {valid.map((r) => {
            const diff = r.market_median ? Math.round(((r.median! - r.market_median) / r.market_median) * 100) : null;
            return (
              <tr key={r.key}>
                <th scope="row" className="w-24 py-2 pr-3 text-left font-normal">
                  <span className="block truncate">{labelFor(r.key)}</span>
                  <span className="block text-[11px] text-fg-subtle">n = {r.n}</span>
                </th>
                <td className="py-2">
                  <div className="relative h-6">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--chart-grid)]" />
                    {r.min != null && r.max != null && r.max > r.min && (
                      <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-chart-1/35" style={{ left: x(r.min), width: `calc(${x(r.max)} - ${x(r.min)})` }} />
                    )}
                    {r.market_median != null && (
                      <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-2 ring-2 ring-surface" style={{ left: x(r.market_median) }} />
                    )}
                    <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-1 ring-2 ring-surface" style={{ left: x(r.median!) }} />
                  </div>
                </td>
                <td className="w-28 py-2 pl-3 text-right tabular-nums">
                  <span className="font-medium">€ {nf.format(r.median!)}</span>
                  <span className="block text-[11px] text-fg-subtle">
                    tirgū {r.market_median != null ? `€ ${nf.format(r.market_median)}` : "—"}
                    {diff != null && ` (${diff > 0 ? "+" : ""}${diff}%)`}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="ml-24 mr-28 flex justify-between pt-1 text-[11px] tabular-nums text-fg-subtle" aria-hidden>
        <span>€ {nf.format(lo)}</span><span>€ {nf.format(lo + span / 2)}</span><span>€ {nf.format(hi)}</span>
      </div>
    </div>
  );
}
