"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bookmark, Download, Star, Trash2, Upload } from "lucide-react";
import { adsByIdsAction } from "@/app/actions";
import { AdsTable } from "@/components/ads/ads-table";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPTY_FILTERS } from "@/lib/filters";
import { date } from "@/lib/format";
import { deleteView, exportJson, importJson, useStore } from "@/lib/storage";
import type { ListingRow } from "@/lib/types";

export function FavouritesView() {
  const { favourites, views } = useStore();
  const [rows, setRows] = useState<ListingRow[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const key = favourites.join(",");

  useEffect(() => {
    if (!favourites.length) {
      setRows([]);
      return;
    }
    let live = true;
    adsByIdsAction(favourites)
      .then((r) => {
        if (!live) return;
        const order = new Map(favourites.map((id, i) => [id, i]));
        setRows([...r].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
      })
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const doExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `darba-tirgus-izlase-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = async (file: File) => {
    try {
      const r = importJson(await file.text());
      setMsg(`Importēts: ${r.favourites} sludinājumi, ${r.views} skati.`);
    } catch {
      setMsg("Neizdevās nolasīt failu – vai tas ir šī portāla eksports?");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={doExport}><Download /> Eksportēt JSON</Button>
        <Button size="sm" onClick={() => fileRef.current?.click()}><Upload /> Importēt</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = "";
          }}
        />
        {msg && <p role="status" className="text-xs text-fg-muted">{msg}</p>}
      </div>

      <Card>
        <CardHeader title="Saglabātie skati" description="Filtru kombinācijas no sludinājumu saraksta" />
        <div className="p-4">
          {views.length === 0 ? (
            <p className="text-sm text-fg-subtle">Vēl nav saglabātu skatu. Sludinājumu sarakstā izvēlieties filtrus un spiediet „Saglabāt skatu”.</p>
          ) : (
            <ul className="divide-y divide-border">
              {views.map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-2">
                  <Bookmark className="size-4 shrink-0 text-fg-subtle" />
                  <Link href={`/ads${v.query}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium hover:text-accent hover:underline">{v.name}</span>
                    <span className="block truncate font-mono text-[11px] text-fg-subtle">{decodeURIComponent(v.query) || "(bez filtriem)"}</span>
                  </Link>
                  <span className="hidden text-xs text-fg-subtle sm:block">{date(v.createdAt)}</span>
                  <button
                    type="button"
                    onClick={() => deleteView(v.id)}
                    aria-label={`Dzēst skatu ${v.name}`}
                    className="inline-flex size-8 items-center justify-center rounded-md text-fg-subtle hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <div>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Star className="size-4 text-fg-subtle" /> Atzīmētie sludinājumi
          <span className="font-normal text-fg-subtle">{favourites.length}</span>
        </h2>
        {rows == null ? (
          <Skeleton className="h-48" />
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface py-12 text-center">
            <Star className="mx-auto mb-2 size-6 text-fg-subtle" />
            <p className="text-sm font-medium">Izlase ir tukša</p>
            <p className="mt-1 text-xs text-fg-subtle">Spiediet ☆ pie sludinājuma, lai to saglabātu šeit.</p>
          </div>
        ) : (
          <AdsTable rows={rows} filters={{ ...EMPTY_FILTERS, status: "all" }} sortable={false} />
        )}
      </div>
    </div>
  );
}
