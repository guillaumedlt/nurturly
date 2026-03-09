"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Trash2, Loader2, Mail, Search, FileText, Copy, LayoutTemplate } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { FolderNav, MoveToFolderDropdown, type Folder } from "@/components/shared/folder-nav";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface Email {
  id: string;
  name: string;
  subject: string;
  isTemplate: boolean;
  folderId: string | null;
  updatedAt: string;
  createdAt: string;
}

type Tab = "emails" | "templates";

export default function EmailsPage() {
  const [tab, setTab] = useState<Tab>("emails");
  const [emailsList, setEmailsList] = useState<Email[]>([]);
  const [templatesList, setTemplatesList] = useState<Email[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [emailsRes, templatesRes, foldersRes] = await Promise.all([
        fetch("/api/emails?isTemplate=false"),
        fetch("/api/emails?isTemplate=true"),
        fetch("/api/folders?entityType=email"),
      ]);
      if (emailsRes.ok) {
        const data = await emailsRes.json();
        setEmailsList(data.emails);
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplatesList(data.emails);
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

  const items = tab === "emails" ? emailsList : templatesList;

  const filtered = useMemo(() => {
    let result = items;
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
  }, [items, activeFolderId, search]);

  const createBlankEmail = async () => {
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
      } else {
        toast.error("Failed to create email");
        setCreating(false);
      }
    } catch {
      toast.error("Failed to create email");
      setCreating(false);
    }
  };

  const createFromTemplate = async (templateId: string, templateName: string) => {
    setCreating(true);
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${templateName} (copy)`,
          templateId,
        }),
      });
      if (res.ok) {
        const email = await res.json();
        window.location.href = `/emails/${email.id}`;
      } else {
        toast.error("Failed to create email");
        setCreating(false);
      }
    } catch {
      toast.error("Failed to create email");
      setCreating(false);
    }
  };

  const createTemplate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled template", isTemplate: true }),
      });
      if (res.ok) {
        const email = await res.json();
        window.location.href = `/emails/${email.id}`;
      } else {
        toast.error("Failed to create template");
        setCreating(false);
      }
    } catch {
      toast.error("Failed to create template");
      setCreating(false);
    }
  };

  const duplicateAsTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${items.find((i) => i.id === id)?.name || "Email"} (template)`,
          templateId: id,
          isTemplate: true,
        }),
      });
      if (res.ok) {
        toast.success("Saved as template");
        fetchData();
      } else {
        toast.error("Failed to save as template");
      }
    } catch {
      toast.error("Failed to save as template");
    }
  };

  const deleteEmail = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/emails/${deleteConfirm.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(tab === "templates" ? "Template deleted" : "Email deleted");
        setDeleteConfirm(null);
        if (tab === "emails") {
          setEmailsList((prev) => prev.filter((e) => e.id !== deleteConfirm.id));
        } else {
          setTemplatesList((prev) => prev.filter((e) => e.id !== deleteConfirm.id));
        }
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    }
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
    const setter = tab === "emails" ? setEmailsList : setTemplatesList;
    setter((prev) => prev.map((e) => (e.folderId === id ? { ...e, folderId: null } : e)));
    if (activeFolderId === id) setActiveFolderId(null);
  };

  const moveToFolder = async (itemId: string, folderId: string | null) => {
    await fetch("/api/folders/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, folderId, entityType: "email" }),
    });
    const setter = tab === "emails" ? setEmailsList : setTemplatesList;
    setter((prev) => prev.map((e) => (e.id === itemId ? { ...e, folderId } : e)));
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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            Emails
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {emailsList.length > 0 || templatesList.length > 0
              ? `${emailsList.length} email${emailsList.length !== 1 ? "s" : ""} · ${templatesList.length} template${templatesList.length !== 1 ? "s" : ""}`
              : "Design and manage your email templates."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "templates" ? (
            <button
              type="button"
              onClick={createTemplate}
              disabled={creating}
              className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              New template
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewDialog(true)}
              disabled={creating}
              className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              New email
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          { key: "emails" as Tab, label: "Emails", count: emailsList.length, icon: Mail },
          { key: "templates" as Tab, label: "Templates", count: templatesList.length, icon: LayoutTemplate },
        ]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setSearch(""); setActiveFolderId(null); }}
            className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 pt-1 text-[12px] font-medium transition-colors ${
              tab === t.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.count > 0 && (
              <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                tab === t.key ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {items.length === 0 && !search ? (
        <EmptyState
          icon={tab === "templates" ? LayoutTemplate : Mail}
          title={tab === "templates" ? "No templates yet" : "No emails yet"}
          description={
            tab === "templates"
              ? "Create reusable templates to speed up your email creation."
              : "Create your first email or start from a template."
          }
          actionLabel={tab === "templates" ? "New template" : "New email"}
          onAction={tab === "templates" ? createTemplate : () => setShowNewDialog(true)}
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
                placeholder={tab === "templates" ? "Search templates..." : "Search emails..."}
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-[12px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {/* Table */}
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
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                      No {tab === "templates" ? "templates" : "emails"} match your search
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
                        <div className="flex items-center gap-2">
                          {tab === "templates" && (
                            <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                          )}
                          <span className="text-[13px] font-medium text-foreground truncate">
                            {email.name}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-2 sm:table-cell">
                        <span className="text-[13px] text-muted-foreground truncate">
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
                          {tab === "emails" && (
                            <button
                              type="button"
                              onClick={(e) => duplicateAsTemplate(email.id, e)}
                              title="Save as template"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <MoveToFolderDropdown
                            folders={folders}
                            currentFolderId={email.folderId}
                            onMove={(folderId) => moveToFolder(email.id, folderId)}
                          />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: email.id, name: email.name }); }}
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

      {/* New email dialog — choose template or blank */}
      {showNewDialog && (
        <NewEmailDialog
          templates={templatesList}
          creating={creating}
          onBlank={createBlankEmail}
          onTemplate={createFromTemplate}
          onClose={() => setShowNewDialog(false)}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title={`Delete ${tab === "templates" ? "template" : "email"}`}
        description={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={deleteEmail}
      />
    </div>
  );
}

// ── New Email Dialog ──

interface NewEmailDialogProps {
  templates: Email[];
  creating: boolean;
  onBlank: () => void;
  onTemplate: (templateId: string, templateName: string) => void;
  onClose: () => void;
}

function NewEmailDialog({ templates, creating, onBlank, onTemplate, onClose }: NewEmailDialogProps) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[520px] rounded-xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-[14px] font-semibold text-foreground">New email</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Start from scratch or use a template</p>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
            {/* Blank option */}
            <button
              type="button"
              disabled={creating}
              onClick={onBlank}
              className="group flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-foreground/20 hover:bg-muted/30 disabled:opacity-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileText className="h-4.5 w-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div>
                <span className="text-[13px] font-medium text-foreground">Blank email</span>
                <p className="text-[11px] text-muted-foreground">Start with an empty canvas</p>
              </div>
            </button>

            {/* Templates */}
            {templates.length > 0 && (
              <>
                <div className="pt-1">
                  <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
                    From template
                  </span>
                </div>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={creating}
                    onClick={() => onTemplate(t.id, t.name)}
                    className="group flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-foreground/20 hover:bg-muted/30 disabled:opacity-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <LayoutTemplate className="h-4.5 w-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] font-medium text-foreground truncate block">{t.name}</span>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {t.subject || "No subject"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground/50">
                      {formatRelativeDate(t.updatedAt)}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="border-t border-border px-5 py-3 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
