"use client";

import * as D from "@radix-ui/react-dialog";
import { ExternalLink, ImageOff, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Full-page cv.lv screenshot: tall JPEG (~2000–7700 px, ~450 KB), so it is only
 * ever loaded lazily here, never in lists.
 */
export function ScreenshotViewer({ url, visitedAt, height = 560 }: { url: string | null; visitedAt: string | null; height?: number }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-2/50 py-12 text-center">
        <ImageOff className="mb-2 size-6 text-fg-subtle" />
        <p className="text-sm font-medium">Ekrānuzņēmums nav pieejams</p>
        <p className="mt-0.5 text-xs text-fg-subtle">Uzņemšana neizdevās vai sludinājums vēl nav apmeklēts.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-subtle">Lapa, kāda tā bija {dateTime(visitedAt)} (nav tiešraide)</p>
        <div className="flex gap-1">
          <button type="button" onClick={() => setOpen(true)} className={buttonClass("outline", "sm")}>
            <Maximize2 /> Pilnekrāns
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")}>
            <ExternalLink /> Oriģināls
          </a>
        </div>
      </div>
      <div
        className="overflow-y-auto rounded-lg border border-border bg-surface-2 p-1.5"
        style={{ maxHeight: height }}
        tabIndex={0}
        aria-label="Ekrānuzņēmums (ritināms)"
      >
        <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-zoom-in" aria-label="Atvērt ekrānuzņēmumu pilnekrānā">
          {/* eslint-disable-next-line @next/next/no-img-element -- tall screenshot from public bucket; next/image adds nothing here */}
          <img
            src={url}
            alt="Sludinājuma lapas ekrānuzņēmums no cv.lv"
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="block h-auto w-full rounded bg-white"
          />
        </button>
      </div>

      <D.Root open={open} onOpenChange={setOpen}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-[80] animate-fade-in bg-black/85" />
          <D.Content aria-describedby={undefined} className="fixed inset-0 z-[80] flex flex-col outline-none">
            <D.Title className="sr-only">Ekrānuzņēmums</D.Title>
            <div className="flex h-12 shrink-0 items-center justify-end gap-1 px-3 text-white">
              <button
                type="button"
                onClick={() => setZoom((z) => !z)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] hover:bg-white/10"
              >
                {zoom ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
                {zoom ? "Ietilpināt" : "100 %"}
              </button>
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] hover:bg-white/10">
                <ExternalLink className="size-4" /> Oriģināls
              </a>
              <D.Close className="inline-flex size-8 items-center justify-center rounded-md hover:bg-white/10" aria-label="Aizvērt">
                <X className="size-4" />
              </D.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-4 pb-6" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Sludinājuma lapas ekrānuzņēmums no cv.lv"
                onClick={() => setZoom((z) => !z)}
                className={cn(
                  "mx-auto block h-auto rounded bg-white shadow-2xl",
                  zoom ? "max-w-none cursor-zoom-out" : "w-full max-w-5xl cursor-zoom-in",
                )}
              />
            </div>
          </D.Content>
        </D.Portal>
      </D.Root>
    </div>
  );
}
