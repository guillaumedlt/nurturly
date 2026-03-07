import { GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";

export default function SequencesPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Sequences</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Automated multi-step email flows for nurturing.</p>
        </div>
        <Link href="/sequences/new">
          <Button size="sm" className="h-8 text-[12px]">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New sequence
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-border">
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
