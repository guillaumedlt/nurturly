import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0">
      <div className="flex items-center gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={cn("h-2.5", j === 0 ? "w-36" : "w-16")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="rounded-lg border border-border p-4">
      <Skeleton className="mb-3 h-2 w-14" />
      <Skeleton className="h-5 w-20" />
    </div>
  );
}
