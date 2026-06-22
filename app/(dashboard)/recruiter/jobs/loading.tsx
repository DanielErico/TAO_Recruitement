import { Skeleton } from "@/components/shared/Skeleton";

export default function JobsLoading() {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-28 mb-2" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Job cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border)] bg-white p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <Skeleton className="h-5 w-44 mb-2" />
                <Skeleton className="h-3.5 w-28" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full shrink-0 ml-3" />
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
