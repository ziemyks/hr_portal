import { CircleCheck, CircleDashed, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { relDays } from "@/lib/format";

/** Status always pairs colour with an icon + word (never colour alone). */
export function StatusPill({ isActive, closingSoon, deadline }: { isActive: boolean | null; closingSoon?: boolean | null; deadline?: string | null }) {
  if (isActive && closingSoon)
    return (
      <Badge tone="warn" title={deadline ? `Termiņš ${relDays(deadline)}` : undefined}>
        <Clock /> Beidzas drīz
      </Badge>
    );
  if (isActive)
    return (
      <Badge tone="ok">
        <CircleCheck /> Aktīvs
      </Badge>
    );
  return (
    <Badge tone="neutral">
      <CircleDashed /> Neaktīvs
    </Badge>
  );
}
