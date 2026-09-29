"use client";

import { Command } from "cmdk";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string; n?: number };

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  searchable = options.length > 8,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const count = selected.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium transition-colors",
          count
            ? "border-accent/40 bg-accent-soft text-accent"
            : "border-dashed border-border-strong bg-surface text-fg-muted hover:border-solid hover:text-fg",
        )}
      >
        {label}
        {count > 0 && (
          <span className="rounded bg-accent px-1 text-[11px] leading-4 text-accent-fg tabular-nums">{count}</span>
        )}
        <ChevronDown className="size-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent>
        <Command loop>
          {searchable && (
            <Command.Input
              placeholder={`Meklēt: ${label.toLowerCase()}…`}
              className="mb-1 h-9 w-full rounded-md border-b border-border bg-transparent px-2.5 text-sm outline-none placeholder:text-fg-subtle"
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
                      "flex size-4 shrink-0 items-center justify-center rounded border",
                      on ? "border-accent bg-accent text-accent-fg" : "border-border-strong",
                    )}
                    aria-hidden
                  >
                    {on && <Check className="size-3" />}
                  </span>
                  <span className="flex-1 truncate">{o.label}</span>
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
      </PopoverContent>
    </Popover>
  );
}
