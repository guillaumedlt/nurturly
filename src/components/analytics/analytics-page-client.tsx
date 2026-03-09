"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Send,
  BarChart3,
  MousePointerClick,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  TrendingUp,
  Eye,
  ShieldAlert,
  GitBranch,
  Mail,
  Target,
  type LucideIcon,
} from "lucide-react";

/* ─── Types ─── */

interface AnalyticsData {
  overview: {
    contacts: { total: number; subscribed: number; newLast30d: number; newPrev30d: number };
    emails: {
      totalSent: number; totalDelivered: number; totalOpened: number;
      totalClicked: number; totalBounced: number; totalRecipients: number;
      openRate: number; clickRate: number; bounceRate: number; deliveryRate: number;
    };
    campaigns: { total: number };
    sequences: {
      total: number; active: number; totalEnrolled: number;
      totalCompleted: number; completionRate: number;
    };
    lists: { total: number; totalMembers: number };
  };
  topCampaigns: {
    id: string; name: string; status: string;
    totalSent: number | null; totalOpened: number | null;
    totalClicked: number | null; totalBounced: number | null;
    sentAt: string | null;
  }[];
  topSequences: {
    id: string; name: string; status: string;
    totalEnrolled: number | null; totalCompleted: number | null;
  }[];
  dailyEvents: { date: string; eventType: string; eventCount: number }[];
  contactGrowth: { date: string; newContacts: number }[];
  recentEventCounts: { eventType: string; eventCount: number }[];
  enrollmentStatuses: { status: string; statusCount: number }[];
}

/* ─── Utility ─── */

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatDate(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function calcChange(current: number, previous: number): { value: string; positive: boolean } | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { value: "+100%", positive: true };
  const change = ((current - previous) / previous) * 100;
  return {
    value: `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`,
    positive: change >= 0,
  };
}

/* ─── Metric Card ─── */

function MetricCard({
  label, value, change, icon: Icon, subtitle,
}: {
  label: string;
  value: string;
  change?: { value: string; positive: boolean } | null;
  icon: LucideIcon;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-[24px] font-semibold tracking-tight text-foreground">{value}</p>
        {change && (
          <span className={`flex items-center text-[11px] ${change.positive ? "text-green-600" : "text-red-500"}`}>
            {change.positive ? <ArrowUpRight className="mr-0.5 h-3 w-3" /> : <ArrowDownRight className="mr-0.5 h-3 w-3" />}
            {change.value}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/* ─── Mini Bar Chart (pure CSS) ─── */

function MiniBarChart({ data, color, label }: {
  data: { label: string; value: number }[];
  color: string;
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <div className="flex items-end gap-[3px]" style={{ height: 80 }}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex-1 flex flex-col justify-end">
            <div
              className="w-full rounded-sm transition-all group-hover:opacity-80"
              style={{
                height: `${Math.max((d.value / max) * 100, 2)}%`,
                backgroundColor: color,
                minHeight: 2,
              }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block">
              <div className="rounded-md bg-foreground px-2 py-1 text-[10px] text-background whitespace-nowrap shadow-lg">
                {d.label}: {d.value}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <span className="text-[9px] text-muted-foreground/60">{data[0]?.label}</span>
        <span className="text-[9px] text-muted-foreground/60">{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/* ─── Horizontal Bar ─── */

function HorizontalBar({ label, value, max, color, suffix }: {
  label: string; value: number; max: number; color: string; suffix?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-foreground truncate max-w-[70%]">{label}</span>
        <span className="text-[12px] font-medium text-foreground tabular-nums">
          {formatNum(value)}{suffix}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/* ─── Funnel ─── */

function EngagementFunnel({ sent, delivered, opened, clicked }: {
  sent: number; delivered: number; opened: number; clicked: number;
}) {
  const steps = [
    { label: "Sent", value: sent, color: "#6366f1" },
    { label: "Delivered", value: delivered, color: "#8b5cf6" },
    { label: "Opened", value: opened, color: "#3b82f6" },
    { label: "Clicked", value: clicked, color: "#10b981" },
  ];

  const max = Math.max(sent, 1);

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const pct = (step.value / max) * 100;
        const dropOff = i > 0 ? ((steps[i - 1].value - step.value) / Math.max(steps[i - 1].value, 1)) * 100 : 0;
        return (
          <div key={step.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-foreground">{step.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-foreground tabular-nums">{formatNum(step.value)}</span>
                {i > 0 && dropOff > 0 && (
                  <span className="text-[10px] text-muted-foreground">-{dropOff.toFixed(0)}%</span>
                )}
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: step.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Enrollment Donut (CSS only) ─── */

function StatusDonut({ data }: {
  data: { status: string; statusCount: number }[];
}) {
  const total = data.reduce((acc, d) => acc + d.statusCount, 0);
  if (total === 0) return <p className="text-[12px] text-muted-foreground">No enrollments yet</p>;

  const statusColors: Record<string, string> = {
    active: "#3b82f6",
    completed: "#10b981",
    paused: "#f59e0b",
    unsubscribed: "#ef4444",
    bounced: "#6b7280",
  };

  const statusLabels: Record<string, string> = {
    active: "Active",
    completed: "Completed",
    paused: "Paused",
    unsubscribed: "Unsubscribed",
    bounced: "Bounced",
  };

  // Build conic gradient
  let cumPct = 0;
  const gradientParts: string[] = [];
  for (const d of data) {
    const pct = (d.statusCount / total) * 100;
    const color = statusColors[d.status] || "#6b7280";
    gradientParts.push(`${color} ${cumPct}% ${cumPct + pct}%`);
    cumPct += pct;
  }

  return (
    <div className="flex items-center gap-6">
      <div
        className="h-24 w-24 shrink-0 rounded-full"
        style={{
          background: `conic-gradient(${gradientParts.join(", ")})`,
          maskImage: "radial-gradient(circle, transparent 40%, black 41%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 40%, black 41%)",
        }}
      />
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.status} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColors[d.status] || "#6b7280" }} />
            <span className="text-[11px] text-muted-foreground">
              {statusLabels[d.status] || d.status}: <span className="font-medium text-foreground">{d.statusCount}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Campaign Performance Table ─── */

function CampaignTable({ campaigns }: {
  campaigns: AnalyticsData["topCampaigns"];
}) {
  if (campaigns.length === 0) {
    return <p className="py-6 text-center text-[12px] text-muted-foreground">No sent campaigns yet</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Campaign</th>
            <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sent</th>
            <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Open rate</th>
            <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Click rate</th>
            <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Bounce</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const sent = c.totalSent || 0;
            const openRate = sent > 0 ? ((c.totalOpened || 0) / sent) : 0;
            const clickRate = sent > 0 ? ((c.totalClicked || 0) / sent) : 0;
            const bounceRate = sent > 0 ? ((c.totalBounced || 0) / sent) : 0;
            return (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2.5">
                  <span className="text-[12px] font-medium text-foreground">{c.name}</span>
                  {c.sentAt && (
                    <p className="text-[10px] text-muted-foreground">{formatDate(c.sentAt)}</p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-[12px] tabular-nums text-foreground">{formatNum(sent)}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`text-[12px] tabular-nums font-medium ${openRate > 0.25 ? "text-green-600" : openRate > 0.15 ? "text-foreground" : "text-amber-600"}`}>
                    {formatPct(openRate)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`text-[12px] tabular-nums font-medium ${clickRate > 0.05 ? "text-green-600" : "text-foreground"}`}>
                    {formatPct(clickRate)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`text-[12px] tabular-nums ${bounceRate > 0.05 ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                    {formatPct(bounceRate)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Sequence Performance Table ─── */

function SequenceTable({ sequences }: {
  sequences: AnalyticsData["topSequences"];
}) {
  if (sequences.length === 0) {
    return <p className="py-6 text-center text-[12px] text-muted-foreground">No sequences yet</p>;
  }

  return (
    <div className="space-y-2.5">
      {sequences.map((s) => {
        const enrolled = s.totalEnrolled || 0;
        const completed = s.totalCompleted || 0;
        const completionRate = enrolled > 0 ? completed / enrolled : 0;
        return (
          <div key={s.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[12px] font-medium text-foreground truncate">{s.name}</span>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                  s.status === "active" ? "bg-green-500/10 text-green-600" :
                  s.status === "paused" ? "bg-amber-500/10 text-amber-600" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {s.status}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {completed}/{enrolled} ({formatPct(completionRate)})
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.max(completionRate * 100, enrolled > 0 ? 2 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Analytics Page ─── */

export function AnalyticsPageClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          setData(await res.json());
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Build chart data from daily events ──
  const { sendChart, openChart, clickChart, growthChart } = useMemo(() => {
    if (!data) return { sendChart: [], openChart: [], clickChart: [], growthChart: [] };

    // Fill 30 days
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const eventsByDate: Record<string, Record<string, number>> = {};
    for (const ev of data.dailyEvents) {
      if (!eventsByDate[ev.date]) eventsByDate[ev.date] = {};
      eventsByDate[ev.date][ev.eventType] = ev.eventCount;
    }

    const contactsByDate: Record<string, number> = {};
    for (const c of data.contactGrowth) {
      contactsByDate[c.date] = c.newContacts;
    }

    const sendChart = days.map((d) => ({
      label: formatDate(d),
      value: eventsByDate[d]?.sent || 0,
    }));

    const openChart = days.map((d) => ({
      label: formatDate(d),
      value: eventsByDate[d]?.opened || 0,
    }));

    const clickChart = days.map((d) => ({
      label: formatDate(d),
      value: eventsByDate[d]?.clicked || 0,
    }));

    const growthChart = days.map((d) => ({
      label: formatDate(d),
      value: contactsByDate[d] || 0,
    }));

    return { sendChart, openChart, clickChart, growthChart };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-[13px] text-muted-foreground">
        Failed to load analytics data.
      </div>
    );
  }

  const { overview } = data;
  const contactChange = calcChange(overview.contacts.newLast30d, overview.contacts.newPrev30d);

  // Recent 7d totals
  const recentMap: Record<string, number> = {};
  for (const ev of data.recentEventCounts) {
    recentMap[ev.eventType] = ev.eventCount;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Analytics</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Performance overview across all campaigns and sequences.
        </p>
      </div>

      {/* ── Top metrics ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Total contacts"
          value={formatNum(overview.contacts.total)}
          icon={Users}
          change={contactChange}
          subtitle={`${overview.contacts.subscribed} subscribed`}
        />
        <MetricCard
          label="Emails sent"
          value={formatNum(overview.emails.totalSent)}
          icon={Send}
          subtitle={`${overview.campaigns.total} campaigns`}
        />
        <MetricCard
          label="Open rate"
          value={overview.emails.totalSent > 0 ? formatPct(overview.emails.openRate) : "—"}
          icon={Eye}
          subtitle={`${formatNum(overview.emails.totalOpened)} total opens`}
        />
        <MetricCard
          label="Click rate"
          value={overview.emails.totalSent > 0 ? formatPct(overview.emails.clickRate) : "—"}
          icon={MousePointerClick}
          subtitle={`${formatNum(overview.emails.totalClicked)} total clicks`}
        />
      </div>

      {/* ── Secondary metrics ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Delivery rate"
          value={overview.emails.totalSent > 0 ? formatPct(overview.emails.deliveryRate) : "—"}
          icon={TrendingUp}
        />
        <MetricCard
          label="Bounce rate"
          value={overview.emails.totalSent > 0 ? formatPct(overview.emails.bounceRate) : "—"}
          icon={ShieldAlert}
        />
        <MetricCard
          label="Active sequences"
          value={overview.sequences.active.toString()}
          icon={GitBranch}
          subtitle={`${formatNum(overview.sequences.totalEnrolled)} enrolled`}
        />
        <MetricCard
          label="Audiences"
          value={overview.lists.total.toString()}
          icon={Target}
          subtitle={`${formatNum(overview.lists.totalMembers)} members`}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sends chart */}
        <div className="rounded-lg border border-border bg-background p-4">
          <MiniBarChart data={sendChart} color="#6366f1" label="Emails sent — last 30 days" />
        </div>

        {/* Contact growth */}
        <div className="rounded-lg border border-border bg-background p-4">
          <MiniBarChart data={growthChart} color="#10b981" label="New contacts — last 30 days" />
        </div>

        {/* Opens chart */}
        <div className="rounded-lg border border-border bg-background p-4">
          <MiniBarChart data={openChart} color="#3b82f6" label="Email opens — last 30 days" />
        </div>

        {/* Clicks chart */}
        <div className="rounded-lg border border-border bg-background p-4">
          <MiniBarChart data={clickChart} color="#f59e0b" label="Email clicks — last 30 days" />
        </div>
      </div>

      {/* ── Funnel + Enrollment status ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Engagement funnel
          </p>
          <EngagementFunnel
            sent={overview.emails.totalSent}
            delivered={overview.emails.totalDelivered}
            opened={overview.emails.totalOpened}
            clicked={overview.emails.totalClicked}
          />
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Sequence enrollments
          </p>
          <StatusDonut data={data.enrollmentStatuses} />
        </div>
      </div>

      {/* ── 7-day activity summary ── */}
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Last 7 days activity
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {[
            { label: "Sent", key: "sent", color: "#6366f1", icon: Send },
            { label: "Opened", key: "opened", color: "#3b82f6", icon: Eye },
            { label: "Clicked", key: "clicked", color: "#10b981", icon: MousePointerClick },
            { label: "Bounced", key: "bounced", color: "#ef4444", icon: ShieldAlert },
          ].map(({ label, key, color, icon: Icon }) => (
            <div key={key} className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: color + "15", color }}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[16px] font-semibold text-foreground tabular-nums">{recentMap[key] || 0}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Campaign performance table ── */}
      <div className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] font-semibold text-foreground">Campaign performance</span>
          </div>
        </div>
        <CampaignTable campaigns={data.topCampaigns} />
      </div>

      {/* ── Sequence performance ── */}
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="mb-4 flex items-center gap-2">
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12px] font-semibold text-foreground">Sequence performance</span>
        </div>
        <SequenceTable sequences={data.topSequences} />
      </div>
    </div>
  );
}
