"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Zap,
  GitBranch,
  ListFilter,
  Users,
  Send,
  Eye,
  MousePointerClick,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
  Plus,
  ChevronRight,
} from "lucide-react";

/* --- Types --- */

interface HubData {
  // Transactional
  transactional: {
    total: number;
    sent: number;
    draft: number;
    recent: { id: string; name: string; status: string; totalSent: number; sentAt: string | null }[];
  };
  // Sequences
  sequences: {
    total: number;
    active: number;
    totalEnrolled: number;
    recent: { id: string; name: string; status: string; totalEnrolled: number | null }[];
  };
  // Audiences
  audiences: {
    total: number;
    totalContacts: number;
    recent: { id: string; name: string; contactCount: number }[];
  };
  // Combined metrics
  metrics: {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    openRate: number;
    clickRate: number;
  };
}

/* --- Components --- */

function MetricCard({
  label,
  value,
  icon: Icon,
  change,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  change?: { value: string; positive: boolean } | null;
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
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  iconColor,
  href,
  createHref,
  createLabel,
  stat,
  statLabel,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  href: string;
  createHref: string;
  createLabel: string;
  stat: number;
  statLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: iconColor + "15", color: iconColor }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
            <p className="text-[11px] text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground tabular-nums">
            {stat} {statLabel}
          </span>
          <Link
            href={createHref}
            className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Plus className="h-3 w-3" />
            {createLabel}
          </Link>
        </div>
      </div>

      {children}

      <div className="border-t border-border px-4 py-2">
        <Link
          href={href}
          className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
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

/* --- Main --- */

export function CampaignsHubClient() {
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch all data in parallel
        const [analyticsRes, campaignsRes, sequencesRes, listsRes] = await Promise.all([
          fetch("/api/analytics"),
          fetch("/api/campaigns"),
          fetch("/api/sequences"),
          fetch("/api/lists"),
        ]);

        const analytics = analyticsRes.ok ? await analyticsRes.json() : null;
        const campaignsData = campaignsRes.ok ? await campaignsRes.json() : null;
        const sequencesData = sequencesRes.ok ? await sequencesRes.json() : null;
        const listsData = listsRes.ok ? await listsRes.json() : null;

        const campaigns = campaignsData?.campaigns || [];
        const sequences = sequencesData?.sequences || [];
        const lists = Array.isArray(listsData) ? listsData : listsData?.lists || [];

        setData({
          transactional: {
            total: campaigns.length,
            sent: campaigns.filter((c: { status: string }) => c.status === "sent").length,
            draft: campaigns.filter((c: { status: string }) => c.status === "draft").length,
            recent: campaigns.slice(0, 5),
          },
          sequences: {
            total: sequences.length,
            active: sequences.filter((s: { status: string }) => s.status === "active").length,
            totalEnrolled: analytics?.overview?.sequences?.totalEnrolled || 0,
            recent: sequences.slice(0, 5),
          },
          audiences: {
            total: lists.length,
            totalContacts: lists.reduce((acc: number, l: { contactCount: number }) => acc + (l.contactCount || 0), 0),
            recent: lists.slice(0, 5),
          },
          metrics: {
            totalSent: analytics?.overview?.emails?.totalSent || 0,
            totalOpened: analytics?.overview?.emails?.totalOpened || 0,
            totalClicked: analytics?.overview?.emails?.totalClicked || 0,
            openRate: analytics?.overview?.emails?.openRate || 0,
            clickRate: analytics?.overview?.emails?.clickRate || 0,
          },
        });
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

  if (!data) {
    return (
      <div className="py-20 text-center text-[13px] text-muted-foreground">
        Failed to load data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Campaigns</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Overview of all your marketing channels — transactional emails, sequences, and audiences.
        </p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Total sent"
          value={formatNum(data.metrics.totalSent)}
          icon={Send}
        />
        <MetricCard
          label="Open rate"
          value={data.metrics.totalSent > 0 ? formatPct(data.metrics.openRate) : "\u2014"}
          icon={Eye}
        />
        <MetricCard
          label="Click rate"
          value={data.metrics.totalSent > 0 ? formatPct(data.metrics.clickRate) : "\u2014"}
          icon={MousePointerClick}
        />
        <MetricCard
          label="Total contacts"
          value={formatNum(data.audiences.totalContacts)}
          icon={Users}
        />
      </div>

      {/* Transactional emails section */}
      <SectionCard
        title="Transactional Emails"
        description="One-off newsletters and broadcast emails"
        icon={Zap}
        iconColor="#8b5cf6"
        href="/transactional"
        createHref="/transactional/new"
        createLabel="New"
        stat={data.transactional.total}
        statLabel="total"
      >
        {data.transactional.recent.length > 0 ? (
          <div className="divide-y divide-border">
            {data.transactional.recent.map((item) => (
              <Link
                key={item.id}
                href={`/transactional/${item.id}`}
                className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] font-medium text-foreground truncate">{item.name}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                    item.status === "sent" ? "bg-green-500/10 text-green-600" :
                    item.status === "scheduled" ? "bg-blue-500/10 text-blue-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {item.status}
                  </span>
                </div>
                {item.totalSent > 0 && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatNum(item.totalSent)} sent
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
            No transactional emails yet
          </div>
        )}
      </SectionCard>

      {/* Sequences section */}
      <SectionCard
        title="Sequences"
        description="Automated email workflows and drip campaigns"
        icon={GitBranch}
        iconColor="#3b82f6"
        href="/sequences"
        createHref="/sequences/new"
        createLabel="New"
        stat={data.sequences.active}
        statLabel="active"
      >
        {data.sequences.recent.length > 0 ? (
          <div className="divide-y divide-border">
            {data.sequences.recent.map((seq) => (
              <Link
                key={seq.id}
                href={`/sequences/${seq.id}`}
                className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] font-medium text-foreground truncate">{seq.name}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                    seq.status === "active" ? "bg-green-500/10 text-green-600" :
                    seq.status === "paused" ? "bg-amber-500/10 text-amber-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {seq.status}
                  </span>
                </div>
                {(seq.totalEnrolled || 0) > 0 && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatNum(seq.totalEnrolled || 0)} enrolled
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
            No sequences yet
          </div>
        )}
      </SectionCard>

      {/* Audiences section */}
      <SectionCard
        title="Audiences"
        description="Contact lists and segments for targeting"
        icon={ListFilter}
        iconColor="#10b981"
        href="/lists"
        createHref="/lists"
        createLabel="New"
        stat={data.audiences.total}
        statLabel="audiences"
      >
        {data.audiences.recent.length > 0 ? (
          <div className="divide-y divide-border">
            {data.audiences.recent.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/30"
              >
                <span className="text-[13px] font-medium text-foreground truncate">{list.name}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {formatNum(list.contactCount)} contacts
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
            No audiences yet
          </div>
        )}
      </SectionCard>
    </div>
  );
}
