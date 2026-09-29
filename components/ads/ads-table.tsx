"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Check, Columns3, Rows3, Rows4 } from "lucide-react";
import { FavouriteStar } from "./favourite-star";
import { RepeatBadge } from "./repeat-badge";
import { Salary } from "./salary";
import { StatusPill } from "./status-pill";
import { useAdNav } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { toQuery, type AdFilters, type Sort } from "@/lib/filters";
import { date, num, relDays } from "@/lib/format";
import { label, SENIORITY, WORK_MODE } from "@/lib/labels";
import type { ListingRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type Density = "comfortable" | "compact";

const SORT_BY_COLUMN: Record<string, { sort: Sort; asc: boolean }> = {
  salary: { sort: "salary", asc: false },
  published: { sort: "new", asc: false },
  deadline: { sort: "deadline", asc: true },
  days_open: { sort: "open", asc: false },
  views: { sort: "views", asc: false },
};

const COLUMN_LABELS: Record<string, string> = {
  status: "Statuss",
  salary: "Alga",
  town: "Pilsēta",
  work_mode: "Darba veids",
  seniority: "Līmenis",
  skills: "Prasmes",
  published: "Publicēts",
  deadline: "Termiņš",
  days_open: "Atvērts",
  views: "Skatījumi",
};

const DEFAULT_VISIBILITY: VisibilityState = { views: false, work_mode: true, days_open: true };
const PREFS_KEY = "blt.table.v1";

function SkillChips({ skills, max = 3 }: { skills: string[] | null; max?: number }) {
  if (!skills?.length) return <span className="text-fg-subtle">—</span>;
  const shown = skills.slice(0, max);
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((s) => (
        <Badge key={s} tone="outline" className="max-w-[140px] truncate font-normal">{s}</Badge>
      ))}
      {skills.length > max && (
        <Tooltip content={skills.slice(max).join(", ")}>
          <span tabIndex={0} className="text-xs text-fg-subtle">+{skills.length - max}</span>
        </Tooltip>
      )}
    </span>
  );
}

export function AdsTable({ rows, filters, sortable = true }: { rows: ListingRow[]; filters: AdFilters; sortable?: boolean }) {
  const router = useRouter();
  const { setIds } = useAdNav();
  const [density, setDensity] = useState<Density>("comfortable");
  const [visibility, setVisibility] = useState<VisibilityState>(DEFAULT_VISIBILITY);

  useEffect(() => setIds(rows.map((r) => r.id)), [rows, setIds]);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null");
      if (p?.density) setDensity(p.density);
      if (p?.visibility) setVisibility({ ...DEFAULT_VISIBILITY, ...p.visibility });
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ density, visibility }));
    } catch {}
  }, [density, visibility]);

  const columns = useMemo<ColumnDef<ListingRow>[]>(
    () => [
      {
        id: "fav",
        header: () => <span className="sr-only">Izlase</span>,
        cell: ({ row }) => <FavouriteStar id={row.original.id} className="-ml-1" />,
        enableHiding: false,
        size: 40,
      },
      {
        id: "title",
        header: "Amats",
        enableHiding: false,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="min-w-[240px] max-w-[440px]">
              <div className="flex items-start gap-1.5">
                <Link
                  href={`/ads/${r.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-fg hover:text-accent hover:underline"
                >
                  {r.title}
                </Link>
                <RepeatBadge {...r} compact />
              </div>
              <div className="truncate text-xs text-fg-muted">{r.company}</div>
              {density === "comfortable" && r.summary && (
                <p className="mt-1 line-clamp-2 text-xs text-fg-subtle">{r.summary}</p>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Statuss",
        cell: ({ row }) => <StatusPill isActive={row.original.is_active} closingSoon={row.original.closing_soon} deadline={row.original.deadline} />,
      },
      {
        id: "salary",
        header: "Alga",
        cell: ({ row }) => <Salary from={row.original.salary_from} to={row.original.salary_to} period={row.original.salary_period} className="font-medium" />,
      },
      { id: "town", header: "Pilsēta", cell: ({ row }) => row.original.town ?? <span className="text-fg-subtle">—</span> },
      { id: "work_mode", header: "Darba veids", cell: ({ row }) => label(WORK_MODE, row.original.work_mode) },
      { id: "seniority", header: "Līmenis", cell: ({ row }) => label(SENIORITY, row.original.seniority) },
      { id: "skills", header: "Prasmes", cell: ({ row }) => <SkillChips skills={row.original.skills} /> },
      {
        id: "published",
        header: "Publicēts",
        cell: ({ row }) => (
          <Tooltip content={date(row.original.first_published_at)}>
            <span tabIndex={0} className="whitespace-nowrap">{relDays(row.original.first_published_at)}</span>
          </Tooltip>
        ),
      },
      {
        id: "deadline",
        header: "Termiņš",
        cell: ({ row }) => (
          <Tooltip content={relDays(row.original.deadline)}>
            <span tabIndex={0} className="whitespace-nowrap tabular-nums">{date(row.original.deadline)}</span>
          </Tooltip>
        ),
      },
      {
        id: "days_open",
        header: "Atvērts",
        cell: ({ row }) => <span className="tabular-nums">{row.original.days_open != null ? `${row.original.days_open} d.` : "—"}</span>,
      },
      { id: "views", header: "Skatījumi", cell: ({ row }) => <span className="tabular-nums">{num(row.original.views)}</span> },
    ],
    [density],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnVisibility: visibility },
    onColumnVisibilityChange: setVisibility,
    getRowId: (r) => r.id,
  });

  const sortableTable = sortable;
  const sortHref = (colId: string) => `/ads${toQuery({ ...filters, sort: SORT_BY_COLUMN[colId].sort, page: 1 })}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
          className="hidden h-8 items-center gap-1.5 rounded-md px-2 text-xs text-fg-muted hover:bg-surface-2 hover:text-fg md:inline-flex"
          aria-label={density === "compact" ? "Ērts blīvums" : "Kompakts blīvums"}
        >
          {density === "compact" ? <Rows3 className="size-4" /> : <Rows4 className="size-4" />}
          {density === "compact" ? "Ērts" : "Kompakts"}
        </button>
        <DM.Root>
          <DM.Trigger className="hidden h-8 items-center gap-1.5 rounded-md px-2 text-xs text-fg-muted hover:bg-surface-2 hover:text-fg md:inline-flex">
            <Columns3 className="size-4" /> Kolonnas
          </DM.Trigger>
          <DM.Portal>
            <DM.Content align="end" sideOffset={6} className="z-50 min-w-44 animate-fade-in rounded-lg border border-border bg-surface p-1 shadow-lg">
              {table.getAllLeafColumns().filter((c) => c.getCanHide()).map((c) => (
                <DM.CheckboxItem
                  key={c.id}
                  checked={c.getIsVisible()}
                  onCheckedChange={(v) => c.toggleVisibility(!!v)}
                  onSelect={(e) => e.preventDefault()}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-fg-muted outline-none data-[highlighted]:bg-surface-2 data-[highlighted]:text-fg"
                >
                  <span className="flex size-4 items-center justify-center">
                    <DM.ItemIndicator><Check className="size-3.5" /></DM.ItemIndicator>
                  </span>
                  {COLUMN_LABELS[c.id] ?? c.id}
                </DM.CheckboxItem>
              ))}
            </DM.Content>
          </DM.Portal>
        </DM.Root>
      </div>

      {/* Desktop table */}
      <div className="hidden max-h-[calc(100dvh-240px)] min-h-[320px] overflow-auto rounded-lg border border-border bg-surface md:block">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-surface shadow-[0_1px_0_var(--border)]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((h) => {
                  const sortable = sortableTable ? SORT_BY_COLUMN[h.column.id] : undefined;
                  const current = sortable && sortable.sort === filters.sort;
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={current ? (sortable.asc ? "ascending" : "descending") : undefined}
                      className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-fg-subtle"
                    >
                      {sortable ? (
                        <Link href={sortHref(h.column.id)} scroll={false} className={cn("inline-flex items-center gap-1 hover:text-fg", current && "text-fg")}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {current && (sortable.asc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                        </Link>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => router.push(`/ads/${row.original.id}`, { scroll: false })}
                className={cn(
                  "cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface-2/60",
                  row.original.is_active === false && "text-fg-muted",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={cn("px-3 align-top", density === "compact" ? "py-1.5" : "py-3")}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/ads/${r.id}`} scroll={false} className="block rounded-lg border border-border bg-surface p-3 active:bg-surface-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{r.title}</p>
                  <p className="truncate text-xs text-fg-muted">{r.company}{r.town ? ` · ${r.town}` : ""}</p>
                </div>
                <FavouriteStar id={r.id} className="-mr-1 -mt-1" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusPill isActive={r.is_active} closingSoon={r.closing_soon} deadline={r.deadline} />
                <RepeatBadge {...r} />
                <Badge tone="outline">{label(WORK_MODE, r.work_mode)}</Badge>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <Salary from={r.salary_from} to={r.salary_to} period={r.salary_period} className="text-sm font-medium" />
                <span className="text-fg-subtle">{relDays(r.first_published_at)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
