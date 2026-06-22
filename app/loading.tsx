import { Skeleton } from "@/components/shared/Skeleton";

export default function JobsPageLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      {/* Header area */}
      <div className="bg-white border-b border-[var(--color-border)] px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-9 w-64 mb-3" />
          <Skeleton className="h-5 w-96 mb-6" />
          <div className="flex gap-3 flex-wrap">
            <Skeleton className="h-10 flex-1 min-w-[200px] rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Job listings */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--color-border)] bg-white p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Skeleton className="h-5 w-44 mb-2" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full shrink-0 ml-3" />
              </div>
              <div className="flex gap-2 mb-4">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="border-t border-[var(--color-border)] pt-3 flex justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-7 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
