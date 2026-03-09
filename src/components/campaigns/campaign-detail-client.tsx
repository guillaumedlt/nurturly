"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Zap,
  GitBranch,
  ListFilter,
  ChevronDown,
  Check,
  Search,
  X,
  Send,
  Eye,
  MousePointerClick,
  ShieldAlert,
  Users,
  BarChart3,
  type LucideIcon,
  ArrowUpRight,
} from "lucide-react";

/* ─── Types ─── */

interface TransactionalItem {
  id: string;
  name: string;
  status: string;
  totalSent: number | null;
  totalDelivered: number | null;
  totalOpened: number | null;
  totalClicked: number | null;
  totalBounced: number | null;
  totalRecipients: number | null;
  sentAt: string | null;
}

interface SequenceItem {
  id: string;
  name: string;
  status: string;
  totalEnrolled: number | null;
  totalCompleted: number | null;
}

interface AudienceItem {
  id: string;
  name: string;
  contactCount: number;
}

interface CampaignData {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "completed" | "archived";
  startDate: string | null;
  endDate: string | null;
  transactional: TransactionalItem[];
  sequences: SequenceItem[];
  audiences: AudienceItem[];
}

interface PickerOption {
  id: string;
  name: string;
  subtitle?: string;
}

const STATUS_OPTIONS = ["draft", "active", "completed", "archived"] as const;
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-500/10 text-green-600",
  completed: "bg-blue-500/10 text-blue-600",
  archived: "bg-muted text-muted-foreground",
};

type Tab = "overview" | "analytics";

/* ─── Utility ─── */

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/* ─── Add Item Picker ─── */

function AddItemPicker({
  options,
  onAdd,
  placeholder,
}: {
  options: PickerOption[];
  onAdd: (id: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? options.filter((o) =>
        o.name.toLowerCase().includes(query.toLowerCase()) ||
        o.subtitle?.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  if (options.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-7 items-center gap-1 rounded-md border border-dashed border-border px-2 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
        Add
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-background shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/40"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-center text-[12px] text-muted-foreground">
                No results
              </div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onAdd(option.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[13px] font-medium text-foreground">{option.name}</div>
                    {option.subtitle && (
                      <div className="truncate text-[11px] text-muted-foreground">{option.subtitle}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main ─── */

export function CampaignDetailClient({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Available items to add
  const [availableTransactional, setAvailableTransactional] = useState<PickerOption[]>([]);
  const [availableSequences, setAvailableSequences] = useState<PickerOption[]>([]);
  const [availableAudiences, setAvailableAudiences] = useState<PickerOption[]>([]);

  // Editing
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);

  const loadCampaign = useCallback(async () => {
    try {
      const [campaignRes, transRes, seqRes, listsRes] = await Promise.all([
        fetch(`/api/marketing-campaigns/${campaignId}`),
        fetch("/api/campaigns"),
        fetch("/api/sequences"),
        fetch("/api/lists"),
      ]);

      if (!campaignRes.ok) {
        router.push("/campaigns");
        return;
      }

      const data: CampaignData = await campaignRes.json();
      setCampaign(data);
      setName(data.name);
      setDescription(data.description || "");

      const addedTransIds = new Set(data.transactional.map((t) => t.id));
      const addedSeqIds = new Set(data.sequences.map((s) => s.id));
      const addedAudIds = new Set(data.audiences.map((a) => a.id));

      if (transRes.ok) {
        const d = await transRes.json();
        setAvailableTransactional(
          (d.campaigns || []).filter((c: { id: string }) => !addedTransIds.has(c.id)).map((c: { id: string; name: string; status: string }) => ({
            id: c.id, name: c.name, subtitle: c.status,
          }))
        );
      }
      if (seqRes.ok) {
        const d = await seqRes.json();
        setAvailableSequences(
          (d.sequences || []).filter((s: { id: string }) => !addedSeqIds.has(s.id)).map((s: { id: string; name: string; status: string }) => ({
            id: s.id, name: s.name, subtitle: s.status,
          }))
        );
      }
      if (listsRes.ok) {
        const d = await listsRes.json();
        const all = Array.isArray(d) ? d : d.lists || [];
        setAvailableAudiences(
          all.filter((l: { id: string }) => !addedAudIds.has(l.id)).map((l: { id: string; name: string; contactCount: number }) => ({
            id: l.id, name: l.name, subtitle: `${l.contactCount} contacts`,
          }))
        );
      }
    } catch {
      router.push("/campaigns");
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => { loadCampaign(); }, [loadCampaign]);

  const saveName = useCallback(async () => {
    if (!campaign) return;
    setSaving(true);
    try {
      await fetch(`/api/marketing-campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "Untitled campaign" }),
      });
    } finally {
      setSaving(false);
      setEditingName(false);
    }
  }, [campaign, name]);

  const saveDescription = useCallback(async () => {
    if (!campaign) return;
    await fetch(`/api/marketing-campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: description.trim() || null }),
    });
    setEditingDesc(false);
  }, [campaign, description]);

  const updateStatus = async (status: string) => {
    if (!campaign) return;
    const res = await fetch(`/api/marketing-campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setCampaign((prev) => prev ? { ...prev, status: status as CampaignData["status"] } : prev);
    }
  };

  const addItem = async (itemType: string, itemId: string) => {
    if (!campaign) return;
    const res = await fetch(`/api/marketing-campaigns/${campaign.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType, itemId }),
    });
    if (res.ok) {
      setLoading(true);
      await loadCampaign();
    }
  };

  const removeItem = async (itemDbId: string) => {
    if (!campaign) return;
    await fetch(`/api/marketing-campaigns/${campaign.id}/items?itemId=${itemDbId}`, { method: "DELETE" });
    setLoading(true);
    await loadCampaign();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/campaigns"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editingName ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
                className="h-8 w-72 rounded-md border border-input bg-background px-2.5 text-[15px] font-semibold outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            ) : (
              <button type="button" onClick={() => setEditingName(true)} className="text-[15px] font-semibold text-foreground hover:text-muted-foreground transition-colors tracking-[-0.02em]">
                {campaign.name}
              </button>
            )}
            <StatusDropdown status={campaign.status} onChange={updateStatus} />
          </div>
          {editingDesc ? (
            <div className="mt-1">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveDescription}
                onKeyDown={(e) => { if (e.key === "Enter") saveDescription(); }}
                placeholder="Add a description..."
                className="h-7 w-80 rounded-md border border-input bg-background px-2 text-[13px] outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                autoFocus
              />
            </div>
          ) : (
            <button type="button" onClick={() => setEditingDesc(true)} className="mt-0.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              {campaign.description || "Add a description..."}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {(["overview", "analytics"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-[13px] font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" ? (
        <OverviewTab
          campaign={campaign}
          availableTransactional={availableTransactional}
          availableSequences={availableSequences}
          availableAudiences={availableAudiences}
          onAddItem={addItem}
          onRemoveItem={removeItem}
        />
      ) : (
        <AnalyticsTab campaign={campaign} />
      )}
    </div>
  );
}

/* ─── Overview Tab ─── */

function OverviewTab({
  campaign,
  availableTransactional,
  availableSequences,
  availableAudiences,
  onAddItem,
  onRemoveItem,
}: {
  campaign: CampaignData;
  availableTransactional: PickerOption[];
  availableSequences: PickerOption[];
  availableAudiences: PickerOption[];
  onAddItem: (type: string, id: string) => void;
  onRemoveItem: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <ItemSection
        title="Transactional Emails"
        icon={Zap}
        iconColor="#8b5cf6"
        items={campaign.transactional.map((t) => ({
          id: t.id, name: t.name, href: `/transactional/${t.id}`, status: t.status,
          meta: t.totalSent ? `${t.totalSent} sent` : undefined,
        }))}
        onRemove={onRemoveItem}
        addPicker={<AddItemPicker options={availableTransactional} onAdd={(id) => onAddItem("transactional", id)} placeholder="Search emails..." />}
        emptyText="No transactional emails added"
      />
      <ItemSection
        title="Sequences"
        icon={GitBranch}
        iconColor="#3b82f6"
        items={campaign.sequences.map((s) => ({
          id: s.id, name: s.name, href: `/sequences/${s.id}`, status: s.status,
          meta: s.totalEnrolled ? `${s.totalEnrolled} enrolled` : undefined,
        }))}
        onRemove={onRemoveItem}
        addPicker={<AddItemPicker options={availableSequences} onAdd={(id) => onAddItem("sequence", id)} placeholder="Search sequences..." />}
        emptyText="No sequences added"
      />
      <ItemSection
        title="Audiences"
        icon={ListFilter}
        iconColor="#10b981"
        items={campaign.audiences.map((a) => ({
          id: a.id, name: a.name, href: `/lists/${a.id}`,
          meta: `${a.contactCount} contacts`,
        }))}
        onRemove={onRemoveItem}
        addPicker={<AddItemPicker options={availableAudiences} onAdd={(id) => onAddItem("audience", id)} placeholder="Search audiences..." />}
        emptyText="No audiences added"
      />
    </div>
  );
}

/* ─── Analytics Tab ─── */

function StatCard({ label, value, icon: Icon, subtitle }: {
  label: string; value: string; icon: LucideIcon; subtitle?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
      </div>
      <p className="mt-2 text-[24px] font-semibold tracking-tight text-foreground">{value}</p>
      {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function AnalyticsTab({ campaign }: { campaign: CampaignData }) {
  const stats = useMemo(() => {
    const totalSent = campaign.transactional.reduce((a, t) => a + (t.totalSent || 0), 0);
    const totalDelivered = campaign.transactional.reduce((a, t) => a + (t.totalDelivered || 0), 0);
    const totalOpened = campaign.transactional.reduce((a, t) => a + (t.totalOpened || 0), 0);
    const totalClicked = campaign.transactional.reduce((a, t) => a + (t.totalClicked || 0), 0);
    const totalBounced = campaign.transactional.reduce((a, t) => a + (t.totalBounced || 0), 0);
    const totalRecipients = campaign.transactional.reduce((a, t) => a + (t.totalRecipients || 0), 0);
    const totalEnrolled = campaign.sequences.reduce((a, s) => a + (s.totalEnrolled || 0), 0);
    const totalCompleted = campaign.sequences.reduce((a, s) => a + (s.totalCompleted || 0), 0);
    const totalContacts = campaign.audiences.reduce((a, a2) => a + (a2.contactCount || 0), 0);

    return {
      totalSent, totalDelivered, totalOpened, totalClicked, totalBounced, totalRecipients,
      totalEnrolled, totalCompleted, totalContacts,
      openRate: totalSent > 0 ? totalOpened / totalSent : 0,
      clickRate: totalSent > 0 ? totalClicked / totalSent : 0,
      bounceRate: totalSent > 0 ? totalBounced / totalSent : 0,
      deliveryRate: totalSent > 0 ? totalDelivered / totalSent : 0,
      completionRate: totalEnrolled > 0 ? totalCompleted / totalEnrolled : 0,
    };
  }, [campaign]);

  const hasTransactional = campaign.transactional.length > 0;
  const hasSequences = campaign.sequences.length > 0;
  const hasAudiences = campaign.audiences.length > 0;
  const hasData = hasTransactional || hasSequences;

  if (!hasData && !hasAudiences) {
    return (
      <div className="rounded-lg border border-border bg-background px-4 py-16 text-center">
        <BarChart3 className="mx-auto h-6 w-6 text-muted-foreground/30" />
        <p className="mt-3 text-[13px] text-muted-foreground">
          Add transactional emails, sequences, or audiences to see campaign analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Emails sent" value={formatNum(stats.totalSent)} icon={Send} subtitle={`${campaign.transactional.length} transactional`} />
        <StatCard label="Open rate" value={stats.totalSent > 0 ? formatPct(stats.openRate) : "\u2014"} icon={Eye} subtitle={`${formatNum(stats.totalOpened)} opens`} />
        <StatCard label="Click rate" value={stats.totalSent > 0 ? formatPct(stats.clickRate) : "\u2014"} icon={MousePointerClick} subtitle={`${formatNum(stats.totalClicked)} clicks`} />
        <StatCard label="Audience reach" value={formatNum(stats.totalContacts)} icon={Users} subtitle={`${campaign.audiences.length} audiences`} />
      </div>

      {/* Engagement funnel */}
      {hasTransactional && stats.totalSent > 0 && (
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Engagement funnel
          </p>
          <div className="space-y-3">
            {[
              { label: "Sent", value: stats.totalSent, color: "#6366f1" },
              { label: "Delivered", value: stats.totalDelivered, color: "#8b5cf6" },
              { label: "Opened", value: stats.totalOpened, color: "#3b82f6" },
              { label: "Clicked", value: stats.totalClicked, color: "#10b981" },
            ].map((step, i, arr) => {
              const pct = (step.value / Math.max(stats.totalSent, 1)) * 100;
              const dropOff = i > 0 ? ((arr[i - 1].value - step.value) / Math.max(arr[i - 1].value, 1)) * 100 : 0;
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
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: step.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Secondary metrics row */}
      {(hasTransactional || hasSequences) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {hasTransactional && (
            <>
              <StatCard label="Delivery rate" value={stats.totalSent > 0 ? formatPct(stats.deliveryRate) : "\u2014"} icon={Send} />
              <StatCard label="Bounce rate" value={stats.totalSent > 0 ? formatPct(stats.bounceRate) : "\u2014"} icon={ShieldAlert} />
            </>
          )}
          {hasSequences && (
            <>
              <StatCard label="Enrolled" value={formatNum(stats.totalEnrolled)} icon={GitBranch} subtitle={`${campaign.sequences.length} sequences`} />
              <StatCard label="Completion" value={stats.totalEnrolled > 0 ? formatPct(stats.completionRate) : "\u2014"} icon={Check} subtitle={`${formatNum(stats.totalCompleted)} completed`} />
            </>
          )}
        </div>
      )}

      {/* Per-asset breakdown: transactional emails */}
      {hasTransactional && (
        <div className="rounded-lg border border-border bg-background">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] font-semibold text-foreground">Transactional email performance</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sent</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Open rate</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Click rate</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Bounce</th>
                </tr>
              </thead>
              <tbody>
                {campaign.transactional.map((t) => {
                  const sent = t.totalSent || 0;
                  const or = sent > 0 ? (t.totalOpened || 0) / sent : 0;
                  const cr = sent > 0 ? (t.totalClicked || 0) / sent : 0;
                  const br = sent > 0 ? (t.totalBounced || 0) / sent : 0;
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`/transactional/${t.id}`} className="text-[12px] font-medium text-foreground hover:underline">{t.name}</Link>
                        <span className={`ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                          t.status === "sent" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                        }`}>{t.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[12px] tabular-nums text-foreground">{formatNum(sent)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`text-[12px] tabular-nums font-medium ${or > 0.25 ? "text-green-600" : or > 0.15 ? "text-foreground" : "text-amber-600"}`}>
                          {sent > 0 ? formatPct(or) : "\u2014"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`text-[12px] tabular-nums font-medium ${cr > 0.05 ? "text-green-600" : "text-foreground"}`}>
                          {sent > 0 ? formatPct(cr) : "\u2014"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`text-[12px] tabular-nums ${br > 0.05 ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                          {sent > 0 ? formatPct(br) : "\u2014"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-asset breakdown: sequences */}
      {hasSequences && (
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="mb-4 flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] font-semibold text-foreground">Sequence performance</span>
          </div>
          <div className="space-y-3">
            {campaign.sequences.map((s) => {
              const enrolled = s.totalEnrolled || 0;
              const completed = s.totalCompleted || 0;
              const rate = enrolled > 0 ? completed / enrolled : 0;
              return (
                <div key={s.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link href={`/sequences/${s.id}`} className="text-[12px] font-medium text-foreground truncate hover:underline">{s.name}</Link>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                        s.status === "active" ? "bg-green-500/10 text-green-600" :
                        s.status === "paused" ? "bg-amber-500/10 text-amber-600" :
                        "bg-muted text-muted-foreground"
                      }`}>{s.status}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {completed}/{enrolled} ({formatPct(rate)})
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.max(rate * 100, enrolled > 0 ? 2 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audiences summary */}
      {hasAudiences && (
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="mb-4 flex items-center gap-2">
            <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] font-semibold text-foreground">Audience reach</span>
          </div>
          <div className="space-y-2">
            {campaign.audiences.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <Link href={`/lists/${a.id}`} className="text-[12px] font-medium text-foreground hover:underline">{a.name}</Link>
                <span className="text-[12px] text-muted-foreground tabular-nums">{formatNum(a.contactCount)} contacts</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="text-[11px] font-medium text-muted-foreground">Total reach</span>
              <span className="text-[13px] font-semibold text-foreground tabular-nums">{formatNum(stats.totalContacts)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Status Dropdown ─── */

function StatusDropdown({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${STATUS_COLORS[status]}`}>
        {status}
        <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-background p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          {STATUS_OPTIONS.map((s) => (
            <button key={s} type="button" onClick={() => { onChange(s); setOpen(false); }} className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[12px] transition-colors ${status === s ? "bg-accent" : "hover:bg-muted/50"}`}>
              <span className="capitalize">{s}</span>
              {status === s && <Check className="h-3 w-3 text-foreground" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Item Section ─── */

function ItemSection({
  title, icon: Icon, iconColor, items, onRemove, addPicker, emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  items: { id: string; name: string; href: string; status?: string; meta?: string }[];
  onRemove: (id: string) => void;
  addPicker: React.ReactNode;
  emptyText: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: iconColor + "15", color: iconColor }}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-[12px] font-semibold text-foreground">{title}</span>
          <span className="text-[11px] text-muted-foreground">({items.length})</span>
        </div>
        {addPicker}
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="group flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/30">
              <Link href={item.href} className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[13px] font-medium text-foreground truncate hover:underline">{item.name}</span>
                {item.status && (
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                    item.status === "active" || item.status === "sent" ? "bg-green-500/10 text-green-600" :
                    item.status === "scheduled" || item.status === "paused" ? "bg-amber-500/10 text-amber-600" :
                    "bg-muted text-muted-foreground"
                  }`}>{item.status}</span>
                )}
                {item.meta && <span className="text-[11px] text-muted-foreground tabular-nums">{item.meta}</span>}
              </Link>
              <button type="button" onClick={() => onRemove(item.id)} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
