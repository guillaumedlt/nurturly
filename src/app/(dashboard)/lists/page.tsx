import { ListFilter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function ListsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Lists</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Organize contacts into lists and segments.</p>
        </div>
        <Button size="sm" className="h-8 text-[12px]">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Create list
        </Button>
      </div>

      <div className="rounded-lg border border-border">
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
