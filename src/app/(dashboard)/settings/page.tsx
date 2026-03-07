import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-[28px] font-semibold tracking-tight">Settings</h2>
        <p className="text-[13px] text-muted-foreground">Manage your account and email configuration.</p>
      </div>

      {/* Profile */}
      <section className="space-y-4">
        <div>
          <h3 className="text-[14px] font-medium">Profile</h3>
          <p className="text-[13px] text-muted-foreground">Your account information.</p>
        </div>
        <Separator />
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-label">Name</label>
            <Input placeholder="Your name" className="text-[13px]" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-label">Email</label>
            <Input placeholder="you@company.com" className="text-[13px]" disabled />
          </div>
        </div>
      </section>

      {/* Sender Identity */}
      <section className="space-y-4">
        <div>
          <h3 className="text-[14px] font-medium">Sender Identity</h3>
          <p className="text-[13px] text-muted-foreground">Configure how your emails appear to recipients.</p>
        </div>
        <Separator />
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-label">From Name</label>
            <Input placeholder="Nurturly" className="text-[13px]" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-label">From Email</label>
            <Input placeholder="hello@yourdomain.com" className="text-[13px]" />
          </div>
        </div>
      </section>

      {/* Integrations placeholder */}
      <section className="space-y-4">
        <div>
          <h3 className="text-[14px] font-medium">Integrations</h3>
          <p className="text-[13px] text-muted-foreground">Connect external services.</p>
        </div>
        <Separator />
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium">HubSpot</p>
              <p className="text-[12px] text-muted-foreground">Sync contacts from your HubSpot CRM.</p>
            </div>
            <Button variant="outline" size="sm" className="text-[13px]" disabled>
              Coming soon
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
