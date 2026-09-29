import { salary } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Salary({
  from, to, period, className, showBasis,
}: { from: number | null; to: number | null; period: string | null; className?: string; showBasis?: boolean }) {
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      {salary(from, to, period)}
      {showBasis && <span className="font-normal text-fg-subtle"> bruto</span>}
    </span>
  );
}
