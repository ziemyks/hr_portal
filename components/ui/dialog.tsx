"use client";

import * as D from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[70] animate-fade-in bg-black/40 dark:bg-black/60" />
        <D.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-[12vh] z-[70] w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 animate-fade-in overflow-hidden rounded-xl border border-border bg-surface shadow-2xl outline-none",
            className,
          )}
        >
          <D.Title className="sr-only">{title}</D.Title>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
