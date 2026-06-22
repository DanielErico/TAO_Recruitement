import { Skeleton } from "@/components/shared/Skeleton";

export default function PipelineLoading() {
  const stages = ["Applied", "Screening", "Interview", "Assessment", "Final Review", "Hired"];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-60" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div key={stage} className="shrink-0 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-7 rounded-full" />
            </div>
            <div className="space-y-2.5">
              {Array.from({ length: stage === "Applied" ? 4 : stage === "Hired" ? 1 : 2 }).map((_, i) => (
                <div key={i} className="rounded-lg bg-white border border-[var(--color-border)] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-3.5 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full mb-1.5" />
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
