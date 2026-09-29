"use server";

import { getAdsByIds, getFacets, searchAds } from "@/lib/queries";

// Server actions go through the same middleware password gate as pages.

export async function searchAdsAction(term: string) {
  return searchAds(String(term ?? "").slice(0, 100));
}

export async function adsByIdsAction(ids: string[]) {
  const clean = (Array.isArray(ids) ? ids : []).filter((x) => typeof x === "string" && /^[a-z]+:\d+$/.test(x));
  return getAdsByIds(clean);
}

/** Companies and skills for the command palette (top entries only). */
export async function paletteFacetsAction() {
  const f = await getFacets();
  return {
    companies: f.companies.slice(0, 400),
    skills: f.skills.slice(0, 400),
  };
}
