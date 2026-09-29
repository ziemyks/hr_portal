"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bookmark, Building2, CircleCheck, FileText, LayoutDashboard, List, Loader2, Palette, Repeat, Star, Wrench } from "lucide-react";
import { adsByIdsAction, paletteFacetsAction, searchAdsAction } from "@/app/actions";
import { useCommand } from "@/components/providers";
import { Dialog } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { companyHref } from "@/lib/links";
import { useStore } from "@/lib/storage";
import type { Facet } from "@/lib/types";

type Hit = { id: string; title: string; company: string; is_active: boolean | null; town: string | null };

const itemCls =
  "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-fg-muted aria-selected:bg-surface-2 aria-selected:text-fg [&_svg]:size-4 [&_svg]:shrink-0";
const groupCls =
  "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-fg-subtle";

export function CommandMenu() {
  const { open, setOpen } = useCommand();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { views, favourites } = useStore();
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [favHits, setFavHits] = useState<Hit[]>([]);
  const [facets, setFacets] = useState<{ companies: Facet[]; skills: Facet[] } | null>(null);
  const [pending, startTransition] = useTransition();
  const reqId = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  // Lazy-load facets and favourites the first time the palette opens.
  useEffect(() => {
    if (!open) return;
    if (!facets) paletteFacetsAction().then(setFacets).catch(() => setFacets({ companies: [], skills: [] }));
    if (favourites.length) adsByIdsAction(favourites.slice(0, 20)).then((r) => setFavHits(r)).catch(() => {});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced server search.
  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const id = ++reqId.current;
    const t = setTimeout(() => {
      startTransition(async () => {
        try {
          const r = await searchAdsAction(term);
          if (id === reqId.current) setHits(r);
        } catch {
          if (id === reqId.current) setHits([]);
        }
      });
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  const go = (href: string) => {
    setOpen(false);
    setSearch("");
    router.push(href);
  };

  const term = search.trim().toLocaleLowerCase("lv");
  const match = (s: string) => term.length >= 2 && s.toLocaleLowerCase("lv").includes(term);
  const companyHits = facets?.companies.filter((c) => match(c.value)).slice(0, 5) ?? [];
  const skillHits = facets?.skills.filter((s) => match(s.label ?? s.value)).slice(0, 5) ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }} title="Komandu palete">
      <Command shouldFilter={false} loop className="flex max-h-[min(70vh,560px)] flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Meklēt sludinājumu, uzņēmumu, prasmi vai komandu…"
            className="h-12 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
          {pending && <Loader2 className="size-4 animate-spin text-fg-subtle" aria-label="Meklē" />}
          <Kbd>Esc</Kbd>
        </div>
        <Command.List className="min-h-0 flex-1 overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-8 text-center text-sm text-fg-subtle">
            {pending ? "Meklē…" : "Nekas netika atrasts."}
          </Command.Empty>

          {hits.length > 0 && (
            <Command.Group heading="Sludinājumi" className={groupCls}>
              {hits.map((h) => (
                <Command.Item key={h.id} value={`ad-${h.id}`} onSelect={() => go(`/ads/${h.id}`)} className={itemCls}>
                  <FileText />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-fg">{h.title}</span>
                    <span className="text-fg-subtle"> · {h.company}</span>
                  </span>
                  {h.is_active ? <CircleCheck className="text-ok" aria-label="Aktīvs" /> : <span className="text-xs text-fg-subtle">neaktīvs</span>}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {companyHits.length > 0 && (
            <Command.Group heading="Uzņēmumi" className={groupCls}>
              {companyHits.map((c) => (
                <Command.Item key={c.value} value={`co-${c.value}`} onSelect={() => go(companyHref(c.value))} className={itemCls}>
                  <Building2 />
                  <span className="flex-1 truncate">{c.value}</span>
                  <span className="text-xs tabular-nums text-fg-subtle">{c.n}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {skillHits.length > 0 && (
            <Command.Group heading="Prasmes" className={groupCls}>
              {skillHits.map((s) => (
                <Command.Item key={s.value} value={`sk-${s.value}`} onSelect={() => go(`/ads?skill=${encodeURIComponent(s.value)}`)} className={itemCls}>
                  <Wrench />
                  <span className="flex-1 truncate">{s.label ?? s.value}</span>
                  <span className="text-xs tabular-nums text-fg-subtle">{s.n}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {term.length < 2 && favHits.length > 0 && (
            <Command.Group heading="Izlase" className={groupCls}>
              {favHits.slice(0, 6).map((h) => (
                <Command.Item key={h.id} value={`fav-${h.id}`} onSelect={() => go(`/ads/${h.id}`)} className={itemCls}>
                  <Star />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-fg">{h.title}</span>
                    <span className="text-fg-subtle"> · {h.company}</span>
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {views.filter((v) => term.length < 2 || match(v.name)).length > 0 && (
            <Command.Group heading="Saglabātie skati" className={groupCls}>
              {views
                .filter((v) => term.length < 2 || match(v.name))
                .slice(0, 8)
                .map((v) => (
                  <Command.Item key={v.id} value={`view-${v.id}`} onSelect={() => go(`/ads${v.query}`)} className={itemCls}>
                    <Bookmark />
                    <span className="flex-1 truncate">{v.name}</span>
                  </Command.Item>
                ))}
            </Command.Group>
          )}

          {term.length < 2 && (
            <>
              <Command.Group heading="Lapas" className={groupCls}>
                <Command.Item value="nav-dash" onSelect={() => go("/")} className={itemCls}>
                  <LayoutDashboard /> Tirgus pārskats
                </Command.Item>
                <Command.Item value="nav-ads" onSelect={() => go("/ads")} className={itemCls}>
                  <List /> Sludinājumi
                </Command.Item>
                <Command.Item value="nav-co" onSelect={() => go("/companies")} className={itemCls}>
                  <Building2 /> Uzņēmumi
                </Command.Item>
                <Command.Item value="nav-fav" onSelect={() => go("/favourites")} className={itemCls}>
                  <Star /> Izlase
                </Command.Item>
              </Command.Group>
              <Command.Group heading="Darbības" className={groupCls}>
                <Command.Item value="act-active" onSelect={() => go("/ads?status=active")} className={itemCls}>
                  <CircleCheck /> Rādīt tikai aktīvos
                </Command.Item>
                <Command.Item value="act-inactive" onSelect={() => go("/ads?status=inactive")} className={itemCls}>
                  <List /> Rādīt neaktīvos
                </Command.Item>
                <Command.Item value="act-rep" onSelect={() => go("/ads?rep=1&sort=open")} className={itemCls}>
                  <Repeat /> Grūti aizpildāmās vakances (atkārtotas)
                </Command.Item>
                <Command.Item
                  value="act-theme"
                  onSelect={() => { setTheme(resolvedTheme === "dark" ? "light" : "dark"); setOpen(false); }}
                  className={itemCls}
                >
                  <Palette /> Pārslēgt tēmu
                </Command.Item>
              </Command.Group>
            </>
          )}
        </Command.List>
        <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[11px] text-fg-subtle">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> pārvietoties</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> atvērt</span>
        </div>
      </Command>
    </Dialog>
  );
}
