"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
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
const SELECTS: { key: SelectKey; label: string; all: string; width?: string }[] = [
  { key: "cat", label: "Kategorija", all: "Visas kategorijas" },
  { key: "sub", label: "Apakškategorija", all: "Visas apakškategorijas", width: "max-w-52" },
  { key: "sen", label: "Līmenis", all: "Visi līmeņi" },
  { key: "town", label: "Pilsēta", all: "Visas pilsētas", width: "max-w-44" },
  { key: "mode", label: "Darba veids", all: "Jebkurš darba veids" },
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
      {SELECTS.map(({ key, label: l, all, width }) => {
        const selected = filters[key];
        return (
          <Select
            key={key}
            aria-label={l}
            value={selected ?? ""}
            onChange={(e) => push({ [key]: e.target.value || null })}
            className={cn("h-8 w-auto text-[13px]", width)}
          >
            <option value="">{all}</option>
            {facetCounts[FACET_KEY[key]].map((o) => (
              <option key={o.value} value={o.value}>
                {labelOf[key](o.value)} ({o.n})
              </option>
            ))}
          </Select>
        );
      })}
      {(filters.cat || filters.sub || filters.sen || filters.town || filters.mode || filters.from) && (
        <Link href="/" scroll={false} className="px-1 text-xs font-medium text-accent hover:underline">Notīrīt</Link>
      )}
      <Link href={`/ads${dashToAdsQuery(filters)}`} className={buttonClass("outline", "sm", "ml-auto")}>
        Skatīt sludinājumus <ArrowRight />
      </Link>
    </div>
  );
}
