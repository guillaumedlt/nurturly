import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold tracking-tight">Analytics</h2>
        <p className="text-[13px] text-muted-foreground">Track your email performance and engagement.</p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <EmptyState
          icon={BarChart3}
          title="No data yet"
          description="Analytics will appear here once you start sending campaigns and sequences."
        />
      </div>
    </div>
  );
}
