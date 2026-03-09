"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Loader2,
  Trash2,
  Search,
  Megaphone,
  Zap,
  GitBranch,
  ListFilter,
  ChevronRight,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";

interface CampaignRow {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "completed" | "archived";
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  items: {
    transactional: number;
    sequence: number;
    audience: number;
  };
}

type StatusFilter = "" | "draft" | "active" | "completed" | "archived";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-500/10 text-green-600",
  completed: "bg-blue-500/10 text-blue-600",
  archived: "bg-muted text-muted-foreground",
};

export function CampaignsHubClient() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing-campaigns");
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

  const filtered = useMemo(() => {
    let result = campaigns;
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [campaigns, statusFilter, search]);

  const createCampaign = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/marketing-campaigns", {
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
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this campaign?")) return;
    await fetch(`/api/marketing-campaigns/${id}`, { method: "DELETE" });
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            Campaigns
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Organize sequences, transactional emails, and audiences into campaigns.
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
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first campaign to group sequences, emails, and audiences together."
          actionLabel="Create campaign"
          onAction={createCampaign}
        />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns..."
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-[12px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                    statusFilter === f.value
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

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
                    Items
                  </th>
                  <th className="hidden px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground md:table-cell">
                    Updated
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                      No campaigns match your filters
                    </td>
                  </tr>
                ) : (
                  filtered.map((campaign) => {
                    const totalItems = campaign.items.transactional + campaign.items.sequence + campaign.items.audience;
                    return (
                      <tr
                        key={campaign.id}
                        onClick={() => (window.location.href = `/campaigns/${campaign.id}`)}
                        className="group h-[42px] cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-2">
                          <div>
                            <span className="text-[13px] font-medium text-foreground">
                              {campaign.name}
                            </span>
                            {campaign.description && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-[250px]">
                                {campaign.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[campaign.status]}`}>
                            {campaign.status}
                          </span>
                        </td>
                        <td className="hidden px-4 py-2 sm:table-cell">
                          <div className="flex items-center gap-3">
                            {campaign.items.transactional > 0 && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Zap className="h-3 w-3" />
                                {campaign.items.transactional}
                              </span>
                            )}
                            {campaign.items.sequence > 0 && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <GitBranch className="h-3 w-3" />
                                {campaign.items.sequence}
                              </span>
                            )}
                            {campaign.items.audience > 0 && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <ListFilter className="h-3 w-3" />
                                {campaign.items.audience}
                              </span>
                            )}
                            {totalItems === 0 && (
                              <span className="text-[11px] text-muted-foreground/50">No items</span>
                            )}
                          </div>
                        </td>
                        <td className="hidden px-4 py-2 md:table-cell">
                          <span className="text-[12px] text-muted-foreground">
                            {formatRelativeDate(campaign.updatedAt)}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
