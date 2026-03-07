import { ListFilter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function ListsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight">Lists</h2>
          <p className="text-[13px] text-muted-foreground">Organize contacts into lists and segments.</p>
        </div>
        <Button size="sm" className="text-[13px]">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Create list
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <EmptyState
          icon={ListFilter}
          title="No lists yet"
          description="Create a list to group contacts for targeted campaigns and sequences."
          actionLabel="Create your first list"
        />
      </div>
    </div>
  );
}
