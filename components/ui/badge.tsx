import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "ok" | "warn" | "danger" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg-muted",
  accent: "bg-accent-soft text-accent",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  outline: "border border-border text-fg-muted",
};

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium [&_svg]:size-3",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
