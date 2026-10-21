import { Skeleton } from '@/components/ui/skeleton'

export function TodosSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Search / Add Bar placeholder */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/60">
        <Skeleton className="h-5 w-5 rounded-md" />
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full shrink-0" />
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2.5 pt-2">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-card/60"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-md" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48 sm:w-64" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
