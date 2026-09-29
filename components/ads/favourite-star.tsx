"use client";

import { Star } from "lucide-react";
import { toggleFavourite, useStore } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function FavouriteStar({ id, className, withLabel }: { id: string; className?: string; withLabel?: boolean }) {
  const { favourites } = useStore();
  const on = favourites.includes(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Noņemt no izlases" : "Pievienot izlasei"}
      title={on ? "Noņemt no izlases" : "Pievienot izlasei"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavourite(id);
      }}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-md text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg",
        withLabel ? "px-2.5 text-[13px] font-medium" : "w-8",
        on && "text-[#d99a00] hover:text-[#d99a00]",
        className,
      )}
    >
      <Star className={cn("size-4", on && "fill-current")} />
      {withLabel && (on ? "Izlasē" : "Izlasei")}
    </button>
  );
}
