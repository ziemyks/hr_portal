import { Skeleton } from "@/components/ui/skeleton";

export default function DrawerLoading() {
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full border-l border-border bg-surface shadow-2xl sm:w-[600px] sm:max-w-[92vw]" aria-busy="true">
      <div className="h-12 border-b border-border" />
      <div className="space-y-4 p-5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
