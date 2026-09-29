"use client";

import * as T from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <T.Provider delayDuration={250} skipDelayDuration={100}>{children}</T.Provider>
);

export function Tooltip({ content, children, side = "top" }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  if (!content) return <>{children}</>;
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-[60] max-w-xs animate-fade-in rounded-md bg-fg px-2 py-1 text-xs text-bg shadow-md"
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
