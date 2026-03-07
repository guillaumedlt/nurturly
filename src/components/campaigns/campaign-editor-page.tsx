"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Users,
  Calendar,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { EmailEditor } from "@/components/editor/email-editor";
import { StatusBadge } from "@/components/shared/status-badge";
import { renderEmailHtml } from "@/lib/editor/render-html";

interface CampaignData {
  id: string;
  name: string;
  subject: string | null;
  editorContent: string | null;
  htmlContent: string | null;
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

interface ListOption {
  id: string;
  name: string;
  contactCount: number;
}

interface CampaignEditorPageProps {
  campaignId: string;
}

export function CampaignEditorPage({ campaignId }: CampaignEditorPageProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [lists, setLists] = useState<ListOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Local state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [listId, setListId] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [editingName, setEditingName] = useState(false);

  const contentRef = useRef(editorContent);
  contentRef.current = editorContent;

  const isSent = campaign?.status === "sent" || campaign?.status === "cancelled";

  // Load campaign + lists
  useEffect(() => {
    async function load() {
      try {
        const [campaignRes, listsRes] = await Promise.all([
          fetch(`/api/campaigns/${campaignId}`),
          fetch("/api/lists"),
        ]);

        if (!campaignRes.ok) {
          router.push("/campaigns");
          return;
        }

        const campaignData: CampaignData = await campaignRes.json();
        setCampaign(campaignData);
        setName(campaignData.name);
        setSubject(campaignData.subject || "");
        setListId(campaignData.listId || "");
        setEditorContent(
          campaignData.editorContent ||
            JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] })
        );

        if (listsRes.ok) {
          const listsData = await listsRes.json();
          setLists(Array.isArray(listsData) ? listsData : listsData.lists || listsData);
        }
      } catch {
        router.push("/campaigns");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId, router]);

  // Save
  const save = useCallback(async () => {
    if (!campaign || isSent) return;
    setSaving(true);
    try {
      let htmlContent = "";
      try {
        const doc = JSON.parse(contentRef.current);
        htmlContent = renderEmailHtml(doc, { subject });
      } catch {}

      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject,
          listId: listId || null,
          editorContent: contentRef.current,
          htmlContent,
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
  }, [campaign, isSent, name, subject, listId]);

  // Send
  const sendCampaign = useCallback(async () => {
    if (!campaign) return;

    // Save first
    await save();

    if (!subject.trim()) {
      alert("Please add a subject line before sending.");
      return;
    }
    if (!listId) {
      alert("Please select an audience list before sending.");
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
  }, [campaign, save, subject, listId]);

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

  const selectedList = lists.find((l) => l.id === listId);

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
              <button
                type="button"
                onClick={sendCampaign}
                disabled={sending}
                className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-4 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-muted/30">
        <div className="mx-auto max-w-[800px] px-4 py-6 sm:px-6">
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

          {/* Subject & preheader */}
          <div className="mb-5 space-y-2">
            <SectionLabel label="Content" />
            <div className="flex items-center gap-3">
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground w-20 shrink-0">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line"
                disabled={isSent}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-[14px] outline-none transition-colors focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Editor */}
          {!isSent ? (
            <EmailEditor content={editorContent} onUpdate={setEditorContent} />
          ) : (
            <div className="rounded-lg border border-border bg-white p-8">
              <div className="mx-auto max-w-[600px] text-[13px] text-muted-foreground">
                <p>Email content was sent to {campaign.totalRecipients.toLocaleString()} recipients.</p>
              </div>
            </div>
          )}

          {/* Audience */}
          <div className="mt-6 space-y-3">
            <SectionLabel label="Audience" icon={<Users className="h-3.5 w-3.5" />} />
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground w-20 shrink-0">
                  List
                </label>
                {isSent ? (
                  <span className="text-[13px] text-foreground">
                    {selectedList?.name || "—"} ({campaign.totalRecipients.toLocaleString()} contacts)
                  </span>
                ) : (
                  <div className="flex flex-1 items-center gap-3">
                    <select
                      value={listId}
                      onChange={(e) => setListId(e.target.value)}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-[13px] outline-none transition-colors focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Select a list...</option>
                      {lists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name} ({list.contactCount} contacts)
                        </option>
                      ))}
                    </select>
                    {selectedList && (
                      <span className="text-[12px] text-muted-foreground shrink-0">
                        {selectedList.contactCount.toLocaleString()} contacts
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({
  label,
  icon,
}: {
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
      {icon}
      {label}
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
