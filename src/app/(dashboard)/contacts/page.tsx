import { Users, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function ContactsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Contacts</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Manage your audience and subscribers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[12px]">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import
          </Button>
          <Button size="sm" className="h-8 text-[12px]">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add contact
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border">
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
