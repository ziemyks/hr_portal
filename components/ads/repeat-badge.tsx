"use client";

import { Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { repeatTooltip } from "@/lib/format";

export function RepeatBadge(r: { is_repeating: boolean; times_posted?: number | null; times_renewed?: number | null; days_open?: number | null; compact?: boolean }) {
  if (!r.is_repeating) return null;
  return (
    <Tooltip content={<>Atkārtots sludinājums – iespējamas grūtības atrast kandidātu. {repeatTooltip(r)}</>}>
      <span tabIndex={0} className="inline-flex rounded-md">
        <Badge tone="warn" aria-label={`Atkārtots: ${repeatTooltip(r)}`}>
          <Repeat />
          {!r.compact && "Atkārtots"}
        </Badge>
      </span>
    </Tooltip>
  );
}
