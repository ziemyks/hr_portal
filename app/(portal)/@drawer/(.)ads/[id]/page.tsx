import { notFound } from "next/navigation";
import { Camera, Wrench } from "lucide-react";
import { AdDrawer } from "@/components/ad/ad-drawer";
import { AdHeader, AiSummary, Facts, Section, SimilarAds, Skills } from "@/components/ad/parts";
import { ScreenshotViewer } from "@/components/ad/screenshot-viewer";
import { getAd, getSimilar } from "@/lib/queries";

export default async function AdDrawerPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const ad = await getAd(id);
  if (!ad) notFound();
  const similar = await getSimilar(ad.id, 5);

  return (
    <AdDrawer id={ad.id} title={ad.title}>
      <div className="space-y-4 p-4 sm:p-5">
        <AdHeader ad={ad} compact />
        <div className="rounded-lg border border-border p-4">
          <Facts ad={ad} columns={2} />
        </div>
        <AiSummary ad={ad} compact />
        <Section title="Prasmes" icon={<Wrench />}>
          <Skills ad={ad} />
        </Section>
        <Section title="Ekrānuzņēmums" icon={<Camera />}>
          <ScreenshotViewer url={ad.screenshot_url} visitedAt={ad.visited_at} height={420} />
        </Section>
        <SimilarAds items={similar} />
      </div>
    </AdDrawer>
  );
}
