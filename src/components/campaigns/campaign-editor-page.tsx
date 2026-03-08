"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Users,
  Mail,
  BarChart3,
  Eye,
  ExternalLink,
  Clock,
  ChevronDown,
  Check,
  Search,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";

/* ─── Custom Dropdown ─── */
interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
}

function Dropdown({
  value,
  onChange,
  options,
  placeholder,
  searchable = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder: string;
  searchable?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.sublabel?.toLowerCase().includes(query.toLowerCase())
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
    if (open && searchable) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, searchable]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2.5 text-left text-[13px] transition-all disabled:opacity-60 ${
          open
            ? "border-ring ring-1 ring-ring"
            : "border-input hover:border-muted-foreground/30"
        }`}
      >
        {selected ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate font-medium text-foreground">{selected.label}</span>
            {selected.sublabel && (
              <span className="truncate text-[12px] text-muted-foreground">{selected.sublabel}</span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground/60">{placeholder}</span>
        )}
        <ChevronDown className={`ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-background shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          {searchable && (
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/40"
              />
            </div>
          )}
          <div className="max-h-[240px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                No results found
              </div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors ${
                    value === option.value
                      ? "bg-accent"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[13px] font-medium text-foreground">
                      {option.label}
                    </div>
                    {option.sublabel && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {option.sublabel}
                      </div>
                    )}
                  </div>
                  {value === option.value && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Types ─── */

interface CampaignData {
  id: string;
  name: string;
  emailId: string | null;
  subject: string | null;
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  listId: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
}

interface EmailOption {
  id: string;
  name: string;
  subject: string;
  updatedAt: string;
}

interface ListOption {
  id: string;
  name: string;
  contactCount: number;
}

interface CampaignEditorPageProps {
  campaignId: string;
}

/* ─── Main Component ─── */

export function CampaignEditorPage({ campaignId }: CampaignEditorPageProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [emailsList, setEmailsList] = useState<EmailOption[]>([]);
  const [lists, setLists] = useState<ListOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Local state
  const [name, setName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [listId, setListId] = useState("");
  const [editingName, setEditingName] = useState(false);

  // Scheduling
  const [sendMode, setSendMode] = useState<"now" | "scheduled">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Preview
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const isSent = campaign?.status === "sent" || campaign?.status === "cancelled";

  // Load campaign + emails + lists
  useEffect(() => {
    async function load() {
      try {
        const [campaignRes, emailsRes, listsRes] = await Promise.all([
          fetch(`/api/campaigns/${campaignId}`),
          fetch("/api/emails"),
          fetch("/api/lists"),
        ]);

        if (!campaignRes.ok) {
          router.push("/campaigns");
          return;
        }

        const campaignData: CampaignData = await campaignRes.json();
        setCampaign(campaignData);
        setName(campaignData.name);
        setEmailId(campaignData.emailId || "");
        setListId(campaignData.listId || "");

        if (campaignData.scheduledAt) {
          setSendMode("scheduled");
          const d = new Date(campaignData.scheduledAt);
          setScheduledDate(d.toISOString().split("T")[0]);
          setScheduledTime(d.toTimeString().slice(0, 5));
        }

        if (emailsRes.ok) {
          const data = await emailsRes.json();
          setEmailsList(data.emails || []);
        }

        if (listsRes.ok) {
          const data = await listsRes.json();
          setLists(Array.isArray(data) ? data : data.lists || data);
        }
      } catch {
        router.push("/campaigns");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId, router]);

  // Load preview when email changes
  useEffect(() => {
    if (!emailId) {
      setPreviewHtml(null);
      return;
    }
    async function loadPreview() {
      try {
        const res = await fetch(`/api/emails/${emailId}`);
        if (res.ok) {
          const data = await res.json();
          setPreviewHtml(data.htmlContent || null);
        }
      } catch {
        setPreviewHtml(null);
      }
    }
    loadPreview();
  }, [emailId]);

  // Compute scheduled datetime
  const getScheduledAt = useCallback(() => {
    if (sendMode !== "scheduled" || !scheduledDate || !scheduledTime) return null;
    return new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
  }, [sendMode, scheduledDate, scheduledTime]);

  // Save
  const save = useCallback(async () => {
    if (!campaign || isSent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          emailId: emailId || null,
          listId: listId || null,
          scheduledAt: getScheduledAt(),
          status: sendMode === "scheduled" && getScheduledAt() ? "scheduled" : "draft",
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setCampaign(updated);
        setLastSaved(new Date());
      }
    } finally {
      setSaving(false);
    }
  }, [campaign, isSent, name, emailId, listId, sendMode, getScheduledAt]);

  // Send now
  const sendCampaign = useCallback(async () => {
    if (!campaign) return;

    await save();

    if (!emailId) {
      alert("Please select an email before sending.");
      return;
    }
    if (!listId) {
      alert("Please select an audience before sending.");
      return;
    }
    if (!confirm("Send this campaign now? This action cannot be undone.")) return;

    setSending(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = await res.json();
        setCampaign(updated);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to send campaign");
      }
    } finally {
      setSending(false);
    }
  }, [campaign, save, emailId, listId]);

  // Cmd+S
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) return null;

  const selectedEmail = emailsList.find((e) => e.id === emailId);
  const selectedList = lists.find((l) => l.id === listId);

  // Min date = today
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar */}
      <div className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {editingName && !isSent ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                setEditingName(false);
                if (!name.trim()) setName("Untitled campaign");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditingName(false);
              }}
              className="h-8 w-60 rounded-md border border-input bg-background px-2.5 text-[14px] font-medium outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => !isSent && setEditingName(true)}
              className="text-[14px] font-medium text-foreground hover:text-muted-foreground transition-colors"
            >
              {name || "Untitled campaign"}
            </button>
          )}

          <StatusBadge status={campaign.status} />

          {lastSaved && !isSent && (
            <span className="text-[11px] text-muted-foreground/60">
              {saving ? "Saving..." : "Saved"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isSent && (
            <>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save
              </button>
              {sendMode === "now" ? (
                <button
                  type="button"
                  onClick={sendCampaign}
                  disabled={sending || !emailId || !listId}
                  className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-4 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Send now
                </button>
              ) : (
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !emailId || !listId || !scheduledDate || !scheduledTime}
                  className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-4 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Schedule
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-muted/30">
        <div className="mx-auto max-w-[640px] px-4 py-8 sm:px-6">
          {/* Stats banner for sent campaigns */}
          {campaign.status === "sent" && (
            <div className="mb-6 rounded-lg border border-border bg-background p-5">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                Campaign Results
                {campaign.sentAt && (
                  <span className="ml-auto normal-case tracking-normal font-normal">
                    Sent {new Date(campaign.sentAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <StatCard label="Sent" value={campaign.totalSent} />
                <StatCard label="Delivered" value={campaign.totalDelivered} />
                <StatCard
                  label="Opened"
                  value={campaign.totalOpened}
                  rate={
                    campaign.totalDelivered > 0
                      ? (campaign.totalOpened / campaign.totalDelivered) * 100
                      : 0
                  }
                />
                <StatCard
                  label="Clicked"
                  value={campaign.totalClicked}
                  rate={
                    campaign.totalDelivered > 0
                      ? (campaign.totalClicked / campaign.totalDelivered) * 100
                      : 0
                  }
                />
                <StatCard label="Bounced" value={campaign.totalBounced} />
              </div>
            </div>
          )}

          {/* Email selection */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              Email
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              {isSent ? (
                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-foreground">
                    {selectedEmail?.name || "—"}
                  </span>
                  {selectedEmail && (
                    <span className="text-[12px] text-muted-foreground">
                      Subject: {selectedEmail.subject || "—"}
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Dropdown
                    value={emailId}
                    onChange={setEmailId}
                    searchable
                    placeholder="Select an email..."
                    options={emailsList.map((e) => ({
                      value: e.id,
                      label: e.name,
                      sublabel: e.subject || "(no subject)",
                    }))}
                  />

                  {selectedEmail && (
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <span>Subject: <strong className="text-foreground">{selectedEmail.subject || "—"}</strong></span>
                      <div className="flex-1" />
                      <Link
                        href={`/emails/${selectedEmail.id}`}
                        target="_blank"
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Edit email
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  {emailsList.length === 0 && (
                    <div className="text-center py-3">
                      <p className="text-[13px] text-muted-foreground mb-2">No emails yet</p>
                      <Link
                        href="/emails"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        <Mail className="h-3 w-3" />
                        Create an email
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Audience selection */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Audience
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              {isSent ? (
                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-foreground">
                    {selectedList?.name || "—"}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {campaign.totalRecipients.toLocaleString()} recipients
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Dropdown
                    value={listId}
                    onChange={setListId}
                    placeholder="Select an audience..."
                    options={lists.map((l) => ({
                      value: l.id,
                      label: l.name,
                      sublabel: `${l.contactCount} contacts`,
                    }))}
                  />
                  {selectedList && (
                    <p className="text-[12px] text-muted-foreground">
                      {selectedList.contactCount.toLocaleString()} contacts will receive this campaign
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scheduling */}
          {!isSent && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Schedule
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                {/* Toggle */}
                <div className="mb-3 flex rounded-lg border border-border p-0.5">
                  <button
                    type="button"
                    onClick={() => setSendMode("now")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[12px] font-medium transition-colors ${
                      sendMode === "now"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Send className="h-3 w-3" />
                    Send now
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendMode("scheduled")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[12px] font-medium transition-colors ${
                      sendMode === "scheduled"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    Schedule
                  </button>
                </div>

                {sendMode === "now" ? (
                  <p className="text-[12px] text-muted-foreground">
                    Campaign will be sent immediately when you click "Send now".
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                          Date
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          min={today}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                          Time
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    </div>
                    {scheduledDate && scheduledTime && (
                      <p className="text-[12px] text-muted-foreground">
                        Scheduled for{" "}
                        <strong className="text-foreground">
                          {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          at{" "}
                          {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scheduled info for scheduled campaigns */}
          {campaign.status === "scheduled" && campaign.scheduledAt && (
            <div className="mb-4 rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-[13px]">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Scheduled for</span>
                <strong className="text-foreground">
                  {new Date(campaign.scheduledAt).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </div>
            </div>
          )}

          {/* Email preview */}
          {emailId && previewHtml && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPreview ? "Hide" : "Show"}
                </button>
              </div>
              {showPreview && (
                <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
                  <div className="flex items-center gap-1.5 border-b border-border bg-muted/30 px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-border" />
                    <div className="h-2 w-2 rounded-full bg-border" />
                    <div className="h-2 w-2 rounded-full bg-border" />
                    <span className="ml-2 text-[10px] text-muted-foreground/50">Preview</span>
                  </div>
                  <iframe
                    srcDoc={previewHtml}
                    title="Email preview"
                    className="w-full border-none"
                    style={{ height: 500, pointerEvents: "none" }}
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  rate,
}: {
  label: string;
  value: number;
  rate?: number;
}) {
  return (
    <div className="rounded-md bg-muted/50 p-3 text-center">
      <div className="font-stat text-[18px] font-semibold text-foreground">
        {value.toLocaleString()}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      {rate !== undefined && rate > 0 && (
        <div className="mt-0.5 font-stat text-[11px] text-muted-foreground">
          {rate.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
