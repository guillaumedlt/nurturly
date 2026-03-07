import { Send, Users, BarChart3, MousePointerClick } from "lucide-react";

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-label">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-[22px] font-semibold tracking-tight font-stat">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Contacts" value="0" icon={Users} />
        <MetricCard label="Emails sent" value="0" icon={Send} />
        <MetricCard label="Open rate" value="—" icon={BarChart3} />
        <MetricCard label="Click rate" value="—" icon={MousePointerClick} />
      </div>

      {/* Activity */}
      <div>
        <h2 className="text-label mb-3">Recent Activity</h2>
        <div className="rounded-lg border border-border bg-card">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-[13px] text-muted-foreground">
              No activity yet. Start by importing contacts or creating a campaign.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
