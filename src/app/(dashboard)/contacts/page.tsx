import { Users, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function ContactsPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight">Contacts</h2>
          <p className="text-[13px] text-muted-foreground">Manage your audience and subscribers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-[13px]">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import
          </Button>
          <Button size="sm" className="text-[13px]">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add contact
          </Button>
        </div>
      </div>

      {/* Empty state */}
      <div className="rounded-lg border border-border bg-card">
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add contacts manually, import a CSV file, or connect an integration to sync your audience."
          actionLabel="Import contacts"
        />
      </div>
    </div>
  );
}
