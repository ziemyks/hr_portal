"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Right-hand slide-over panel (full screen on mobile). */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  headerActions,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  headerActions?: ReactNode;
  className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/30 dark:bg-black/50" />
        <D.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }}
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full animate-drawer-in flex-col border-l border-border bg-surface shadow-2xl outline-none sm:w-[600px] sm:max-w-[92vw]",
            className,
          )}
        >
          <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-3">
            <D.Title className="sr-only">{title}</D.Title>
            <div className="flex flex-1 items-center gap-1">{headerActions}</div>
            <D.Close className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg" aria-label="Aizvērt">
              <X className="size-4" />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
