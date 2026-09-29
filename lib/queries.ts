import "server-only";
import { db } from "./supabase.server";
import { MAIN_CATEGORIES, PAGE_SIZE, type AdFilters, type DashFilters, type Status } from "./filters";
import {
  LIST_COLUMNS,
  type CompanyProfile,
  type CompanyRow,
  type Dashboard,
  type Facets,
  type Listing,
  type ListingRow,
  type SimilarListing,
} from "./types";

const VIEW = "listings_portal";

/** Strip characters that have meaning in PostgREST filter syntax. */
const cleanTerm = (s: string) => s.replace(/[,()*%\\:"{}]/g, " ").replace(/\s+/g, " ").trim();

// Minimal structural type for the chained supabase-js filter builder.
type Filterable = {
  eq(c: string, v: unknown): Filterable;
  not(c: string, op: string, v: unknown): Filterable;
  in(c: string, v: unknown[]): Filterable;
  contains(c: string, v: unknown[]): Filterable;
  overlaps(c: string, v: unknown[]): Filterable;
  gte(c: string, v: unknown): Filterable;
  lte(c: string, v: unknown): Filterable;
  or(f: string): Filterable;
};

function applyFilters<Q>(query: Q, f: AdFilters, status: Status = f.status): Q {
  let q = query as unknown as Filterable;
  if (status === "active") q = q.eq("is_active", true);
  if (status === "inactive") q = q.not("is_active", "is", true);

  const term = cleanTerm(f.q);
  if (term) {
    const ors = [`title.ilike."*${term}*"`, `summary.ilike."*${term}*"`, `company.ilike."*${term}*"`];
    if (/^\d{5,9}$/.test(term)) ors.push(`id.eq."cvlv:${term}"`);
    q = q.or(ors.join(","));
  }
  if (f.cat.length) q = q.in("category", f.cat);
  if (f.sub.length) q = q.overlaps("categories_all", f.sub);
  if (f.company.length) q = q.in("company", f.company);
  if (f.town.length) q = q.in("town", f.town);
  if (f.mode.length) q = q.in("work_mode", f.mode);
  if (f.sen.length) q = q.in("seniority", f.sen);
  if (f.skill.length) q = q.contains("skills_norm", f.skill.map(cleanTerm));
  if (f.lang.length) q = q.contains("languages_norm", f.lang.map(cleanTerm));
  if (f.smin != null) q = q.gte("salary_mid_monthly", f.smin);
  if (f.smax != null) q = q.lte("salary_mid_monthly", f.smax);
  if (f.rep) q = q.eq("is_repeating", true);
  if (f.from) q = q.gte("first_published_at", f.from);
  if (f.to) q = q.lte("first_published_at", f.to);
  return q as unknown as Q;
}

const SORTS: Record<AdFilters["sort"], [string, boolean][]> = {
  new: [["first_published_at", false], ["id", false]],
  salary: [["salary_mid_monthly", false], ["first_published_at", false]],
  deadline: [["deadline", true], ["first_published_at", false]],
  open: [["days_open", false], ["id", false]],
  views: [["views", false], ["first_published_at", false]],
};

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "unknown error"}`);
}

export async function listAds(f: AdFilters) {
  let query = db().from(VIEW).select(LIST_COLUMNS, { count: "exact" });
  query = applyFilters(query, f);
  for (const [col, asc] of SORTS[f.sort]) query = query.order(col, { ascending: asc, nullsFirst: false });
  const start = (f.page - 1) * PAGE_SIZE;
  query = query.range(start, start + PAGE_SIZE - 1);

  const countFor = (s: Status) =>
    applyFilters(db().from(VIEW).select("id", { count: "exact", head: true }), f, s);

  const [list, active, inactive] = await Promise.all([query, countFor("active"), countFor("inactive")]);
  if (list.error) fail("listAds", list.error);
  const a = active.count ?? 0;
  const i = inactive.count ?? 0;
  return {
    rows: (list.data ?? []) as unknown as ListingRow[],
    count: list.count ?? 0,
    counts: { active: a, inactive: i, all: a + i },
  };
}

/** All matching rows (for CSV), paged past PostgREST's 1000-row cap. */
export async function exportAds(f: AdFilters) {
  const out: ListingRow[] = [];
  for (let start = 0; start < 20000; start += 1000) {
    let query = db().from(VIEW).select(LIST_COLUMNS);
    query = applyFilters(query, f);
    for (const [col, asc] of SORTS[f.sort]) query = query.order(col, { ascending: asc, nullsFirst: false });
    const { data, error } = await query.range(start, start + 999);
    if (error) fail("exportAds", error);
    out.push(...((data ?? []) as unknown as ListingRow[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function getAd(id: string) {
  const { data, error } = await db().from(VIEW).select("*").eq("id", id).maybeSingle();
  if (error) fail("getAd", error);
  return data as Listing | null;
}

export async function getAdsByIds(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await db().from(VIEW).select(LIST_COLUMNS).in("id", ids.slice(0, 500));
  if (error) fail("getAdsByIds", error);
  return (data ?? []) as unknown as ListingRow[];
}

export async function getSimilar(id: string, limit = 8) {
  const { data, error } = await db().rpc("similar_listings", { p_id: id, p_limit: limit });
  if (error) fail("getSimilar", error);
  return (data ?? []) as SimilarListing[];
}

export async function getSameCompany(ad: Pick<Listing, "id" | "company">, limit = 8) {
  const { data, error } = await db()
    .from(VIEW)
    .select(LIST_COLUMNS)
    .eq("company", ad.company)
    .neq("id", ad.id)
    .order("is_active", { ascending: false })
    .order("first_published_at", { ascending: false })
    .limit(limit);
  if (error) fail("getSameCompany", error);
  return (data ?? []) as unknown as ListingRow[];
}

/** Every posting in the ad's repost chain (oldest first), including the ad itself. */
export async function getRepostChain(ad: Pick<Listing, "id" | "repost_root" | "times_posted">) {
  if ((ad.times_posted ?? 1) <= 1 && !ad.repost_root) return [];
  const root = ad.repost_root ?? ad.id;
  const { data, error } = await db()
    .from(VIEW)
    .select("id,title,first_published_at,deadline,is_active")
    .or(`id.eq."${root}",repost_root.eq."${root}"`)
    .order("first_published_at", { ascending: true });
  if (error) fail("getRepostChain", error);
  return (data ?? []) as Pick<Listing, "id" | "title" | "first_published_at" | "deadline" | "is_active">[];
}

export async function getFacets() {
  const { data, error } = await db().rpc("portal_facets");
  if (error) fail("getFacets", error);
  const f = data as Facets;
  // Older SQL (before 001 was re-run) has no main_categories: derive them so the filter is never empty.
  if (!f.main_categories?.length) f.main_categories = f.categories.filter((c) => MAIN_CATEGORIES.includes(c.value));
  return f;
}

export async function getDashboard(d: DashFilters) {
  const { data, error } = await db().rpc("dashboard_stats", {
    p_from: d.from, p_to: d.to, p_category: d.cat, p_seniority: d.sen, p_town: d.town, p_work_mode: d.mode, p_subcategory: d.sub,
  });
  if (error) fail("getDashboard", error);
  return data as Dashboard;
}

export async function searchAds(term: string, limit = 8) {
  const t = cleanTerm(term);
  if (t.length < 2) return [];
  const ors = [`title.ilike."*${t}*"`, `company.ilike."*${t}*"`, `summary.ilike."*${t}*"`];
  if (/^\d{5,9}$/.test(t)) ors.push(`id.eq."cvlv:${t}"`);
  const { data, error } = await db()
    .from(VIEW)
    .select("id,title,company,is_active,town")
    .or(ors.join(","))
    .order("is_active", { ascending: false })
    .order("first_published_at", { ascending: false })
    .limit(limit);
  if (error) fail("searchAds", error);
  return (data ?? []) as Pick<Listing, "id" | "title" | "company" | "is_active" | "town">[];
}

export async function getCompanyList() {
  const { data, error } = await db().rpc("company_list");
  if (error) fail("getCompanyList", error);
  return (data ?? []) as CompanyRow[];
}

export async function getCompanyProfile(company: string) {
  const { data, error } = await db().rpc("company_profile", { p_company: company });
  if (error) fail("getCompanyProfile", error);
  return data as CompanyProfile | null;
}
