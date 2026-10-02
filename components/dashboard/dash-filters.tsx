"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { MultiSelect } from "@/components/ads/multi-select";
import { buttonClass } from "@/components/ui/button";
import { dashToAdsQuery, type DashFilters } from "@/lib/filters";
import { catLabel, label, SENIORITY, WORK_MODE } from "@/lib/labels";
import type { FacetCounts } from "@/lib/facets";
import type { MultiKey } from "@/lib/filters";
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

type SelectKey = "cat" | "sub" | "sen" | "town" | "mode";
const FACET_KEY: Record<SelectKey, MultiKey> = { cat: "cat", sub: "sub", sen: "sen", town: "town", mode: "mode" };
const SELECTS: { key: SelectKey; label: string }[] = [
  { key: "cat", label: "Kategorija" },
  { key: "sub", label: "Apakškategorija" },
  { key: "sen", label: "Līmenis" },
  { key: "town", label: "Pilsēta" },
  { key: "mode", label: "Darba veids" },
];
const labelOf: Record<SelectKey, (v: string) => string> = {
  cat: catLabel,
  sub: catLabel,
  sen: (v) => label(SENIORITY, v),
  town: (v) => v,
  mode: (v) => label(WORK_MODE, v),
};

/** Each select lists only values available under the other filters, most frequent first. */
export function DashFiltersBar({ filters, facetCounts }: { filters: DashFilters; facetCounts: FacetCounts }) {
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
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface p-2 shadow-sm">
      <div className="mr-1 inline-flex rounded-lg bg-surface-2 p-0.5" role="group" aria-label="Periods (pirmā publicēšana)">
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
      {SELECTS.map(({ key, label: l }) => (
        <MultiSelect
          key={key}
          single
          label={l}
          options={facetCounts[FACET_KEY[key]].map((o) => ({ value: o.value, label: labelOf[key](o.value), n: o.n }))}
          selected={filters[key] ? [filters[key]!] : []}
          onChange={(v) => push({ [key]: v[0] ?? null })}
        />
      ))}
      {(filters.cat || filters.sub || filters.sen || filters.town || filters.mode || filters.from) && (
        <Link href="/" scroll={false} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-accent hover:bg-accent-soft">
          <X className="size-3.5" /> Notīrīt
        </Link>
      )}
      <Link href={`/ads${dashToAdsQuery(filters)}`} className={buttonClass("ghost", "sm", "ml-auto text-accent hover:text-accent")}>
        Skatīt sludinājumus <ArrowRight />
      </Link>
    </div>
  );
}
