"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Trash2, Loader2, Mail, Search } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { FolderNav, MoveToFolderDropdown, type Folder } from "@/components/shared/folder-nav";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  folderId: string | null;
  updatedAt: string;
  createdAt: string;
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailTemplate[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [emailsRes, foldersRes] = await Promise.all([
        fetch("/api/emails"),
        fetch("/api/folders?entityType=email"),
      ]);
      if (emailsRes.ok) {
        const data = await emailsRes.json();
        setEmails(data.emails);
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
    let result = emails;
    if (activeFolderId !== null) {
      result = result.filter((e) => e.folderId === activeFolderId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q)
      );
    }
    return result;
  }, [emails, activeFolderId, search]);

  const createEmail = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled email" }),
      });
      if (res.ok) {
        const email = await res.json();
        window.location.href = `/emails/${email.id}`;
      }
    } finally {
      setCreating(false);
    }
  };

  const deleteEmail = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this email template?")) return;
    await fetch(`/api/emails/${id}`, { method: "DELETE" });
    setEmails((prev) => prev.filter((e) => e.id !== id));
  };

  const createFolder = async (name: string) => {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, entityType: "email" }),
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
    setEmails((prev) => prev.map((e) => (e.folderId === id ? { ...e, folderId: null } : e)));
    if (activeFolderId === id) setActiveFolderId(null);
  };

  const moveToFolder = async (itemId: string, folderId: string | null) => {
    await fetch("/api/folders/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, folderId, entityType: "email" }),
    });
    setEmails((prev) => prev.map((e) => (e.id === itemId ? { ...e, folderId } : e)));
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
            Emails
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {emails.length > 0
              ? `${emails.length} email${emails.length !== 1 ? "s" : ""}`
              : "Design and manage your email templates."}
          </p>
        </div>
        <button
          type="button"
          onClick={createEmail}
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

      {emails.length === 0 && folders.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No email templates"
          description="Create your first email template to start building beautiful emails."
          actionLabel="New email"
          onAction={createEmail}
        />
      ) : (
        <>
          {/* Folders */}
          <FolderNav
            folders={folders}
            activeFolderId={activeFolderId}
            entityType="email"
            onSelect={setActiveFolderId}
            onCreate={createFolder}
            onRename={renameFolder}
            onDelete={deleteFolder}
          />

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative max-w-[240px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search emails..."
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-[12px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Name
                  </th>
                  <th className="hidden px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:table-cell">
                    Subject
                  </th>
                  <th className="hidden px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground md:table-cell">
                    Updated
                  </th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                      No emails match your search
                    </td>
                  </tr>
                ) : (
                  filtered.map((email) => (
                    <tr
                      key={email.id}
                      onClick={() => (window.location.href = `/emails/${email.id}`)}
                      className="group h-[38px] cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-2">
                        <span className="text-[13px] font-medium text-foreground">
                          {email.name}
                        </span>
                      </td>
                      <td className="hidden px-4 py-2 sm:table-cell">
                        <span className="text-[13px] text-muted-foreground">
                          {email.subject || "—"}
                        </span>
                      </td>
                      <td className="hidden px-4 py-2 md:table-cell">
                        <span className="text-[12px] text-muted-foreground">
                          {formatRelativeDate(email.updatedAt)}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <MoveToFolderDropdown
                            folders={folders}
                            currentFolderId={email.folderId}
                            onMove={(folderId) => moveToFolder(email.id, folderId)}
                          />
                          <button
                            type="button"
                            onClick={(e) => deleteEmail(email.id, e)}
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
