import { Send, Users, BarChart3, MousePointerClick, ArrowUpRight } from "lucide-react";

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="group rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-[24px] font-semibold tracking-tight text-foreground font-stat">{value}</p>
        {change && (
          <span className="flex items-center text-[11px] text-muted-foreground">
            <ArrowUpRight className="mr-0.5 h-3 w-3" />
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Contacts" value="0" icon={Users} />
        <MetricCard label="Emails sent" value="0" icon={Send} />
        <MetricCard label="Open rate" value="—" icon={BarChart3} />
        <MetricCard label="Click rate" value="—" icon={MousePointerClick} />
      </div>

      <div>
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Recent activity</h2>
        <div className="rounded-lg border border-border">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[13px] text-muted-foreground">
              No activity yet. Start by importing contacts or creating a campaign.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
