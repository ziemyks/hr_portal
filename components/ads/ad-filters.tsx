"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUpDown, BookmarkPlus, CalendarClock, Check, Download, Euro, ListFilter, LoaderCircle, Repeat, Search, X } from "lucide-react";
import { MultiSelect, type Option } from "./multi-select";
import { FilterPill, MenuOption, TogglePill } from "./filter-pill";
import { Button, buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { activeFilterCount, MULTI_KEYS, RECENT_DAYS, toQuery, type AdFilters, type MultiKey, type Sort, type Status } from "@/lib/filters";
import { catLabel, label, langLabel, SENIORITY, WORK_MODE } from "@/lib/labels";
import { saveView } from "@/lib/storage";
import { date, num } from "@/lib/format";
import type { FacetCounts } from "@/lib/facets";
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

const MULTI: { key: MultiKey; label: string }[] = [
  { key: "cat", label: "Kategorija" },
  { key: "sub", label: "Apakškategorija" },
  { key: "company", label: "Uzņēmums" },
  { key: "town", label: "Pilsēta" },
  { key: "mode", label: "Darba veids" },
  { key: "sen", label: "Līmenis" },
  { key: "skill", label: "Prasmes" },
  { key: "lang", label: "Valodas" },
];

const SALARY_PRESETS = [1500, 2000, 3000, 4000];

export function AdFilters({
  filters,
  facetCounts,
  skillLabels,
  counts,
}: {
  filters: AdFilters;
  facetCounts: FacetCounts;
  skillLabels: Record<string, string>;
  counts: { active: number; inactive: number; all: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q);
  const first = useRef(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const push = (patch: Partial<AdFilters>) =>
    startTransition(() => router.push(`/ads${toQuery({ ...filters, ...patch, page: patch.page ?? 1 })}`, { scroll: false }));

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

  // "/" focuses the search (unless already typing somewhere).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Options = values still available under the other filters, most frequent first.
  const labelOf: Record<MultiKey, (v: string) => string> = {
    cat: catLabel,
    sub: catLabel,
    company: (v) => v,
    town: (v) => v,
    mode: (v) => label(WORK_MODE, v),
    sen: (v) => label(SENIORITY, v),
    skill: (v) => skillLabels[v] ?? v,
    lang: langLabel,
  };
  const opts = Object.fromEntries(
    MULTI_KEYS.map((k) => [k, facetCounts[k].map((o) => ({ value: o.value, label: labelOf[k](o.value), n: o.n }))]),
  ) as Record<MultiKey, Option[]>;

  const active = activeFilterCount(filters);
  const query = toQuery({ ...filters, page: 1 });

  return (
    <div className="relative rounded-xl border border-border bg-surface shadow-sm">
      {/* Top: search, status, sort, actions */}
      <div className="flex flex-wrap items-center gap-2 p-2">
        <div className="relative min-w-0 flex-1 basis-0 sm:basis-64">
          {pending ? (
            <LoaderCircle className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-accent" />
          ) : (
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          )}
          <Input
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              setQ("");
              e.currentTarget.blur();
            }}
            placeholder="Meklēt amatu…"
            aria-label="Meklēt sludinājumos"
            className="h-9 border-transparent bg-surface-2 pl-9 pr-9 hover:border-transparent focus-visible:bg-surface [&::-webkit-search-cancel-button]:hidden"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Notīrīt meklēšanu"
              className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-fg-subtle hover:bg-surface-3 hover:text-fg"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <Kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
          )}
        </div>

        <div role="group" aria-label="Statuss" className="inline-flex rounded-lg bg-surface-2 p-0.5 max-sm:order-last max-sm:w-full">
          {STATUS_TABS.map((t) => {
            const on = filters.status === t.key;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={on}
                onClick={() => push({ status: t.key })}
                className={cn(
                  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors max-sm:flex-1",
                  on ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
                )}
              >
                {t.label}
                <span className={cn("text-xs tabular-nums", on ? "text-fg-muted" : "text-fg-subtle")}>{num(counts[t.key])}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-0.5 sm:ml-auto sm:gap-1">
          <SortMenu value={filters.sort} onChange={(sort) => push({ sort })} />
          <span aria-hidden className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <SaveViewButton query={query} />
          <a href={`/api/export${query}`} className={buttonClass("ghost", "sm")} download title="Eksportēt CSV">
            <Download /> <span className="hidden md:inline">CSV</span>
          </a>
        </div>
      </div>

      {/* Bottom: filter pills */}
      <div className="flex flex-col gap-1 border-t border-border py-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1.5 sm:px-2">
        <span className="mr-1 hidden items-center gap-1.5 pl-1 text-xs font-medium text-fg-subtle sm:inline-flex">
          <ListFilter className="size-3.5" /> Filtri
        </span>
        {/* Phones: one swipeable row (set filters first); wider screens: wraps inline. */}
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-2 py-0.5 [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] sm:contents">
          {MULTI.map(({ key, label: l }) => (
            <MultiSelect key={key} label={l} options={opts[key]} selected={filters[key]} onChange={(v) => push({ [key]: v })} />
          ))}
          <PublishedFilter filters={filters} onApply={push} />
          <SalaryFilter filters={filters} onApply={push} />
          <TogglePill label="Atkārtotie" icon={<Repeat />} pressed={filters.rep} onToggle={() => push({ rep: !filters.rep })} />
          <span aria-hidden className="w-4 shrink-0 sm:hidden" />
        </div>

        <div className="flex min-h-7 items-center justify-between gap-3 px-3 text-xs sm:ml-auto sm:px-0 sm:pl-2">
          <span className={cn("tabular-nums text-fg-subtle transition-opacity", pending && "opacity-50")} aria-live="polite">
            {num(counts[filters.status])} sludinājumi
          </span>
          {active > 0 && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                startTransition(() => router.push(`/ads${toQuery({ status: filters.status, sort: filters.sort })}`, { scroll: false }));
              }}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-accent hover:bg-accent-soft"
            >
              <X className="size-3.5" /> Notīrīt ({active})
            </button>
          )}
        </div>
      </div>

      {/* Loading bar while the server re-renders the list */}
      <div aria-hidden className={cn("absolute inset-x-3 -bottom-px h-0.5 overflow-hidden rounded-full transition-opacity", pending ? "opacity-100" : "opacity-0")}>
        <div className="h-full w-1/3 animate-[loading-bar_1s_ease-in-out_infinite] rounded-full bg-accent" />
      </div>
    </div>
  );
}

function SortMenu({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={buttonClass("ghost", "sm")} aria-label={`Kārtot: ${SORT_LABELS[value]}`}>
        <ArrowUpDown />
        <span className="hidden text-fg-subtle lg:inline">Kārtot:</span>
        <span className="hidden text-fg sm:inline">{SORT_LABELS[value]}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52">
        <div role="menu" aria-label="Kārtot">
          {(Object.keys(SORT_LABELS) as Sort[]).map((k) => (
            <MenuOption key={k} selected={k === value} onSelect={() => (setOpen(false), onChange(k))}>
              {SORT_LABELS[k]}
            </MenuOption>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Short day.month for pill summaries. */
const dm = (v: string) => date(v).slice(0, 6);

/** "Publicēts": relative presets (stay current in saved views) or a custom first-published range. */
function PublishedFilter({ filters, onApply }: { filters: AdFilters; onApply: (p: Partial<AdFilters>) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ from: "", to: "" });
  useEffect(() => {
    if (open) setV({ from: filters.from ?? "", to: filters.to ?? "" });
  }, [open, filters.from, filters.to]);

  const range = filters.from && filters.to ? `${dm(filters.from)}–${dm(filters.to)}` : filters.from ? `no ${dm(filters.from)}` : filters.to ? `līdz ${dm(filters.to)}` : null;
  const summary = [filters.recent ? (filters.recent === 1 ? "24 h" : `${filters.recent} d.`) : null, range].filter(Boolean).join(", ") || null;
  const presets: { v: number | null; text: string }[] = [
    { v: null, text: "Jebkad" },
    ...RECENT_DAYS.map((d) => ({ v: d, text: d === 1 ? "Pēdējās 24 h" : `Pēdējās ${d} dienās` })),
  ];

  return (
    <FilterPill
      label="Publicēts"
      icon={<CalendarClock />}
      summary={summary}
      onClear={() => onApply({ recent: null, from: null, to: null })}
      open={open}
      onOpenChange={setOpen}
      contentClassName="w-64"
    >
      <div role="menu" aria-label="Publicēts">
        {presets.map((o) => (
          <MenuOption
            key={o.text}
            selected={o.v === filters.recent && !filters.from && !filters.to}
            onSelect={() => (setOpen(false), onApply({ recent: o.v, from: null, to: null }))}
          >
            {o.text}
          </MenuOption>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setOpen(false);
          onApply({ recent: null, from: v.from || null, to: v.to || null });
        }}
        className="mt-1 space-y-2 border-t border-border p-2"
      >
        <p className="text-xs font-medium text-fg-muted">Pielāgots periods</p>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={v.from} max={v.to || undefined} onChange={(e) => setV({ ...v, from: e.target.value })} aria-label="Publicēts no" className="h-8 px-2 text-xs" />
          <Input type="date" value={v.to} min={v.from || undefined} onChange={(e) => setV({ ...v, to: e.target.value })} aria-label="Publicēts līdz" className="h-8 px-2 text-xs" />
        </div>
        <Button type="submit" size="sm" variant="primary" className="w-full justify-center" disabled={!v.from && !v.to}>
          Lietot periodu
        </Button>
      </form>
    </FilterPill>
  );
}

function SalaryFilter({ filters, onApply }: { filters: AdFilters; onApply: (p: Partial<AdFilters>) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ smin: "", smax: "" });
  useEffect(() => {
    if (open) setV({ smin: filters.smin?.toString() ?? "", smax: filters.smax?.toString() ?? "" });
  }, [open, filters.smin, filters.smax]);
  const n = (s: string) => (s && /^\d+$/.test(s) ? Number(s) : null);

  const { smin, smax } = filters;
  const summary =
    smin != null && smax != null ? `€ ${num(smin)}–${num(smax)}` : smin != null ? `≥ € ${num(smin)}` : smax != null ? `≤ € ${num(smax)}` : null;

  return (
    <FilterPill
      label="Alga"
      icon={<Euro />}
      summary={summary}
      onClear={() => onApply({ smin: null, smax: null })}
      open={open}
      onOpenChange={setOpen}
      contentClassName="w-72 p-3"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setOpen(false);
          onApply({ smin: n(v.smin), smax: n(v.smax) });
        }}
        className="space-y-3"
      >
        <div>
          <p className="mb-1.5 text-xs font-medium text-fg-muted">Mēnešalga (vidējā, € bruto)</p>
          <div className="flex flex-wrap gap-1.5">
            {SALARY_PRESETS.map((p) => {
              const on = smin === p && smax == null;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => (setOpen(false), onApply({ smin: p, smax: null }))}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium tabular-nums transition-colors",
                    on ? "border-accent/30 bg-accent-soft text-accent" : "border-border text-fg-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  {on && <Check className="size-3" />}≥ {num(p)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input inputMode="numeric" placeholder="no" value={v.smin} onChange={(e) => setV({ ...v, smin: e.target.value })} aria-label="Alga no" className="h-8" />
          <span className="text-fg-subtle">–</span>
          <Input inputMode="numeric" placeholder="līdz" value={v.smax} onChange={(e) => setV({ ...v, smax: e.target.value })} aria-label="Alga līdz" className="h-8" />
        </div>
        <p className="text-[11px] text-fg-subtle">Stundas likmes sludinājumi netiek iekļauti.</p>
        <Button type="submit" size="sm" variant="primary" className="w-full justify-center">
          Lietot
        </Button>
      </form>
    </FilterPill>
  );
}

function SaveViewButton({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); setSaved(false); }}>
      <PopoverTrigger className={buttonClass("ghost", "sm")} title="Saglabāt skatu">
        <BookmarkPlus /> <span className="hidden md:inline">Saglabāt skatu</span>
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
