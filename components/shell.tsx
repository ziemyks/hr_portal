"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Bookmark, Building2, ChevronsLeft, ChevronsRight, LayoutDashboard, List, LogOut, Menu, Monitor, Moon, Search, Star, Sun, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/storage";
import { useCommand } from "@/components/providers";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";

const NAV = [
  { href: "/", label: "Pārskats", icon: LayoutDashboard },
  { href: "/ads", label: "Sludinājumi", icon: List },
  { href: "/companies", label: "Uzņēmumi", icon: Building2 },
  { href: "/favourites", label: "Izlase", icon: Star },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  const { views, favourites } = useStore();
  return (
    <nav aria-label="Galvenā navigācija" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-2">
      <ul className="space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          const item = (
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors",
                active ? "bg-surface-2 text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{label}</span>}
              {!collapsed && href === "/favourites" && favourites.length > 0 && (
                <span className="text-xs tabular-nums text-fg-subtle">{favourites.length}</span>
              )}
            </Link>
          );
          return <li key={href}>{collapsed ? <Tooltip content={label} side="right">{item}</Tooltip> : item}</li>;
        })}
      </ul>

      {!collapsed && (
        <div>
          <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">Saglabātie skati</p>
          {views.length === 0 ? (
            <p className="px-2 text-xs text-fg-subtle">Sludinājumu sarakstā spiediet „Saglabāt skatu”.</p>
          ) : (
            <ul className="space-y-0.5">
              {views.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/ads${v.query}`}
                    onClick={onNavigate}
                    className="flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-fg-muted hover:bg-surface-2 hover:text-fg"
                  >
                    <Bookmark className="size-3.5 shrink-0" />
                    <span className="truncate">{v.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </nav>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const order = ["system", "light", "dark"] as const;
  const current = mounted ? ((theme as (typeof order)[number]) ?? "system") : "system";
  const next = order[(order.indexOf(current) + 1) % order.length];
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor;
  const names = { system: "sistēmas", light: "gaišā", dark: "tumšā" };
  return (
    <Tooltip content={`Tēma: ${names[current]} (mainīt uz ${names[next]})`}>
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={`Tēma: ${names[current]}. Mainīt uz ${names[next]}`}
        className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
      >
        <Icon className="size-4" />
      </button>
    </Tooltip>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { setOpen } = useCommand();
  const path = usePathname();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("blt.sidebar") === "collapsed");
    } catch {}
  }, []);
  useEffect(() => setMobileOpen(false), [path]);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("blt.sidebar", c ? "open" : "collapsed");
      } catch {}
      return !c;
    });
  };

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex",
          collapsed ? "w-14" : "w-60",
        )}
      >
        <div className={cn("flex h-14 items-center gap-2 border-b border-border px-3", collapsed && "justify-center px-0")}>
          <Brand collapsed={collapsed} />
        </div>
        <SidebarContent collapsed={collapsed} />
        <div className={cn("flex items-center gap-1 border-t border-border p-2", collapsed && "flex-col")}>
          <form action="/api/logout" method="post" className={cn(!collapsed && "flex-1")}>
            <button
              type="submit"
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-md px-2 text-[13px] text-fg-muted hover:bg-surface-2 hover:text-fg",
                collapsed && "justify-center px-0",
              )}
              aria-label="Iziet"
            >
              <LogOut className="size-4" />
              {!collapsed && "Iziet"}
            </button>
          </form>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Izvērst sānjoslu" : "Sakļaut sānjoslu"}
            className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 animate-fade-in flex-col border-r border-border bg-surface">
            <div className="flex h-14 items-center justify-between border-b border-border px-3">
              <Brand collapsed={false} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Aizvērt izvēlni"
                className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2"
              >
                <X className="size-4" />
              </button>
            </div>
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
            <form action="/api/logout" method="post" className="border-t border-border p-2">
              <button type="submit" className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-[13px] text-fg-muted hover:bg-surface-2">
                <LogOut className="size-4" /> Iziet
              </button>
            </form>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Atvērt izvēlni"
            className="-ml-1 inline-flex size-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 md:hidden"
          >
            <Menu className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-9 min-w-0 max-w-md flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-fg-subtle transition-colors hover:border-border-strong"
          >
            <Search className="size-4" />
            <span className="flex-1 truncate text-left">Meklēt sludinājumus, uzņēmumus, prasmes…</span>
            <span className="hidden items-center gap-0.5 sm:flex">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg">
        <svg viewBox="0 0 32 32" className="size-4" aria-hidden>
          <path d="M6 21 12.5 13.5l4.5 4.5L26 9" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!collapsed && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13px] font-semibold">Darba tirgus</span>
          <span className="block truncate text-[11px] text-fg-subtle">IT · Banku/apdrošināšanas</span>
        </span>
      )}
    </Link>
  );
}
