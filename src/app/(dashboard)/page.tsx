"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
  Plus,
  Megaphone,
  Zap,
  ListFilter,
  TrendingUp,
  ShieldAlert,
  Target,
  ChevronRight,
} from "lucide-react";

/* ── Types ── */

interface AnalyticsData {
  overview: {
    contacts: { total: number; subscribed: number; newLast30d: number; newPrev30d: number };
    emails: {
      totalSent: number; totalDelivered: number; totalOpened: number;
      totalClicked: number; totalBounced: number; totalRecipients: number;
      openRate: number; clickRate: number; bounceRate: number; deliveryRate: number;
    };
    campaigns: { total: number };
    sequences: { total: number; active: number; totalEnrolled: number; totalCompleted: number; completionRate: number };
    lists: { total: number; totalMembers: number };
  };
  topCampaigns: { id: string; name: string; status: string; totalSent: number | null; totalOpened: number | null; totalClicked: number | null; sentAt: string | null }[];
  topSequences: { id: string; name: string; status: string; totalEnrolled: number | null; totalCompleted: number | null }[];
  dailyEvents: { date: string; eventType: string; eventCount: number }[];
  contactGrowth: { date: string; newContacts: number }[];
}

interface RecentItem {
  id: string;
  name: string;
  type: "transactional" | "sequence" | "email" | "campaign";
  status?: string;
  updatedAt: string;
}

/* ── Utils ── */

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

function calcChange(current: number, previous: number): { value: string; positive: boolean } | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { value: "+100%", positive: true };
  const change = ((current - previous) / previous) * 100;
  return { value: `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`, positive: change >= 0 };
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const TYPE_META: Record<string, { icon: LucideIcon; color: string; bg: string; href: string }> = {
  transactional: { icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10", href: "/transactional" },
  sequence: { icon: GitBranch, color: "text-purple-500", bg: "bg-purple-500/10", href: "/sequences" },
  email: { icon: Mail, color: "text-blue-500", bg: "bg-blue-500/10", href: "/emails" },
  campaign: { icon: Megaphone, color: "text-green-500", bg: "bg-green-500/10", href: "/campaigns" },
};

const STATUS_DOT: Record<string, string> = {
  draft: "bg-muted-foreground/40",
  active: "bg-green-500",
  sent: "bg-blue-500",
  scheduled: "bg-amber-500",
  paused: "bg-amber-500",
  completed: "bg-blue-500",
};

/* ── Components ── */

function MetricCard({ label, value, change, icon: Icon, subtitle }: {
  label: string; value: string; icon: LucideIcon;
  change?: { value: string; positive: boolean } | null;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/20">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/40" strokeWidth={1.5} />
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

function MiniBarChart({ data, color, label }: {
  data: { label: string; value: number }[]; color: string; label: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <div className="flex items-end gap-[2px]" style={{ height: 64 }}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex-1 flex flex-col justify-end">
            <div
              className="w-full rounded-[2px] transition-all group-hover:opacity-70"
              style={{ height: `${Math.max((d.value / max) * 100, 3)}%`, backgroundColor: color, minHeight: 2 }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10">
              <div className="rounded-md bg-foreground px-2 py-1 text-[10px] text-background whitespace-nowrap shadow-lg">
                {d.label}: {d.value}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <span className="text-[9px] text-muted-foreground/50">{data[0]?.label}</span>
        <span className="text-[9px] text-muted-foreground/50">{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, description, href, color, bg }: {
  icon: LucideIcon; label: string; description: string; href: string; color: string; bg: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-border bg-background p-3.5 transition-all hover:border-border/80 hover:bg-muted/20 hover:shadow-sm"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
    </Link>
  );
}

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
    <div className="space-y-2.5">
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
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: step.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main ── */

export default function DashboardPage() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [analyticsRes, campaignsRes, seqRes, emailsRes, mcRes] = await Promise.all([
          fetch("/api/analytics"),
          fetch("/api/campaigns"),
          fetch("/api/sequences"),
          fetch("/api/emails"),
          fetch("/api/marketing-campaigns"),
        ]);

        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());

        // Build recent items from all sources
        const items: RecentItem[] = [];

        if (campaignsRes.ok) {
          const d = await campaignsRes.json();
          (d.campaigns || []).slice(0, 5).forEach((c: { id: string; name: string; status: string; updatedAt: string }) => {
            items.push({ id: c.id, name: c.name, type: "transactional", status: c.status, updatedAt: c.updatedAt });
          });
        }
        if (seqRes.ok) {
          const d = await seqRes.json();
          (d.sequences || []).slice(0, 5).forEach((s: { id: string; name: string; status: string; updatedAt: string }) => {
            items.push({ id: s.id, name: s.name, type: "sequence", status: s.status, updatedAt: s.updatedAt });
          });
        }
        if (emailsRes.ok) {
          const d = await emailsRes.json();
          (d.emails || []).slice(0, 5).forEach((e: { id: string; name: string; updatedAt: string }) => {
            items.push({ id: e.id, name: e.name, type: "email", updatedAt: e.updatedAt });
          });
        }
        if (mcRes.ok) {
          const d = await mcRes.json();
          (d.campaigns || []).slice(0, 5).forEach((c: { id: string; name: string; status: string; updatedAt: string }) => {
            items.push({ id: c.id, name: c.name, type: "campaign", status: c.status, updatedAt: c.updatedAt });
          });
        }

        items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setRecentItems(items.slice(0, 8));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { sendChart, growthChart } = useMemo(() => {
    if (!analytics) return { sendChart: [], growthChart: [] };
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const eventsByDate: Record<string, Record<string, number>> = {};
    for (const ev of analytics.dailyEvents) {
      if (!eventsByDate[ev.date]) eventsByDate[ev.date] = {};
      eventsByDate[ev.date][ev.eventType] = ev.eventCount;
    }

    const contactsByDate: Record<string, number> = {};
    for (const c of analytics.contactGrowth) {
      contactsByDate[c.date] = c.newContacts;
    }

    return {
      sendChart: days.map((d) => ({ label: formatDate(d), value: eventsByDate[d]?.sent || 0 })),
      growthChart: days.map((d) => ({ label: formatDate(d), value: contactsByDate[d] || 0 })),
    };
  }, [analytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const o = analytics?.overview;
  const contactChange = o ? calcChange(o.contacts.newLast30d, o.contacts.newPrev30d) : null;
  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const hasData = o && (o.contacts.total > 0 || o.emails.totalSent > 0 || o.sequences.total > 0);

  return (
    <div className="space-y-6">
      {/* ── Welcome ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">
            {getGreeting()}, {firstName}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{today}</p>
        </div>
        <Link
          href="/analytics"
          className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Full analytics
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ── Key metrics ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Contacts"
          value={o ? formatNum(o.contacts.total) : "0"}
          icon={Users}
          change={contactChange}
          subtitle={o ? `${o.contacts.subscribed} subscribed` : undefined}
        />
        <MetricCard
          label="Emails sent"
          value={o ? formatNum(o.emails.totalSent) : "0"}
          icon={Send}
          subtitle={o ? `${o.campaigns.total} transactional` : undefined}
        />
        <MetricCard
          label="Open rate"
          value={o && o.emails.totalSent > 0 ? formatPct(o.emails.openRate) : "—"}
          icon={Eye}
          subtitle={o && o.emails.totalSent > 0 ? `${formatNum(o.emails.totalOpened)} opens` : undefined}
        />
        <MetricCard
          label="Click rate"
          value={o && o.emails.totalSent > 0 ? formatPct(o.emails.clickRate) : "—"}
          icon={MousePointerClick}
          subtitle={o && o.emails.totalSent > 0 ? `${formatNum(o.emails.totalClicked)} clicks` : undefined}
        />
      </div>

      {/* ── Charts ── */}
      {hasData && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <MiniBarChart data={sendChart} color="#6366f1" label="Emails sent — 30 days" />
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <MiniBarChart data={growthChart} color="#10b981" label="New contacts — 30 days" />
          </div>
        </div>
      )}

      {/* ── Quick stats row ── */}
      {o && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Delivery rate"
            value={o.emails.totalSent > 0 ? formatPct(o.emails.deliveryRate) : "—"}
            icon={TrendingUp}
          />
          <MetricCard
            label="Bounce rate"
            value={o.emails.totalSent > 0 ? formatPct(o.emails.bounceRate) : "—"}
            icon={ShieldAlert}
          />
          <MetricCard
            label="Active sequences"
            value={o.sequences.active.toString()}
            icon={GitBranch}
            subtitle={`${formatNum(o.sequences.totalEnrolled)} enrolled`}
          />
          <MetricCard
            label="Audiences"
            value={o.lists.total.toString()}
            icon={Target}
            subtitle={`${formatNum(o.lists.totalMembers)} members`}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* ── Recent items ── */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Recently updated
              </span>
            </div>
            {recentItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-[13px] text-muted-foreground">
                  No items yet. Create your first email or sequence to get started.
                </p>
              </div>
            ) : (
              <div>
                {recentItems.map((item) => {
                  const meta = TYPE_META[item.type];
                  const Icon = meta.icon;
                  const itemHref = item.type === "transactional" ? `/transactional/${item.id}`
                    : item.type === "sequence" ? `/sequences/${item.id}`
                    : item.type === "email" ? `/emails/${item.id}`
                    : `/campaigns/${item.id}`;

                  return (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={itemHref}
                      className="group flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 transition-colors hover:bg-muted/20"
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${meta.bg} ${meta.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground truncate">{item.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground capitalize">{item.type}</span>
                          {item.status && (
                            <>
                              <span className="text-muted-foreground/30">·</span>
                              <div className="flex items-center gap-1">
                                <div className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[item.status] || "bg-muted-foreground/40"}`} />
                                <span className="text-[11px] text-muted-foreground">{item.status}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground/60">
                        {timeAgo(item.updatedAt)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Engagement funnel ── */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Engagement funnel
            </p>
            {o && o.emails.totalSent > 0 ? (
              <EngagementFunnel
                sent={o.emails.totalSent}
                delivered={o.emails.totalDelivered}
                opened={o.emails.totalOpened}
                clicked={o.emails.totalClicked}
              />
            ) : (
              <p className="py-6 text-center text-[12px] text-muted-foreground">
                Send your first email to see the funnel
              </p>
            )}
          </div>

          {/* Sequence progress */}
          {analytics && analytics.topSequences.length > 0 && (
            <div className="mt-3 rounded-lg border border-border bg-background p-4">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Sequence progress
              </p>
              <div className="space-y-3">
                {analytics.topSequences.slice(0, 4).map((s) => {
                  const enrolled = s.totalEnrolled || 0;
                  const completed = s.totalCompleted || 0;
                  const rate = enrolled > 0 ? completed / enrolled : 0;
                  return (
                    <div key={s.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-foreground truncate max-w-[60%]">{s.name}</span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {completed}/{enrolled}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-purple-500 transition-all"
                          style={{ width: `${Math.max(rate * 100, enrolled > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Quick actions
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            icon={Megaphone}
            label="Campaigns"
            description={`${o?.campaigns.total || 0} total`}
            href="/campaigns"
            color="text-green-500"
            bg="bg-green-500/10"
          />
          <QuickAction
            icon={Zap}
            label="Transactional"
            description="Send one-off emails"
            href="/transactional"
            color="text-amber-500"
            bg="bg-amber-500/10"
          />
          <QuickAction
            icon={GitBranch}
            label="Sequences"
            description={`${o?.sequences.active || 0} active`}
            href="/sequences"
            color="text-purple-500"
            bg="bg-purple-500/10"
          />
          <QuickAction
            icon={ListFilter}
            label="Audiences"
            description={`${o?.lists.total || 0} lists`}
            href="/lists"
            color="text-blue-500"
            bg="bg-blue-500/10"
          />
        </div>
      </div>
    </div>
  );
}
