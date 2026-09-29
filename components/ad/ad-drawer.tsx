"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
import { useAdNav } from "@/components/providers";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

/**
 * Slide-over preview for an intercepted /ads/[id] navigation. Closing = history back
 * (so the list underneath stays exactly as it was); ↑/↓ step through the visible list.
 */
export function AdDrawer({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const router = useRouter();
  const { ids } = useAdNav();
  const [open, setOpen] = useState(true);
  const idx = ids.indexOf(id);
  const prev = idx > 0 ? ids[idx - 1] : null;
  const next = idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null;

  useEffect(() => setOpen(true), [id]);

  const go = useCallback((target: string | null) => {
    if (target) router.replace(`/ads/${target}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        go(next);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        go(prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, next, prev]);

  const close = (o: boolean) => {
    if (o) return;
    setOpen(false);
    router.back();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={close}
      title={title}
      headerActions={
        <>
          {/* Native titles, not Radix tooltips: a focus-opened tooltip would swallow the first Esc. */}
          <button type="button" onClick={() => go(prev)} disabled={!prev} aria-label="Iepriekšējais sludinājums" title="Iepriekšējais (↑)" className={buttonClass("ghost", "icon")}>
            <ChevronUp />
          </button>
          <button type="button" onClick={() => go(next)} disabled={!next} aria-label="Nākamais sludinājums" title="Nākamais (↓)" className={buttonClass("ghost", "icon")}>
            <ChevronDown />
          </button>
          {idx >= 0 && <span className="px-1 text-xs tabular-nums text-fg-subtle">{idx + 1} / {ids.length}</span>}
          <span className="flex-1" />
          {/* Hard navigation so the full page renders instead of the intercepted drawer. */}
          <Link href={`/ads/${id}`} onClick={(e) => { e.preventDefault(); window.location.assign(`/ads/${id}`); }} className={buttonClass("ghost", "sm")}>
            <Maximize2 /> Pilna lapa
          </Link>
        </>
      }
    >
      {children}
    </Sheet>
  );
}
