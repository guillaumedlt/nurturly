"use client";

import { useEffect, useState } from "react";
import {
  type LucideIcon,
  Send,
  Users,
  Eye,
  MousePointerClick,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  GitBranch,
  Mail,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  contacts: number;
  emailsSent: number;
  openRate: number;
  clickRate: number;
  activeCampaigns: number;
  activeSequences: number;
  recentActivity: {
    type: string;
    name: string;
    time: string;
  }[];
}

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change?: { value: string; positive: boolean };
  icon: LucideIcon;
}) {
  return (
    <div className="group rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-[24px] font-semibold tracking-tight text-foreground">{value}</p>
        {change && (
          <span className={`flex items-center text-[11px] ${change.positive ? "text-green-600" : "text-red-500"}`}>
            {change.positive ? <ArrowUpRight className="mr-0.5 h-3 w-3" /> : <ArrowDownRight className="mr-0.5 h-3 w-3" />}
            {change.value}
          </span>
        )}
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          const analytics = await res.json();
          setData({
            contacts: analytics.overview.contacts.total,
            emailsSent: analytics.overview.emails.totalSent,
            openRate: analytics.overview.emails.openRate,
            clickRate: analytics.overview.emails.clickRate,
            activeCampaigns: analytics.overview.campaigns.total,
            activeSequences: analytics.overview.sequences.active,
            recentActivity: [],
          });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Contacts"
          value={data ? formatNum(data.contacts) : "0"}
          icon={Users}
        />
        <MetricCard
          label="Emails sent"
          value={data ? formatNum(data.emailsSent) : "0"}
          icon={Send}
        />
        <MetricCard
          label="Open rate"
          value={data && data.emailsSent > 0 ? formatPct(data.openRate) : "—"}
          icon={Eye}
        />
        <MetricCard
          label="Click rate"
          value={data && data.emailsSent > 0 ? formatPct(data.clickRate) : "—"}
          icon={MousePointerClick}
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/campaigns"
          className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/30"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground">Campaigns</p>
            <p className="text-[11px] text-muted-foreground">{data?.activeCampaigns || 0} total</p>
          </div>
        </Link>
        <Link
          href="/sequences"
          className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/30"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground">Sequences</p>
            <p className="text-[11px] text-muted-foreground">{data?.activeSequences || 0} active</p>
          </div>
        </Link>
        <Link
          href="/analytics"
          className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/30"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground">Analytics</p>
            <p className="text-[11px] text-muted-foreground">Full dashboard</p>
          </div>
        </Link>
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
