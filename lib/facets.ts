// Faceted counts: for every multi-value filter, count the options among rows that match
// all *other* filters (its own selection is ignored, so several values can still be picked;
// skills and languages are all-of filters and also respect their own selection).
import { MULTI_KEYS, type AdFilters, type MultiKey } from "./filters";

export type FacetRow = {
  id: string;
  category: string;
  categories_all: string[];
  company: string;
  town: string | null;
  work_mode: string | null;
  seniority: string | null;
  skills_norm: string[];
  languages_norm: string[];
};

export const FACET_COLUMNS = "id,category,categories_all,company,town,work_mode,seniority,skills_norm,languages_norm";

export type FacetCounts = Record<MultiKey, { value: string; n: number }[]>;

/** Values a row contributes to each facet. */
const valuesOf: Record<MultiKey, (r: FacetRow) => (string | null)[]> = {
  cat: (r) => [r.category],
  sub: (r) => r.categories_all ?? [],
  company: (r) => [r.company],
  town: (r) => [r.town],
  mode: (r) => [r.work_mode],
  sen: (r) => [r.seniority ?? "unknown"],
  skill: (r) => r.skills_norm ?? [],
  lang: (r) => r.languages_norm ?? [],
};

/** Same semantics as applyFilters() in queries.ts: skills/languages must all match, others any-of. */
function matches(r: FacetRow, key: MultiKey, selected: string[]) {
  if (!selected.length) return true;
  const vals = valuesOf[key](r);
  return key === "skill" || key === "lang" ? selected.every((s) => vals.includes(s)) : selected.some((s) => vals.includes(s));
}

export function computeFacets(rows: FacetRow[], f: AdFilters): FacetCounts {
  const out = {} as FacetCounts;
  for (const key of MULTI_KEYS) {
    // Any-of filters ignore their own selection (so more values can be added); all-of
    // filters (skills, languages) keep it, so only combinations that still have ads are offered.
    const andKey = key === "skill" || key === "lang";
    const others = MULTI_KEYS.filter((k) => (andKey || k !== key) && f[k].length);
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (!others.every((k) => matches(r, k, f[k]))) continue;
      for (const v of new Set(valuesOf[key](r))) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    // Keep selected values visible (with 0) so they can still be unticked.
    for (const s of f[key]) if (!counts.has(s)) counts.set(s, 0);
    out[key] = [...counts]
      .map(([value, n]) => ({ value, n }))
      .sort((a, b) => b.n - a.n || a.value.localeCompare(b.value, "lv"));
  }
  return out;
}
