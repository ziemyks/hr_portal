import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { FavouritesView } from "@/components/favourites-view";

export const metadata: Metadata = { title: "Izlase" };

export default function FavouritesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Izlase"
        description="Atzīmētie sludinājumi un saglabātie filtru skati. Tie glabājas šajā pārlūkā – lai pārnestu uz citu ierīci, izmantojiet eksportu/importu."
      />
      <FavouritesView />
    </div>
  );
}
