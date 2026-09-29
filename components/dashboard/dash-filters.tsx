"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { dashToAdsQuery, type DashFilters } from "@/lib/filters";
import { catLabel, SENIORITY, SENIORITY_ORDER, WORK_MODE } from "@/lib/labels";
import type { Facet } from "@/lib/types";
import { cn } from "@/lib/utils";

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const RANGES = [
  { key: "all", label: "Viss periods", from: null as number | null },
  { key: "90", label: "90 d.", from: 90 },
  { key: "30", label: "30 d.", from: 30 },
];

export function DashFiltersBar({ filters, towns, categories, subcategories }: { filters: DashFilters; towns: Facet[]; categories: Facet[]; subcategories: Facet[] }) {
  const router = useRouter();
  const push = (patch: Partial<DashFilters>) => {
    const f = { ...filters, ...patch };
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v) u.set(k, v);
    const s = u.toString();
    router.push(s ? `/?${s}` : "/", { scroll: false });
  };
  const rangeKey = !filters.from ? "all" : RANGES.find((r) => r.from != null && daysAgo(r.from) === filters.from)?.key ?? "custom";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg bg-surface-2 p-0.5" role="group" aria-label="Periods (pirmā publicēšana)">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            aria-pressed={rangeKey === r.key}
            onClick={() => push({ from: r.from != null ? daysAgo(r.from) : null, to: null })}
            className={cn(
              "h-7 rounded-md px-3 text-[13px] font-medium transition-colors",
              rangeKey === r.key ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <Select aria-label="Kategorija" value={filters.cat ?? ""} onChange={(e) => push({ cat: e.target.value || null })} className="h-8 w-auto text-[13px]">
        <option value="">Visas kategorijas</option>
        {categories.map((c) => <option key={c.value} value={c.value}>{catLabel(c.value)} ({c.n})</option>)}
      </Select>
      <Select aria-label="Apakškategorija" value={filters.sub ?? ""} onChange={(e) => push({ sub: e.target.value || null })} className="h-8 w-auto max-w-52 text-[13px]">
        <option value="">Visas apakškategorijas</option>
        {subcategories.map((c) => <option key={c.value} value={c.value}>{catLabel(c.value)} ({c.n})</option>)}
      </Select>
      <Select aria-label="Līmenis" value={filters.sen ?? ""} onChange={(e) => push({ sen: e.target.value || null })} className="h-8 w-auto text-[13px]">
        <option value="">Visi līmeņi</option>
        {SENIORITY_ORDER.map((k) => <option key={k} value={k}>{SENIORITY[k]}</option>)}
      </Select>
      <Select aria-label="Pilsēta" value={filters.town ?? ""} onChange={(e) => push({ town: e.target.value || null })} className="h-8 w-auto max-w-44 text-[13px]">
        <option value="">Visas pilsētas</option>
        {towns.map((t) => <option key={t.value} value={t.value}>{t.value} ({t.n})</option>)}
      </Select>
      <Select aria-label="Darba veids" value={filters.mode ?? ""} onChange={(e) => push({ mode: e.target.value || null })} className="h-8 w-auto text-[13px]">
        <option value="">Jebkurš darba veids</option>
        {["ON_SITE", "HYBRID", "FULLY_REMOTE"].map((k) => <option key={k} value={k}>{WORK_MODE[k]}</option>)}
      </Select>
      {(filters.cat || filters.sub || filters.sen || filters.town || filters.mode || filters.from) && (
        <Link href="/" scroll={false} className="px-1 text-xs font-medium text-accent hover:underline">Notīrīt</Link>
      )}
      <Link href={`/ads${dashToAdsQuery(filters)}`} className={buttonClass("outline", "sm", "ml-auto")}>
        Skatīt sludinājumus <ArrowRight />
      </Link>
    </div>
  );
}
