import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <div className="max-w-xl space-y-10">
      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Settings</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Manage your account and email configuration.</p>
      </div>

      {/* Profile */}
      <section className="space-y-4">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Profile</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Name</label>
            <Input placeholder="Your name" className="h-9 text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Email</label>
            <Input placeholder="you@company.com" className="h-9 text-[13px]" disabled />
          </div>
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* Sender Identity */}
      <section className="space-y-4">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Sender Identity</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">From Name</label>
            <Input placeholder="Nurturly" className="h-9 text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">From Email</label>
            <Input placeholder="hello@yourdomain.com" className="h-9 text-[13px]" />
          </div>
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* Integrations */}
      <section className="space-y-4">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Integrations</h3>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-[13px] font-medium text-foreground">HubSpot</p>
            <p className="text-[12px] text-muted-foreground">Sync contacts from your HubSpot CRM.</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-[12px]" disabled>
            Coming soon
          </Button>
        </div>
      </section>
    </div>
  );
}
