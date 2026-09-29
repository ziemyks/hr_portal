import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { AdFilters } from "@/components/ads/ad-filters";
import { AdsTable } from "@/components/ads/ads-table";
import { Pagination } from "@/components/ads/pagination";
import { PageHeader } from "@/components/page-header";
import { parseFilters } from "@/lib/filters";
import { getFacets, listAds } from "@/lib/queries";

export const metadata: Metadata = { title: "Sludinājumi" };

export default async function AdsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams);
  const [{ rows, count, counts }, facets] = await Promise.all([listAds(filters), getFacets()]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sludinājumi"
        description="cv.lv IT un banku/apdrošināšanas vakances. „Aktīvs” = pieteikšanās termiņš nav beidzies (aptuvens statuss)."
      />
      <AdFilters filters={filters} facets={facets} counts={counts} />
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface py-16 text-center">
          <SearchX className="mb-3 size-8 text-fg-subtle" />
          <p className="font-medium">Neviens sludinājums neatbilst filtriem</p>
          <p className="mt-1 text-sm text-fg-subtle">Mēģiniet noņemt kādu filtru vai pārslēgties uz „Visi”.</p>
        </div>
      ) : (
        <>
          <AdsTable rows={rows} filters={filters} />
          <Pagination filters={filters} count={count} />
        </>
      )}
    </div>
  );
}
