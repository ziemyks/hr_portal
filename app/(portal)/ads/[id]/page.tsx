import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, Wrench } from "lucide-react";
import { AdHeader, AdText, AiSummary, CompanyAds, Employer, Facts, Section, SimilarAds, Skills, TechInfo, Timeline } from "@/components/ad/parts";
import { ScreenshotViewer } from "@/components/ad/screenshot-viewer";
import { getAd, getRepostChain, getSameCompany, getSimilar } from "@/lib/queries";
import { sanitizeAbout } from "@/lib/sanitize";

type Props = { params: Promise<{ id: string }> };

const decodeId = (raw: string) => decodeURIComponent(raw);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ad = await getAd(decodeId((await params).id));
  return { title: ad ? `${ad.title} – ${ad.company}` : "Sludinājums nav atrasts" };
}

export default async function AdPage({ params }: Props) {
  const id = decodeId((await params).id);
  const ad = await getAd(id);
  if (!ad) notFound();

  const [similar, sameCompany, chain] = await Promise.all([getSimilar(ad.id), getSameCompany(ad), getRepostChain(ad)]);
  const aboutHtml = sanitizeAbout(ad.detail_data?.employer?.about);

  return (
    <div className="space-y-5">
      <Link href="/ads" className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> Sludinājumi
      </Link>

      <div className="rounded-lg border border-border bg-surface p-5">
        <AdHeader ad={ad} />
        <div className="mt-5 border-t border-border pt-5">
          <Facts ad={ad} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <AiSummary ad={ad} />
          <Section title="Prasmes un tehnoloģijas" icon={<Wrench />}>
            <Skills ad={ad} />
          </Section>
          <AdText ad={ad} />
          <Section title="Ekrānuzņēmums" icon={<Camera />}>
            <ScreenshotViewer url={ad.screenshot_url} visitedAt={ad.visited_at} height={720} />
          </Section>
        </div>
        <aside className="min-w-0 space-y-5">
          <SimilarAds items={similar} />
          <CompanyAds company={ad.company} items={sameCompany} />
          <Timeline ad={ad} chain={chain} />
          <Employer ad={ad} aboutHtml={aboutHtml} />
          <TechInfo ad={ad} />
        </aside>
      </div>
    </div>
  );
}
