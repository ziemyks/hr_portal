"use client";

import { ThemeProvider } from "next-themes";
import { createContext, useContext, useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Ordered ad ids of the list currently on screen, so the drawer can step ↑/↓ through them. */
type AdNav = { ids: string[]; setIds: (ids: string[]) => void };
const AdNavContext = createContext<AdNav>({ ids: [], setIds: () => {} });
export const useAdNav = () => useContext(AdNavContext);

/** Command palette open state, shared by the top-bar button and the ⌘K listener. */
type Cmd = { open: boolean; setOpen: (v: boolean | ((o: boolean) => boolean)) => void };
const CmdContext = createContext<Cmd>({ open: false, setOpen: () => {} });
export const useCommand = () => useContext(CmdContext);

export function Providers({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <AdNavContext.Provider value={{ ids, setIds }}>
          <CmdContext.Provider value={{ open, setOpen }}>{children}</CmdContext.Provider>
        </AdNavContext.Provider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
