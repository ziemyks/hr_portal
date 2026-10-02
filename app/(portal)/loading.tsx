import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Ielādē pārskatu">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-[28rem] max-w-full" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-8 w-32" />)}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Skeleton className="h-80 xl:col-span-3" />
        <Skeleton className="h-80 xl:col-span-2" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
