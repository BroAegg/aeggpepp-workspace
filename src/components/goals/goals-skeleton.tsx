import { Skeleton } from '@/components/ui/skeleton'

export function GoalsSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Table header skeleton */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
        <div className="grid grid-cols-6 gap-4 pb-3 border-b border-border/40">
          <Skeleton className="h-4 w-28 col-span-2" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 items-center py-2.5">
            <div className="col-span-2 flex items-center gap-2.5">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-2.5 w-28 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
