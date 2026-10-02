"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { date, num } from "@/lib/format";
import { catLabel } from "@/lib/labels";
import { companyHref } from "@/lib/links";
import type { CompanyRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type Key = "company" | "n_active" | "n" | "median_salary" | "avg_days_open" | "repeating_pct" | "last_posted";

const COLS: { key: Key; label: string; right?: boolean; hideSm?: boolean }[] = [
  { key: "company", label: "Uzņēmums" },
  { key: "n_active", label: "Aktīvi", right: true },
  { key: "n", label: "Kopā", right: true, hideSm: true },
  { key: "median_salary", label: "Mediānā alga", right: true },
  { key: "avg_days_open", label: "Vid. atvērts", right: true, hideSm: true },
  { key: "repeating_pct", label: "Atkārtoti", right: true, hideSm: true },
  { key: "last_posted", label: "Pēdējā publ.", right: true, hideSm: true },
];

export function CompanyTable({ rows }: { rows: CompanyRow[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: "n_active", desc: true });
  const [hideRecruiters, setHideRecruiters] = useState(false);

  const shown = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("lv");
    const val = (r: CompanyRow): string | number | null =>
      sort.key === "repeating_pct" ? (r.n ? r.n_repeating / r.n : 0) : (r[sort.key] as string | number | null);
    return rows
      .filter((r) => (!term || r.company.toLocaleLowerCase("lv").includes(term)) && (!hideRecruiters || !r.recruiter))
      .sort((a, b) => {
        const va = val(a), vb = val(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        const c = typeof va === "string" ? va.localeCompare(String(vb), "lv") : va - (vb as number);
        return sort.desc ? -c : c;
      });
  }, [rows, q, sort, hideRecruiters]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Meklēt uzņēmumu…" aria-label="Meklēt uzņēmumu" className="h-8 pl-8 text-[13px]" />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-fg-muted">
          <input type="checkbox" checked={hideRecruiters} onChange={(e) => setHideRecruiters(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          Slēpt atlases aģentūras
        </label>
        <span className="ml-auto text-xs tabular-nums text-fg-subtle">{num(shown.length)} uzņēmumi</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border">
              {COLS.map((c) => {
                const on = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={on ? (sort.desc ? "descending" : "ascending") : undefined}
                    className={cn("whitespace-nowrap px-3 py-2 text-xs font-medium text-fg-subtle", c.right ? "text-right" : "text-left", c.hideSm && "hidden sm:table-cell")}
                  >
                    <button
                      type="button"
                      onClick={() => setSort({ key: c.key, desc: on ? !sort.desc : c.key !== "company" })}
                      className={cn("inline-flex items-center gap-1 hover:text-fg", on && "text-fg")}
                    >
                      {c.label}
                      {on && (sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.company} className="border-b border-border last:border-0 hover:bg-surface-2/60">
                <td className="px-3 py-2">
                  <Link href={companyHref(r.company)} className="font-medium hover:text-accent hover:underline">{r.company}</Link>
                  {r.recruiter && <Badge className="ml-1.5">aģentūra</Badge>}
                  <span className="block text-xs text-fg-subtle">{catLabel(r.main_category)}</span>
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{num(r.n_active)}</td>
                <td className="hidden px-3 py-2 text-right tabular-nums text-fg-muted sm:table-cell">{num(r.n)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{r.median_salary != null ? `€ ${num(r.median_salary)}` : "—"}</td>
                <td className="hidden px-3 py-2 text-right tabular-nums text-fg-muted sm:table-cell">{r.avg_days_open != null ? `${num(r.avg_days_open)} d.` : "—"}</td>
                <td className="hidden px-3 py-2 text-right tabular-nums text-fg-muted sm:table-cell">{r.n ? Math.round((r.n_repeating / r.n) * 100) : 0}%</td>
                <td className="hidden px-3 py-2 text-right tabular-nums text-fg-muted sm:table-cell">{date(r.last_posted)}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={COLS.length} className="px-3 py-10 text-center text-sm text-fg-subtle">Nav atrasts neviens uzņēmums.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
