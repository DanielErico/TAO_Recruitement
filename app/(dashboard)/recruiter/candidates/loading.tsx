import { Skeleton, SkeletonRow } from "@/components/shared/Skeleton";

export default function CandidatesLoading() {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-36 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 flex-wrap">
        <Skeleton className="h-9 flex-1 min-w-[200px] rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white overflow-hidden">
        {/* Table header */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 grid grid-cols-6 gap-4">
          {["Candidate", "Job", "Status", "AI Score", "Applied", ""].map((h) => (
            <Skeleton key={h} className="h-3.5 w-16" />
          ))}
        </div>
        {/* Table rows */}
        <table className="w-full">
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonRow key={i} cols={6} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
