"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, Download, Repeat, Search, SlidersHorizontal, X } from "lucide-react";
import { MultiSelect, type Option } from "./multi-select";
import { Button, buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { activeFilterCount, toQuery, type AdFilters, type MultiKey, type Sort, type Status } from "@/lib/filters";
import { catLabel, langLabel, SENIORITY, SENIORITY_ORDER, WORK_MODE } from "@/lib/labels";
import { saveView } from "@/lib/storage";
import { date, num } from "@/lib/format";
import type { Facets } from "@/lib/types";
import { cn } from "@/lib/utils";

const SORT_LABELS: Record<Sort, string> = {
  new: "Jaunākie",
  salary: "Lielākā alga",
  deadline: "Tuvākais termiņš",
  open: "Ilgāk atvērtie",
  views: "Skatītākie",
};

const STATUS_TABS: { key: Status; label: string }[] = [
  { key: "active", label: "Aktīvie" },
  { key: "inactive", label: "Neaktīvie" },
  { key: "all", label: "Visi" },
];

export function AdFilters({
  filters,
  facets,
  counts,
}: {
  filters: AdFilters;
  facets: Facets;
  counts: { active: number; inactive: number; all: number };
}) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const first = useRef(true);

  const push = (patch: Partial<AdFilters>) =>
    router.push(`/ads${toQuery({ ...filters, ...patch, page: patch.page ?? 1 })}`, { scroll: false });

  // Debounced search → URL.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (q !== filters.q) push({ q });
    }, 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setQ(filters.q), [filters.q]);

  const opts = {
    cat: facets.categories.map((c) => ({ value: c.value, label: catLabel(c.value), n: c.n })),
    company: facets.companies.map((c) => ({ value: c.value, label: c.value, n: c.n })),
    town: facets.towns.map((c) => ({ value: c.value, label: c.value, n: c.n })),
    mode: Object.keys(WORK_MODE).filter((k) => k !== "UNKNOWN").map((k) => ({ value: k, label: WORK_MODE[k] })),
    sen: SENIORITY_ORDER.map((k) => ({ value: k, label: SENIORITY[k] })),
    skill: facets.skills.map((s) => ({ value: s.value, label: s.label ?? s.value, n: s.n })),
    lang: facets.languages.map((l) => ({ value: l.value, label: langLabel(l.value), n: l.n })),
  } satisfies Record<MultiKey, Option[]>;

  const MULTI: { key: MultiKey; label: string }[] = [
    { key: "cat", label: "Kategorija" },
    { key: "company", label: "Uzņēmums" },
    { key: "town", label: "Pilsēta" },
    { key: "mode", label: "Darba veids" },
    { key: "sen", label: "Līmenis" },
    { key: "skill", label: "Prasmes" },
    { key: "lang", label: "Valodas" },
  ];

  const labelFor = (key: MultiKey, v: string) => opts[key].find((o) => o.value === v)?.label ?? v;

  const chips: { id: string; text: string; clear: Partial<AdFilters> }[] = [];
  if (filters.q) chips.push({ id: "q", text: `„${filters.q}”`, clear: { q: "" } });
  for (const { key, label: l } of MULTI)
    for (const v of filters[key])
      chips.push({ id: `${key}:${v}`, text: `${l}: ${labelFor(key, v)}`, clear: { [key]: filters[key].filter((x) => x !== v) } });
  if (filters.smin != null) chips.push({ id: "smin", text: `Alga ≥ € ${num(filters.smin)}`, clear: { smin: null } });
  if (filters.smax != null) chips.push({ id: "smax", text: `Alga ≤ € ${num(filters.smax)}`, clear: { smax: null } });
  if (filters.rep) chips.push({ id: "rep", text: "Tikai atkārtotie", clear: { rep: false } });
  if (filters.from) chips.push({ id: "from", text: `Publicēts no ${date(filters.from)}`, clear: { from: null } });
  if (filters.to) chips.push({ id: "to", text: `Publicēts līdz ${date(filters.to)}`, clear: { to: null } });

  const extraCount = (filters.smin != null ? 1 : 0) + (filters.smax != null ? 1 : 0) + (filters.from ? 1 : 0) + (filters.to ? 1 : 0);
  const query = toQuery({ ...filters, page: 1 });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Statuss" className="inline-flex rounded-lg bg-surface-2 p-0.5">
          {STATUS_TABS.map((t) => {
            const on = filters.status === t.key;
            return (
              <Link
                key={t.key}
                href={`/ads${toQuery({ ...filters, status: t.key, page: 1 })}`}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors",
                  on ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
                )}
              >
                {t.label}
                <span className="text-xs tabular-nums text-fg-subtle">{num(counts[t.key])}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="sort">Kārtot</label>
          <Select id="sort" value={filters.sort} onChange={(e) => push({ sort: e.target.value as Sort })} className="h-8 w-auto text-[13px]">
            {Object.entries(SORT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <SaveViewButton query={query} />
          <a href={`/api/export${query}`} className={buttonClass("outline", "sm")} download>
            <Download /> CSV
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Amats, uzņēmums, apraksts…"
            aria-label="Meklēt sludinājumos"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
        {MULTI.map(({ key, label: l }) => (
          <MultiSelect key={key} label={l} options={opts[key]} selected={filters[key]} onChange={(v) => push({ [key]: v })} />
        ))}
        <button
          type="button"
          aria-pressed={filters.rep}
          onClick={() => push({ rep: !filters.rep })}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium transition-colors",
            filters.rep ? "border-accent/40 bg-accent-soft text-accent" : "border-dashed border-border-strong text-fg-muted hover:border-solid hover:text-fg",
          )}
        >
          <Repeat className="size-3.5" /> Atkārtotie
        </button>
        <MoreFilters filters={filters} onApply={push} count={extraCount} />
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => push(c.clear)}
              className="inline-flex h-6 items-center gap-1 rounded-md bg-surface-2 pl-2 pr-1 text-xs text-fg-muted hover:bg-surface-3 hover:text-fg"
              aria-label={`Noņemt filtru ${c.text}`}
            >
              {c.text}
              <X className="size-3" />
            </button>
          ))}
          {activeFilterCount(filters) > 1 && (
            <Link href={`/ads${toQuery({ status: filters.status, sort: filters.sort })}`} scroll={false} className="px-1 text-xs font-medium text-accent hover:underline">
              Notīrīt visu
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function MoreFilters({ filters, onApply, count }: { filters: AdFilters; onApply: (p: Partial<AdFilters>) => void; count: number }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ smin: "", smax: "", from: "", to: "" });
  useEffect(() => {
    if (open)
      setV({
        smin: filters.smin?.toString() ?? "",
        smax: filters.smax?.toString() ?? "",
        from: filters.from ?? "",
        to: filters.to ?? "",
      });
  }, [open, filters]);
  const n = (s: string) => (s && /^\d+$/.test(s) ? Number(s) : null);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium",
          count ? "border-accent/40 bg-accent-soft text-accent" : "border-dashed border-border-strong text-fg-muted hover:border-solid hover:text-fg",
        )}
      >
        <SlidersHorizontal className="size-3.5" /> Vairāk
        {count > 0 && <span className="rounded bg-accent px-1 text-[11px] leading-4 text-accent-fg">{count}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onApply({ smin: n(v.smin), smax: n(v.smax), from: v.from || null, to: v.to || null });
            setOpen(false);
          }}
          className="space-y-3"
        >
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-fg-muted">Mēnešalga (vidējā, € bruto)</legend>
            <div className="flex items-center gap-2">
              <Input inputMode="numeric" placeholder="no" value={v.smin} onChange={(e) => setV({ ...v, smin: e.target.value })} aria-label="Alga no" className="h-8" />
              <span className="text-fg-subtle">–</span>
              <Input inputMode="numeric" placeholder="līdz" value={v.smax} onChange={(e) => setV({ ...v, smax: e.target.value })} aria-label="Alga līdz" className="h-8" />
            </div>
            <p className="mt-1 text-[11px] text-fg-subtle">Stundas likmes sludinājumi netiek iekļauti.</p>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-fg-muted">Pirmo reizi publicēts</legend>
            <div className="flex items-center gap-2">
              <Input type="date" value={v.from} onChange={(e) => setV({ ...v, from: e.target.value })} aria-label="Publicēts no" className="h-8" />
              <span className="text-fg-subtle">–</span>
              <Input type="date" value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} aria-label="Publicēts līdz" className="h-8" />
            </div>
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setV({ smin: "", smax: "", from: "", to: "" })}>
              Notīrīt
            </Button>
            <Button type="submit" size="sm" variant="primary">Lietot</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function SaveViewButton({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); setSaved(false); }}>
      <PopoverTrigger className={buttonClass("outline", "sm")}>
        <BookmarkPlus /> Saglabāt skatu
      </PopoverTrigger>
      <PopoverContent align="end" className="p-3">
        {saved ? (
          <p className="text-sm text-fg-muted">Skats saglabāts sānjoslā un ⌘K paletē.</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveView(name, query);
              setName("");
              setSaved(true);
            }}
            className="space-y-2"
          >
            <label htmlFor="view-name" className="block text-xs font-medium text-fg-muted">Skata nosaukums</label>
            <Input id="view-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="piem., Senior datu analītiķi Rīgā" className="h-8" />
            <p className="text-[11px] text-fg-subtle">Saglabāts šajā pārlūkā. Pārnest: Izlase → Eksportēt.</p>
            <div className="flex justify-end">
              <Button type="submit" size="sm" variant="primary">Saglabāt</Button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
