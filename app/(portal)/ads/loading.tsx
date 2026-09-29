import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Ielādē sludinājumus">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8 w-24" />)}
      </div>
      <div className="space-y-px overflow-hidden rounded-lg border border-border bg-surface">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-3 py-4 last:border-0">
            <Skeleton className="h-4 w-4" />
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/4" /></div>
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="hidden h-4 w-20 lg:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
