"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Trash2, Loader2, GitBranch, Search, Copy } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FolderNav, MoveToFolderDropdown, type Folder } from "@/components/shared/folder-nav";

interface SequenceRow {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "archived";
  totalEnrolled: number;
  totalCompleted: number;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = "" | "draft" | "active" | "paused";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
];

export function SequencesPageClient() {
  const [sequences, setSequences] = useState<SequenceRow[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [seqRes, foldersRes] = await Promise.all([
        fetch("/api/sequences"),
        fetch("/api/folders?entityType=sequence"),
      ]);
      if (seqRes.ok) {
        const data = await seqRes.json();
        setSequences(data.sequences);
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
    let result = sequences;
    if (activeFolderId !== null) {
      result = result.filter((s) => s.folderId === activeFolderId);
    }
    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }
    return result;
  }, [sequences, activeFolderId, statusFilter, search]);

  const createSequence = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled sequence" }),
      });
      if (res.ok) {
        const sequence = await res.json();
        window.location.href = `/sequences/${sequence.id}`;
      }
    } finally {
      setCreating(false);
    }
  };

  const cloneSequence = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const srcRes = await fetch(`/api/sequences/${id}`);
      if (!srcRes.ok) return;
      const src = await srcRes.json();

      const res = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${name} (copy)`,
          workflowData: src.workflowData,
        }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch {}
  };

  const deleteSequence = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this sequence?")) return;
    await fetch(`/api/sequences/${id}`, { method: "DELETE" });
    setSequences((prev) => prev.filter((s) => s.id !== id));
  };

  const createFolder = async (name: string) => {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, entityType: "sequence" }),
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
    setSequences((prev) => prev.map((s) => (s.folderId === id ? { ...s, folderId: null } : s)));
    if (activeFolderId === id) setActiveFolderId(null);
  };

  const moveToFolder = async (itemId: string, folderId: string | null) => {
    await fetch("/api/folders/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, folderId, entityType: "sequence" }),
    });
    setSequences((prev) => prev.map((s) => (s.id === itemId ? { ...s, folderId } : s)));
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
            Sequences
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Automated multi-step email flows for nurturing.
          </p>
        </div>
        <button
          type="button"
          onClick={createSequence}
          disabled={creating}
          className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          New sequence
        </button>
      </div>

      {sequences.length === 0 && folders.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No sequences yet"
          description="Create automated email sequences to nurture your contacts over time."
          actionLabel="Create sequence"
          onAction={createSequence}
        />
      ) : (
        <>
          {/* Folders */}
          <FolderNav
            folders={folders}
            activeFolderId={activeFolderId}
            entityType="sequence"
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
                placeholder="Search sequences..."
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
                    Enrolled
                  </th>
                  <th className="hidden px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground md:table-cell">
                    Updated
                  </th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                      No sequences match your filters
                    </td>
                  </tr>
                ) : (
                  filtered.map((seq) => (
                    <tr
                      key={seq.id}
                      onClick={() => (window.location.href = `/sequences/${seq.id}`)}
                      className="group h-[38px] cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-2">
                        <span className="text-[13px] font-medium text-foreground">
                          {seq.name}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={seq.status} />
                      </td>
                      <td className="hidden px-4 py-2 sm:table-cell">
                        <span className="text-[13px] text-muted-foreground">
                          {seq.totalEnrolled ?? 0}
                        </span>
                      </td>
                      <td className="hidden px-4 py-2 md:table-cell">
                        <span className="text-[12px] text-muted-foreground">
                          {formatRelativeDate(seq.updatedAt)}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <MoveToFolderDropdown
                            folders={folders}
                            currentFolderId={seq.folderId}
                            onMove={(folderId) => moveToFolder(seq.id, folderId)}
                          />
                          <button
                            type="button"
                            onClick={(e) => cloneSequence(seq.id, seq.name, e)}
                            title="Duplicate"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => deleteSequence(seq.id, e)}
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
