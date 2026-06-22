import { Skeleton, SkeletonCard } from "@/components/shared/Skeleton";

export default function RecruiterDashboardLoading() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
          <Skeleton className="h-5 w-36 mb-1.5" />
          <Skeleton className="h-3.5 w-52 mb-5" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)]">
                <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-40 mb-1.5" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
          <Skeleton className="h-5 w-36 mb-1.5" />
          <Skeleton className="h-3.5 w-52 mb-5" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white">
        <div className="p-6 border-b border-[var(--color-border)]">
          <Skeleton className="h-5 w-36 mb-1.5" />
          <Skeleton className="h-3.5 w-52" />
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-1.5" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
