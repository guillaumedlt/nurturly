import { GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";

export default function SequencesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight">Sequences</h2>
          <p className="text-[13px] text-muted-foreground">Automated multi-step email flows for nurturing.</p>
        </div>
        <Link href="/sequences/new">
          <Button size="sm" className="text-[13px]">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New sequence
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <EmptyState
          icon={GitBranch}
          title="No sequences yet"
          description="Create automated email sequences to nurture your contacts over time."
          actionLabel="Create sequence"
          actionHref="/sequences/new"
        />
      </div>
    </div>
  );
}
