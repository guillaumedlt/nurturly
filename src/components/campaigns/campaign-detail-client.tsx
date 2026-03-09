"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Zap,
  GitBranch,
  ListFilter,
  ChevronDown,
  Check,
  Search,
  X,
} from "lucide-react";

/* ─── Types ─── */

interface CampaignData {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "completed" | "archived";
  startDate: string | null;
  endDate: string | null;
  transactional: { id: string; name: string; status: string; totalSent: number | null; totalOpened: number | null }[];
  sequences: { id: string; name: string; status: string; totalEnrolled: number | null }[];
  audiences: { id: string; name: string; contactCount: number }[];
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

      // Build available items (exclude already added)
      const addedTransIds = new Set(data.transactional.map((t) => t.id));
      const addedSeqIds = new Set(data.sequences.map((s) => s.id));
      const addedAudIds = new Set(data.audiences.map((a) => a.id));

      if (transRes.ok) {
        const d = await transRes.json();
        const all = d.campaigns || [];
        setAvailableTransactional(
          all.filter((c: { id: string }) => !addedTransIds.has(c.id)).map((c: { id: string; name: string; status: string }) => ({
            id: c.id,
            name: c.name,
            subtitle: c.status,
          }))
        );
      }

      if (seqRes.ok) {
        const d = await seqRes.json();
        const all = d.sequences || [];
        setAvailableSequences(
          all.filter((s: { id: string }) => !addedSeqIds.has(s.id)).map((s: { id: string; name: string; status: string }) => ({
            id: s.id,
            name: s.name,
            subtitle: s.status,
          }))
        );
      }

      if (listsRes.ok) {
        const d = await listsRes.json();
        const all = Array.isArray(d) ? d : d.lists || [];
        setAvailableAudiences(
          all.filter((l: { id: string }) => !addedAudIds.has(l.id)).map((l: { id: string; name: string; contactCount: number }) => ({
            id: l.id,
            name: l.name,
            subtitle: `${l.contactCount} contacts`,
          }))
        );
      }
    } catch {
      router.push("/campaigns");
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

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
    await fetch(`/api/marketing-campaigns/${campaign.id}/items?itemId=${itemDbId}`, {
      method: "DELETE",
    });
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
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-[15px] font-semibold text-foreground hover:text-muted-foreground transition-colors tracking-[-0.02em]"
              >
                {campaign.name}
              </button>
            )}

            {/* Status dropdown */}
            <StatusDropdown status={campaign.status} onChange={updateStatus} />
          </div>

          {/* Description */}
          {editingDesc ? (
            <div className="mt-1 flex items-center gap-2">
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
            <button
              type="button"
              onClick={() => setEditingDesc(true)}
              className="mt-0.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {campaign.description || "Add a description..."}
            </button>
          )}
        </div>
      </div>

      {/* Transactional emails section */}
      <ItemSection
        title="Transactional Emails"
        icon={Zap}
        iconColor="#8b5cf6"
        items={campaign.transactional.map((t) => ({
          id: t.id,
          name: t.name,
          href: `/transactional/${t.id}`,
          status: t.status,
          meta: t.totalSent ? `${t.totalSent} sent` : undefined,
        }))}
        onRemove={removeItem}
        addPicker={
          <AddItemPicker
            options={availableTransactional}
            onAdd={(id) => addItem("transactional", id)}
            placeholder="Search emails..."
          />
        }
        emptyText="No transactional emails added"
      />

      {/* Sequences section */}
      <ItemSection
        title="Sequences"
        icon={GitBranch}
        iconColor="#3b82f6"
        items={campaign.sequences.map((s) => ({
          id: s.id,
          name: s.name,
          href: `/sequences/${s.id}`,
          status: s.status,
          meta: s.totalEnrolled ? `${s.totalEnrolled} enrolled` : undefined,
        }))}
        onRemove={removeItem}
        addPicker={
          <AddItemPicker
            options={availableSequences}
            onAdd={(id) => addItem("sequence", id)}
            placeholder="Search sequences..."
          />
        }
        emptyText="No sequences added"
      />

      {/* Audiences section */}
      <ItemSection
        title="Audiences"
        icon={ListFilter}
        iconColor="#10b981"
        items={campaign.audiences.map((a) => ({
          id: a.id,
          name: a.name,
          href: `/lists/${a.id}`,
          meta: `${a.contactCount} contacts`,
        }))}
        onRemove={removeItem}
        addPicker={
          <AddItemPicker
            options={availableAudiences}
            onAdd={(id) => addItem("audience", id)}
            placeholder="Search audiences..."
          />
        }
        emptyText="No audiences added"
      />
    </div>
  );
}

/* ─── Status Dropdown ─── */

function StatusDropdown({
  status,
  onChange,
}: {
  status: string;
  onChange: (s: string) => void;
}) {
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
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${STATUS_COLORS[status]}`}
      >
        {status}
        <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-background p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); setOpen(false); }}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[12px] transition-colors ${
                status === s ? "bg-accent" : "hover:bg-muted/50"
              }`}
            >
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
  title,
  icon: Icon,
  iconColor,
  items,
  onRemove,
  addPicker,
  emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  items: {
    id: string;
    name: string;
    href: string;
    status?: string;
    meta?: string;
  }[];
  onRemove: (id: string) => void;
  addPicker: React.ReactNode;
  emptyText: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ backgroundColor: iconColor + "15", color: iconColor }}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-[12px] font-semibold text-foreground">{title}</span>
          <span className="text-[11px] text-muted-foreground">({items.length})</span>
        </div>
        {addPicker}
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="group flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/30">
              <Link href={item.href} className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[13px] font-medium text-foreground truncate hover:underline">
                  {item.name}
                </span>
                {item.status && (
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                    item.status === "active" || item.status === "sent" ? "bg-green-500/10 text-green-600" :
                    item.status === "scheduled" || item.status === "paused" ? "bg-amber-500/10 text-amber-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {item.status}
                  </span>
                )}
                {item.meta && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">{item.meta}</span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
