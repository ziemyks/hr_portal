// Ad-list filter state <-> URL query string. Shared by server (queries) and client (toolbar).

export type Status = "active" | "inactive" | "all";
export type Sort = "new" | "salary" | "deadline" | "open" | "views";

export type AdFilters = {
  status: Status;
  q: string;
  cat: string[];
  company: string[];
  town: string[];
  mode: string[];
  sen: string[];
  skill: string[];
  lang: string[];
  smin: number | null;
  smax: number | null;
  rep: boolean;
  from: string | null;
  to: string | null;
  sort: Sort;
  page: number;
};

export const PAGE_SIZE = 50;

export const MULTI_KEYS = ["cat", "company", "town", "mode", "sen", "skill", "lang"] as const;
export type MultiKey = (typeof MULTI_KEYS)[number];

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function getAll(p: Params, k: string): string[] {
  if (p instanceof URLSearchParams) return p.getAll(k);
  const v = p[k];
  return v == null ? [] : Array.isArray(v) ? v : [v];
}
const get1 = (p: Params, k: string) => getAll(p, k)[0] ?? null;
const isDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const toNum = (v: string | null) => (v && /^\d+(\.\d+)?$/.test(v) ? Number(v) : null);

export function parseFilters(p: Params): AdFilters {
  const status = get1(p, "status");
  const sort = get1(p, "sort");
  const page = Number(get1(p, "page") ?? 1);
  const multi = (k: string) => getAll(p, k).flatMap((v) => v.split("|")).map((v) => v.trim()).filter(Boolean);
  return {
    status: status === "inactive" || status === "all" ? status : "active",
    q: (get1(p, "q") ?? "").slice(0, 100),
    cat: multi("cat"),
    company: multi("company"),
    town: multi("town"),
    mode: multi("mode"),
    sen: multi("sen"),
    skill: multi("skill"),
    lang: multi("lang"),
    smin: toNum(get1(p, "smin")),
    smax: toNum(get1(p, "smax")),
    rep: get1(p, "rep") === "1",
    from: isDate(get1(p, "from")),
    to: isDate(get1(p, "to")),
    sort: (["new", "salary", "deadline", "open", "views"] as const).includes(sort as Sort) ? (sort as Sort) : "new",
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  };
}

/** Canonical query string (defaults omitted). Multi values repeat the key. */
export function toQuery(f: Partial<AdFilters>): string {
  const u = new URLSearchParams();
  if (f.status && f.status !== "active") u.set("status", f.status);
  if (f.q) u.set("q", f.q);
  for (const k of MULTI_KEYS) for (const v of f[k] ?? []) u.append(k, v);
  if (f.smin != null) u.set("smin", String(f.smin));
  if (f.smax != null) u.set("smax", String(f.smax));
  if (f.rep) u.set("rep", "1");
  if (f.from) u.set("from", f.from);
  if (f.to) u.set("to", f.to);
  if (f.sort && f.sort !== "new") u.set("sort", f.sort);
  if (f.page && f.page > 1) u.set("page", String(f.page));
  const s = u.toString();
  return s ? `?${s}` : "";
}

export const EMPTY_FILTERS: AdFilters = parseFilters(new URLSearchParams());

export function activeFilterCount(f: AdFilters) {
  return (
    MULTI_KEYS.reduce((n, k) => n + f[k].length, 0) +
    (f.q ? 1 : 0) + (f.smin != null ? 1 : 0) + (f.smax != null ? 1 : 0) +
    (f.rep ? 1 : 0) + (f.from ? 1 : 0) + (f.to ? 1 : 0)
  );
}

// ---- Dashboard filters (single-valued) ----

export type DashFilters = {
  from: string | null;
  to: string | null;
  cat: string | null;
  sen: string | null;
  town: string | null;
  mode: string | null;
};

export function parseDashFilters(p: Params): DashFilters {
  return {
    from: isDate(get1(p, "from")),
    to: isDate(get1(p, "to")),
    cat: get1(p, "cat"),
    sen: get1(p, "sen"),
    town: get1(p, "town"),
    mode: get1(p, "mode"),
  };
}

/** Link from a dashboard slice into the ad list, carrying the dashboard filters. */
export function dashToAdsQuery(d: DashFilters, extra: Partial<AdFilters> = {}) {
  return toQuery({
    from: d.from, to: d.to,
    cat: d.cat ? [d.cat] : [], sen: d.sen ? [d.sen] : [],
    town: d.town ? [d.town] : [], mode: d.mode ? [d.mode] : [],
    ...extra,
  });
}
