"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Loader2, Send } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

interface CampaignRow {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  listName: string | null;
  totalRecipients: number;
  totalSent: number;
  totalOpened: number;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function CampaignsPageClient() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled campaign" }),
      });
      if (res.ok) {
        const campaign = await res.json();
        window.location.href = `/campaigns/${campaign.id}`;
      }
    } finally {
      setCreating(false);
    }
  };

  const deleteCampaign = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this campaign?")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            Campaigns
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Send newsletters and one-off emails to your audience.
          </p>
        </div>
        <button
          type="button"
          onClick={createCampaign}
          disabled={creating}
          className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          New campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No campaigns yet"
          description="Create your first campaign to start sending emails to your audience."
          actionLabel="Create campaign"
          onAction={createCampaign}
        />
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Status
                </th>
                <th className="hidden px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:table-cell">
                  Audience
                </th>
                <th className="hidden px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground md:table-cell">
                  Recipients
                </th>
                <th className="hidden px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground lg:table-cell">
                  Sent
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  onClick={() => (window.location.href = `/campaigns/${campaign.id}`)}
                  className="group h-[38px] cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-2">
                    <span className="text-[13px] font-medium text-foreground">
                      {campaign.name}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td className="hidden px-4 py-2 sm:table-cell">
                    <span className="text-[13px] text-muted-foreground">
                      {campaign.listName || "—"}
                    </span>
                  </td>
                  <td className="hidden px-4 py-2 md:table-cell">
                    <span className="font-stat text-[13px] text-muted-foreground">
                      {campaign.totalRecipients > 0
                        ? campaign.totalRecipients.toLocaleString()
                        : "—"}
                    </span>
                  </td>
                  <td className="hidden px-4 py-2 lg:table-cell">
                    <span className="text-[12px] text-muted-foreground">
                      {campaign.sentAt
                        ? formatRelativeDate(campaign.sentAt)
                        : "—"}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={(e) => deleteCampaign(campaign.id, e)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
