import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  sub,
  delta,
  href,
  hero,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: { value: number; label: string } | null;
  href?: string;
  hero?: boolean;
}) {
  const body = (
    <>
      <p className="text-xs font-medium text-fg-muted">{label}</p>
      <p className={cn("mt-1 font-semibold tracking-tight text-fg", hero ? "text-4xl" : "text-2xl")}>{value}</p>
      {(delta || sub) && (
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-fg-subtle">
          {delta && (
            <span className="inline-flex items-center gap-0.5 font-medium text-fg-muted">
              {delta.value > 0 ? <ArrowUpRight className="size-3.5" /> : delta.value < 0 ? <ArrowDownRight className="size-3.5" /> : <Minus className="size-3.5" />}
              {delta.value > 0 ? "+" : ""}
              {delta.value}
              <span className="font-normal text-fg-subtle">{delta.label}</span>
            </span>
          )}
          {sub}
        </p>
      )}
    </>
  );
  const cls = "block rounded-lg border border-border bg-surface p-4";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-border-strong")}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
