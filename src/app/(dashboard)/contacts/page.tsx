"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Users, Search, Trash2, Mail, Building2, ChevronLeft, ChevronRight, UserPlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeDate } from "@/lib/utils";
import { AddContactDialog } from "@/components/contacts/add-contact-dialog";
import { ImportContactsDialog } from "@/components/contacts/import-contacts-dialog";
import Link from "next/link";

interface Contact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  subscribed: boolean;
  source: "manual" | "import" | "api";
  createdAt: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subscribed, setSubscribed] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (search.trim()) params.set("search", search.trim());
      if (subscribed) params.set("subscribed", subscribed);
      if (source) params.set("source", source);

      const res = await fetch(`/api/contacts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, subscribed, source]);

  useEffect(() => {
    const timer = setTimeout(() => fetchContacts(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchContacts]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    fetchContacts();
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    await Promise.all(
      Array.from(selected).map((id) =>
        fetch(`/api/contacts/${id}`, { method: "DELETE" })
      )
    );
    setSelected(new Set());
    fetchContacts();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === contacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map((c) => c.id)));
    }
  };

  const getInitials = (c: Contact) => {
    if (c.firstName && c.lastName) return `${c.firstName[0]}${c.lastName[0]}`.toUpperCase();
    if (c.firstName) return c.firstName[0].toUpperCase();
    return c.email[0].toUpperCase();
  };

  const getName = (c: Contact) => {
    if (c.firstName || c.lastName) return [c.firstName, c.lastName].filter(Boolean).join(" ");
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Contacts</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {total > 0 ? `${total.toLocaleString()} contact${total !== 1 ? "s" : ""}` : "Manage your contacts and their properties."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import
          </Button>
          <Button size="sm" className="h-8 text-[12px]" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add contact
          </Button>
        </div>
      </div>

      {loading && contacts.length === 0 ? (
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </div>
        </div>
      ) : total === 0 && !search && !subscribed && !source ? (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add contacts manually, import from a CSV, or connect via API."
            actionLabel="Add your first contact"
            onAction={() => setAddOpen(true)}
          />
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative max-w-[240px] flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search contacts..."
                  className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-[12px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="flex items-center gap-1">
                {[
                  { label: "All", value: "" },
                  { label: "Subscribed", value: "true" },
                  { label: "Unsubscribed", value: "false" },
                ].map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => { setSubscribed(f.value); setPage(1); }}
                    className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                      subscribed === f.value
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="hidden items-center gap-1 sm:flex">
                {[
                  { label: "All sources", value: "" },
                  { label: "Manual", value: "manual" },
                  { label: "Import", value: "import" },
                  { label: "API", value: "api" },
                ].map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => { setSource(f.value); setPage(1); }}
                    className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                      source === f.value
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">{selected.size} selected</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="h-9 w-10 px-3">
                    <input
                      type="checkbox"
                      checked={contacts.length > 0 && selected.size === contacts.length}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 rounded border-border accent-foreground"
                    />
                  </th>
                  <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Contact</th>
                  <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden md:table-cell">Company</th>
                  <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden sm:table-cell">Status</th>
                  <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden sm:table-cell">Source</th>
                  <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden lg:table-cell">Added</th>
                  <th className="h-9 w-16 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                      No contacts match your filters
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="group h-[52px] border-b border-border last:border-b-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-3">
                        <input
                          type="checkbox"
                          checked={selected.has(contact.id)}
                          onChange={() => toggleSelect(contact.id)}
                          className="h-3.5 w-3.5 rounded border-border accent-foreground"
                        />
                      </td>
                      <td className="px-4">
                        <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                            {getInitials(contact)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-foreground hover:underline truncate">
                              {getName(contact) || contact.email}
                            </div>
                            {getName(contact) && (
                              <div className="text-[11px] text-muted-foreground truncate">{contact.email}</div>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 hidden md:table-cell">
                        {contact.company ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 text-muted-foreground/50" />
                            <span className="text-[12px] text-muted-foreground truncate max-w-[140px]">{contact.company}</span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-1.5 w-1.5 rounded-full ${contact.subscribed ? "bg-emerald-500" : "bg-neutral-300"}`} />
                          <span className="text-[12px] text-muted-foreground">
                            {contact.subscribed ? "Subscribed" : "Unsubscribed"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 hidden sm:table-cell">
                        <Badge variant="outline" className="text-[10px] font-normal capitalize">{contact.source}</Badge>
                      </td>
                      <td className="px-4 hidden lg:table-cell">
                        <span className="text-[12px] text-muted-foreground">{formatRelativeDate(contact.createdAt)}</span>
                      </td>
                      <td className="px-2">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            type="button"
                            onClick={() => handleDelete(contact.id)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">
                Page {page} of {totalPages} ({total.toLocaleString()} contacts)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AddContactDialog open={addOpen} onOpenChange={setAddOpen} onCreated={fetchContacts} />
      <ImportContactsDialog open={importOpen} onOpenChange={setImportOpen} onImported={fetchContacts} />
    </div>
  );
}
