"use client";

import * as P from "@radix-ui/react-popover";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverAnchor = P.Anchor;

export function PopoverContent({ children, className, align = "start" }: { children: ReactNode; className?: string; align?: "start" | "center" | "end" }) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={6}
        collisionPadding={8}
        className={cn("z-50 w-72 animate-fade-in rounded-lg border border-border bg-surface p-1 shadow-lg outline-none", className)}
      >
        {children}
      </P.Content>
    </P.Portal>
  );
}
