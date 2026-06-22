import { Skeleton, SkeletonCard } from "@/components/shared/Skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div>
            <Skeleton className="h-6 w-52 mb-2" />
            <Skeleton className="h-3.5 w-80" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Section: Overview KPIs */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-24 mb-1.5" />
            <Skeleton className="h-3.5 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--color-border)]" />

      {/* Section: Pipeline & Trend */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-40 mb-1.5" />
            <Skeleton className="h-3.5 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
            <Skeleton className="h-5 w-40 mb-1.5" />
            <Skeleton className="h-3.5 w-64 mb-5" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className={`h-11 rounded-xl`} style={{ width: `${100 - i * 12}%` }} />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
            <Skeleton className="h-5 w-40 mb-1.5" />
            <Skeleton className="h-3.5 w-56 mb-5" />
            <Skeleton className="h-52 w-full rounded-lg" />
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)]" />

      {/* Section: AI & Quality */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-56 mb-1.5" />
            <Skeleton className="h-3.5 w-80" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-[var(--color-border)] bg-white p-6">
              <Skeleton className="h-5 w-44 mb-1.5" />
              <Skeleton className="h-3.5 w-56 mb-6" />
              <div className="flex items-center justify-around mb-6 pb-5 border-b border-[var(--color-border)]">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-3">
                  <Skeleton className="h-8 w-14" />
                  <Skeleton className="h-8 w-14" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-36 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--color-border)]" />

      {/* Section: Talent Pool */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-36 mb-1.5" />
            <Skeleton className="h-3.5 w-80" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-[var(--color-border)] bg-white p-6">
              <Skeleton className="h-5 w-36 mb-1.5" />
              <Skeleton className="h-3.5 w-48 mb-5" />
              <Skeleton className="h-44 w-full rounded-lg mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
