"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Trash2, Loader2, Zap, Search } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FolderNav, MoveToFolderDropdown, type Folder } from "@/components/shared/folder-nav";

interface TransactionalRow {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  emailName: string | null;
  listName: string | null;
  totalRecipients: number;
  totalSent: number;
  totalOpened: number;
  scheduledAt: string | null;
  sentAt: string | null;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = "" | "draft" | "scheduled" | "sent";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Sent", value: "sent" },
];

export function TransactionalPageClient() {
  const [items, setItems] = useState<TransactionalRow[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [itemsRes, foldersRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/folders?entityType=transactional"),
      ]);
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data.campaigns);
      }
      if (foldersRes.ok) {
        const data = await foldersRes.json();
        setFolders(data.folders);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    let result = items;
    if (activeFolderId !== null) {
      result = result.filter((c) => c.folderId === activeFolderId);
    }
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.emailName?.toLowerCase().includes(q) ||
          c.listName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, activeFolderId, statusFilter, search]);

  const createItem = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled email" }),
      });
      if (res.ok) {
        const item = await res.json();
        window.location.href = `/transactional/${item.id}`;
      }
    } finally {
      setCreating(false);
    }
  };

  const deleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this transactional email?")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((c) => c.id !== id));
  };

  const createFolder = async (name: string) => {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, entityType: "transactional" }),
    });
    if (res.ok) {
      const folder = await res.json();
      setFolders((prev) => [...prev, folder]);
    }
  };

  const renameFolder = async (id: string, name: string) => {
    const res = await fetch("/api/folders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
    if (res.ok) {
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    }
  };

  const deleteFolder = async (id: string) => {
    await fetch("/api/folders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setItems((prev) => prev.map((i) => (i.folderId === id ? { ...i, folderId: null } : i)));
    if (activeFolderId === id) setActiveFolderId(null);
  };

  const moveToFolder = async (itemId: string, folderId: string | null) => {
    await fetch("/api/folders/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, folderId, entityType: "transactional" }),
    });
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, folderId } : i)));
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
            Transactional
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Send newsletters and one-off emails to your audience.
          </p>
        </div>
        <button
          type="button"
          onClick={createItem}
          disabled={creating}
          className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          New email
        </button>
      </div>

      {items.length === 0 && folders.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No transactional emails yet"
          description="Create your first transactional email to start sending to your audience."
          actionLabel="Create email"
          onAction={createItem}
        />
      ) : (
        <>
          {/* Folders */}
          <FolderNav
            folders={folders}
            activeFolderId={activeFolderId}
            entityType="transactional"
            onSelect={setActiveFolderId}
            onCreate={createFolder}
            onRename={renameFolder}
            onDelete={deleteFolder}
          />

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search emails..."
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
                    Email
                  </th>
                  <th className="hidden px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground md:table-cell">
                    Audience
                  </th>
                  <th className="hidden px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground lg:table-cell">
                    Send date
                  </th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                      No emails match your filters
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => (window.location.href = `/transactional/${item.id}`)}
                      className="group h-[38px] cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-2">
                        <span className="text-[13px] font-medium text-foreground">
                          {item.name}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="hidden px-4 py-2 sm:table-cell">
                        <span className="text-[13px] text-muted-foreground">
                          {item.emailName || "\u2014"}
                        </span>
                      </td>
                      <td className="hidden px-4 py-2 md:table-cell">
                        <span className="text-[13px] text-muted-foreground">
                          {item.listName || "\u2014"}
                        </span>
                      </td>
                      <td className="hidden px-4 py-2 lg:table-cell">
                        <span className="text-[12px] text-muted-foreground">
                          {item.sentAt
                            ? `Sent ${formatRelativeDate(item.sentAt)}`
                            : item.scheduledAt
                              ? new Date(item.scheduledAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "\u2014"}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <MoveToFolderDropdown
                            folders={folders}
                            currentFolderId={item.folderId}
                            onMove={(folderId) => moveToFolder(item.id, folderId)}
                          />
                          <button
                            type="button"
                            onClick={(e) => deleteItem(item.id, e)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
