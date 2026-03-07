import { Send, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";

export default function CampaignsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Campaigns</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Send newsletters and one-off emails to your audience.</p>
        </div>
        <Link href="/campaigns/new">
          <Button size="sm" className="h-8 text-[12px]">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New campaign
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-border">
        <EmptyState
          icon={Send}
          title="No campaigns yet"
          description="Create your first campaign to start sending emails to your audience."
          actionLabel="Create campaign"
          actionHref="/campaigns/new"
        />
      </div>
    </div>
  );
}
