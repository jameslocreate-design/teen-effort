import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonCard = () => (
  <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <div className="flex gap-4 pt-1">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-16" />
    </div>
  </div>
);

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const CalendarSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={`h-${i}`} className="h-8 w-full rounded-lg" />
      ))}
      {Array.from({ length: 35 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  </div>
);

export const PhotoJournalSkeleton = () => (
  <div className="space-y-6">
    <div className="text-center space-y-2">
      <Skeleton className="h-12 w-12 rounded-2xl mx-auto" />
      <Skeleton className="h-6 w-32 mx-auto" />
      <Skeleton className="h-4 w-48 mx-auto" />
    </div>
    {Array.from({ length: 2 }).map((_, i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-28" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, j) => (
            <Skeleton key={j} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    ))}
  </div>
);
