"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { companyHref } from "@/lib/links";
import { cn } from "@/lib/utils";

export type PickerCompany = { company: string; n: number; n_active: number };

/** Searchable company selector; choosing one opens its profile. */
export function CompanyPicker({ companies, current, className }: { companies: PickerCompany[]; current?: string; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm transition-colors hover:border-border-strong",
          className,
        )}
        aria-label="Izvēlēties uzņēmumu"
      >
        <Building2 className="size-4 shrink-0 text-fg-subtle" />
        <span className={cn("min-w-0 flex-1 truncate text-left", !current && "text-fg-subtle")}>{current ?? "Izvēlieties uzņēmumu…"}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-fg-subtle" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(28rem,calc(100vw-32px))]">
        <Command loop>
          <Command.Input
            autoFocus
            placeholder={`Meklēt starp ${companies.length} uzņēmumiem…`}
            className="mb-1 h-9 w-full border-b border-border bg-transparent px-2.5 text-sm outline-none placeholder:text-fg-subtle"
          />
          <Command.List className="max-h-80 overflow-y-auto">
            <Command.Empty className="px-2.5 py-6 text-center text-xs text-fg-subtle">Nav atrasts</Command.Empty>
            {companies.map((c) => (
              <Command.Item
                key={c.company}
                value={c.company}
                onSelect={() => {
                  setOpen(false);
                  router.push(companyHref(c.company));
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-fg-muted aria-selected:bg-surface-2 aria-selected:text-fg",
                  c.company === current && "font-medium text-fg",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{c.company}</span>
                <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
                  {c.n_active} akt. / {c.n}
                </span>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
