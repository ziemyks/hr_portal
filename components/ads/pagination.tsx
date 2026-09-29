import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { PAGE_SIZE, toQuery, type AdFilters } from "@/lib/filters";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Pagination({ filters, count }: { filters: AdFilters; count: number }) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const from = count ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, count);
  const href = (p: number) => `/ads${toQuery({ ...filters, page: p })}`;
  return (
    <nav aria-label="Lapas" className="flex items-center justify-between gap-2 text-xs text-fg-subtle">
      <span className="tabular-nums">
        {num(from)}–{num(to)} no {num(count)}
      </span>
      <div className="flex items-center gap-1">
        <Link
          href={href(page - 1)}
          aria-disabled={page <= 1}
          className={cn(buttonClass("outline", "sm"), page <= 1 && "pointer-events-none opacity-40")}
        >
          <ChevronLeft /> Iepriekšējā
        </Link>
        <span className="px-2 tabular-nums">
          {page} / {pages}
        </span>
        <Link
          href={href(page + 1)}
          aria-disabled={page >= pages}
          className={cn(buttonClass("outline", "sm"), page >= pages && "pointer-events-none opacity-40")}
        >
          Nākamā <ChevronRight />
        </Link>
      </div>
    </nav>
  );
}
