import { Skeleton } from '@/components/ui/skeleton'

export function FinanceSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Overview Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-border/50 bg-card/60 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Account / Pocket Locations */}
      <div className="p-5 rounded-xl border border-border/50 bg-card/60 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg border border-border/30 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Chart & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-xl border border-border/50 bg-card/60 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="p-5 rounded-xl border border-border/50 bg-card/60 space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2.5 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
