import { Skeleton, SkeletonCard } from "@/components/shared/Skeleton";

export default function CandidateDashboardLoading() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-56 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Applications list */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white">
        <div className="p-6 border-b border-[var(--color-border)]">
          <Skeleton className="h-5 w-40 mb-1.5" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Skeleton className="h-5 w-52 mb-2" />
                  <Skeleton className="h-3.5 w-36 mb-3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Skeleton className="h-7 w-20 rounded-full mb-2" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
