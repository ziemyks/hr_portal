"use client";

import type { ReactNode } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const pillBase = "inline-flex h-9 shrink-0 items-center rounded-full border text-[13px] font-medium transition-colors sm:h-8";
const pillOnFirst = "max-sm:-order-1";
const pillIdle = "border-border bg-surface text-fg-muted hover:border-border-strong hover:bg-surface-2 hover:text-fg";
const pillOn = "border-accent/30 bg-accent-soft text-accent";

/**
 * Filter button that shows its current value inline ("Pilsēta · Rīga +2") and clears with ×.
 * `summary` = null means the filter is not set.
 */
export function FilterPill({
  label,
  icon,
  summary,
  onClear,
  open,
  onOpenChange,
  align = "start",
  contentClassName,
  children,
}: {
  label: string;
  icon?: ReactNode;
  summary: string | null;
  onClear?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: "start" | "center" | "end";
  contentClassName?: string;
  children: ReactNode;
}) {
  const on = summary != null;
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <div className={cn(pillBase, on ? cn(pillOn, pillOnFirst) : pillIdle, open && !on && "border-border-strong bg-surface-2 text-fg")}>
          <PopoverTrigger
            className={cn(
              "inline-flex h-full min-w-0 items-center gap-1.5 rounded-full pl-3 [&_svg]:size-3.5 [&_svg]:shrink-0",
              on && onClear ? "pr-1.5" : "pr-2.5",
            )}
          >
            {icon}
            <span className={cn(on && "text-accent/75")}>{label}</span>
            {on ? (
              <>
                <span aria-hidden className="h-3.5 w-px bg-accent/25" />
                <span className="max-w-44 truncate font-semibold">{summary}</span>
              </>
            ) : (
              <ChevronDown className={cn("opacity-50 transition-transform", open && "rotate-180")} />
            )}
          </PopoverTrigger>
          {on && onClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label={`Notīrīt filtru: ${label}`}
              className="mr-1 flex size-6 items-center justify-center rounded-full hover:bg-accent/15"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent align={align} className={contentClassName}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** On/off filter with the same look as FilterPill. */
export function TogglePill({ label, icon, pressed, onToggle }: { label: string; icon?: ReactNode; pressed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(pillBase, "gap-1.5 px-3 [&_svg]:size-3.5", pressed ? cn(pillOn, pillOnFirst) : pillIdle)}
    >
      {icon}
      {label}
    </button>
  );
}

/** One row of a single-choice popover menu. */
export function MenuOption({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-surface-2 hover:text-fg",
        selected ? "font-medium text-fg" : "text-fg-muted",
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">{selected && <Check className="size-3.5 text-accent" />}</span>
      {children}
    </button>
  );
}
