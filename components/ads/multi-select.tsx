"use client";

import { Command } from "cmdk";
import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { FilterPill } from "./filter-pill";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string; n?: number };

/** Faceted filter pill. `single` = pick one value (closes on select). */
export function MultiSelect({
  label,
  icon,
  options,
  selected,
  onChange,
  single = false,
  searchable = options.length > 8,
}: {
  label: string;
  icon?: ReactNode;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  single?: boolean;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) => {
    if (single) {
      setOpen(false);
      onChange(selected.includes(v) ? [] : [v]);
    } else onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  const count = selected.length;
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const summary = count === 0 ? null : count === 1 ? labelOf(selected[0]) : `${labelOf(selected[0])} +${count - 1}`;

  return (
    <FilterPill label={label} icon={icon} summary={summary} onClear={() => onChange([])} open={open} onOpenChange={setOpen}>
      <Command loop>
        {searchable && (
          <Command.Input
            placeholder={`Meklēt: ${label.toLowerCase()}…`}
            className="mb-1 h-9 w-full border-b border-border bg-transparent px-2.5 text-sm outline-none placeholder:text-fg-subtle"
          />
        )}
        <Command.List className="max-h-72 overflow-y-auto">
          <Command.Empty className="px-2.5 py-6 text-center text-xs text-fg-subtle">Nav atbilstību</Command.Empty>
          {options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <Command.Item
                key={o.value}
                value={`${o.label} ${o.value}`}
                onSelect={() => toggle(o.value)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-fg-muted aria-selected:bg-surface-2 aria-selected:text-fg"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center border",
                    single ? "rounded-full" : "rounded",
                    on ? "border-accent bg-accent text-accent-fg" : "border-border-strong",
                  )}
                  aria-hidden
                >
                  {on && <Check className="size-3" />}
                </span>
                <span className={cn("flex-1 truncate", on && "font-medium text-fg")}>{o.label}</span>
                {o.n != null && <span className="text-xs tabular-nums text-fg-subtle">{o.n}</span>}
              </Command.Item>
            );
          })}
        </Command.List>
      </Command>
      {count > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="mt-1 w-full rounded-md border-t border-border px-2 py-1.5 text-center text-xs text-fg-muted hover:bg-surface-2"
        >
          Notīrīt izvēli
        </button>
      )}
    </FilterPill>
  );
}
