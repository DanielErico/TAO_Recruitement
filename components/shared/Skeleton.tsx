import { cn } from "@/lib/utils";

/**
 * Skeleton — animated placeholder block for loading states.
 * Matches the platform's design tokens.
 */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-[var(--color-muted)]",
        className
      )}
      style={style}
    />
  );
}

/** A full card-shaped skeleton */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-white p-6",
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-24 mb-2" />
      <Skeleton className="h-3 w-32 mb-1" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

/** A table row skeleton */
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-[var(--color-border)]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${i === 0 ? "w-36" : "w-16"}`} />
        </td>
      ))}
    </tr>
  );
}

/** A full page skeleton with sidebar offset already applied */
export function PageSkeleton({ children }: { children: React.ReactNode }) {
  return <div className="space-y-8 animate-fade-in">{children}</div>;
}
