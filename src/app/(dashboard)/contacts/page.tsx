"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Users, Search, Trash2, Building2, ChevronLeft, ChevronRight, Upload, Columns3, Check, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeDate, formatPropValue } from "@/lib/utils";
import { AddContactDialog } from "@/components/contacts/add-contact-dialog";
import { ImportContactsDialog } from "@/components/contacts/import-contacts-dialog";
import { AddToAudienceDialog } from "@/components/contacts/add-to-audience-dialog";
import Link from "next/link";
import type { ContactProperty } from "@/lib/contacts/types";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ContactFilterBuilder } from "@/components/contacts/contact-filter-builder";
import { type ContactFilters, createEmptyFilters, hasActiveFilters, countActiveFilters } from "@/lib/contacts/filters";

interface Contact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  companyId: string | null;
  jobTitle: string | null;
  phone: string | null;
  subscribed: boolean;
  source: "manual" | "import" | "api";
  properties: Record<string, unknown>;
  createdAt: string;
}

// Built-in columns that can be toggled
const BUILTIN_COLUMNS = [
  { key: "company", label: "Company" },
  { key: "jobTitle", label: "Job title" },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source" },
  { key: "createdAt", label: "Added" },
];

const DEFAULT_VISIBLE = new Set(["company", "status", "source", "createdAt"]);

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customProps, setCustomProps] = useState<ContactProperty[]>([]);
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
  const [showColumns, setShowColumns] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(DEFAULT_VISIBLE);
  const [filters, setFilters] = useState<ContactFilters>(createEmptyFilters());
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [audienceDialogOpen, setAudienceDialogOpen] = useState(false);
  const [audienceContactIds, setAudienceContactIds] = useState<string[]>([]);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (search.trim()) params.set("search", search.trim());
      if (subscribed) params.set("subscribed", subscribed);
      if (source) params.set("source", source);
      if (hasActiveFilters(filters)) params.set("filters", JSON.stringify(filters));

      const [contactsRes, propsRes] = await Promise.all([
        fetch(`/api/contacts?${params}`),
        fetch("/api/contact-properties"),
      ]);
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data.contacts);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
      if (propsRes.ok) {
        const data = await propsRes.json();
        setCustomProps(data.properties);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, subscribed, source, filters]);

  useEffect(() => {
    const timer = setTimeout(() => fetchContacts(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchContacts]);

  const handleDelete = (contact: Contact) => {
    const name = getName(contact) || contact.email;
    setDeleteConfirm({ id: contact.id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/contacts/${deleteConfirm.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Contact deleted");
        setDeleteConfirm(null);
        fetchContacts();
        setSelected((prev) => { const next = new Set(prev); next.delete(deleteConfirm.id); return next; });
      } else {
        toast.error("Failed to delete contact");
      }
    } catch {
      toast.error("Failed to delete contact");
    }
  };

  const handleBulkDelete = () => {
    setBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const results = await Promise.all(
        Array.from(selected).map((id) => fetch(`/api/contacts/${id}`, { method: "DELETE" }))
      );
      const allOk = results.every((r) => r.ok);
      if (allOk) {
        toast.success(`${selected.size} contact${selected.size !== 1 ? "s" : ""} deleted`);
        setSelected(new Set());
        setBulkDeleteConfirm(false);
      } else {
        toast.error("Some contacts could not be deleted");
      }
      fetchContacts();
    } catch {
      toast.error("Failed to delete contacts");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleAll = () => {
    if (selected.size === contacts.length) setSelected(new Set());
    else setSelected(new Set(contacts.map((c) => c.id)));
  };

  const toggleCol = (key: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
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

  // Active custom property columns
  const activeCustomCols = customProps.filter((p) => visibleCols.has(`prop:${p.name}`));
  // Active builtin columns
  const activeBuiltinCols = BUILTIN_COLUMNS.filter((c) => visibleCols.has(c.key));
  // Total columns: checkbox + contact + active builtin + active custom + actions
  const totalCols = 2 + activeBuiltinCols.length + activeCustomCols.length + 1;


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

              <ContactFilterBuilder
                filters={filters}
                onChange={(f) => { setFilters(f); setPage(1); }}
                customProperties={customProps}
              />

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

            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-foreground">{selected.size} selected</span>
                  <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => { setAudienceContactIds(Array.from(selected)); setAudienceDialogOpen(true); }}>
                    <UserPlus className="mr-1 h-3 w-3" />
                    Add to audience
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleBulkDelete}>
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              )}

              {/* Column picker */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[12px]"
                  onClick={() => setShowColumns(!showColumns)}
                >
                  <Columns3 className="mr-1.5 h-3.5 w-3.5" />
                  Columns
                  {(activeCustomCols.length > 0) && (
                    <span className="ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-medium text-background">
                      {activeCustomCols.length}
                    </span>
                  )}
                </Button>
                {showColumns && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowColumns(false)} />
                    <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-background shadow-xl">
                      {/* Built-in */}
                      <div className="p-1.5">
                        <span className="block px-2 py-1 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">Default</span>
                        {BUILTIN_COLUMNS.map((col) => (
                          <button
                            key={col.key}
                            type="button"
                            onClick={() => toggleCol(col.key)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] transition-colors hover:bg-accent"
                          >
                            <div className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                              visibleCols.has(col.key) ? "border-foreground bg-foreground" : "border-border"
                            }`}>
                              {visibleCols.has(col.key) && <Check className="h-2.5 w-2.5 text-background" />}
                            </div>
                            <span className="text-foreground">{col.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Custom properties */}
                      {customProps.length > 0 && (
                        <div className="border-t border-border p-1.5">
                          <span className="block px-2 py-1 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">Custom</span>
                          {customProps.map((prop) => {
                            const key = `prop:${prop.name}`;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => toggleCol(key)}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] transition-colors hover:bg-accent"
                              >
                                <div className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                                  visibleCols.has(key) ? "border-foreground bg-foreground" : "border-border"
                                }`}>
                                  {visibleCols.has(key) && <Check className="h-2.5 w-2.5 text-background" />}
                                </div>
                                <span className="text-foreground">{prop.label}</span>
                                <span className="ml-auto text-[10px] text-muted-foreground">{prop.type}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-x-auto">
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

                  {/* Built-in columns */}
                  {visibleCols.has("company") && (
                    <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden md:table-cell">Company</th>
                  )}
                  {visibleCols.has("jobTitle") && (
                    <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden md:table-cell">Job title</th>
                  )}
                  {visibleCols.has("phone") && (
                    <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden lg:table-cell">Phone</th>
                  )}
                  {visibleCols.has("status") && (
                    <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden sm:table-cell">Status</th>
                  )}
                  {visibleCols.has("source") && (
                    <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden sm:table-cell">Source</th>
                  )}

                  {/* Custom property columns */}
                  {activeCustomCols.map((prop) => (
                    <th key={prop.name} className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden lg:table-cell">
                      {prop.label}
                    </th>
                  ))}

                  {visibleCols.has("createdAt") && (
                    <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden lg:table-cell">Added</th>
                  )}
                  <th className="h-9 w-12 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={totalCols} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                      No contacts match your filters
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr key={contact.id} className="group h-[52px] border-b border-border last:border-b-0 transition-colors hover:bg-muted/30">
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

                      {/* Built-in columns */}
                      {visibleCols.has("company") && (
                        <td className="px-4 hidden md:table-cell">
                          {contact.company ? (
                            contact.companyId ? (
                              <Link href={`/companies/${contact.companyId}`} className="flex items-center gap-1.5 group/company">
                                <Building2 className="h-3 w-3 text-muted-foreground/50" />
                                <span className="text-[12px] text-muted-foreground truncate max-w-[140px] group-hover/company:underline group-hover/company:text-foreground">{contact.company}</span>
                              </Link>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3 w-3 text-muted-foreground/50" />
                                <span className="text-[12px] text-muted-foreground truncate max-w-[140px]">{contact.company}</span>
                              </div>
                            )
                          ) : (
                            <span className="text-[12px] text-muted-foreground/30">—</span>
                          )}
                        </td>
                      )}
                      {visibleCols.has("jobTitle") && (
                        <td className="px-4 hidden md:table-cell">
                          <span className={`text-[12px] ${contact.jobTitle ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                            {contact.jobTitle || "—"}
                          </span>
                        </td>
                      )}
                      {visibleCols.has("phone") && (
                        <td className="px-4 hidden lg:table-cell">
                          <span className={`text-[12px] font-mono ${contact.phone ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                            {contact.phone || "—"}
                          </span>
                        </td>
                      )}
                      {visibleCols.has("status") && (
                        <td className="px-4 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <div className={`h-1.5 w-1.5 rounded-full ${contact.subscribed ? "bg-emerald-500" : "bg-neutral-300"}`} />
                            <span className="text-[12px] text-muted-foreground">
                              {contact.subscribed ? "Subscribed" : "Unsubscribed"}
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleCols.has("source") && (
                        <td className="px-4 hidden sm:table-cell">
                          <Badge variant="outline" className="text-[10px] font-normal capitalize">{contact.source}</Badge>
                        </td>
                      )}

                      {/* Custom property columns */}
                      {activeCustomCols.map((prop) => {
                        const val = contact.properties?.[prop.name];
                        const display = formatPropValue(val, prop.type);
                        return (
                          <td key={prop.name} className="px-4 hidden lg:table-cell">
                            {prop.type === "boolean" && val !== null && val !== undefined && val !== "" ? (
                              <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                val === true || val === "true"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : "bg-neutral-100 text-neutral-500"
                              }`}>
                                {display}
                              </div>
                            ) : prop.type === "select" && display !== "—" ? (
                              <Badge variant="outline" className="text-[10px] font-normal">{display}</Badge>
                            ) : (
                              <span className={`text-[12px] ${display === "—" ? "text-muted-foreground/30" : "text-muted-foreground"}`}>
                                {display}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {visibleCols.has("createdAt") && (
                        <td className="px-4 hidden lg:table-cell">
                          <span className="text-[12px] text-muted-foreground">{formatRelativeDate(contact.createdAt)}</span>
                        </td>
                      )}
                      <td className="px-2">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            type="button"
                            onClick={() => { setAudienceContactIds([contact.id]); setAudienceDialogOpen(true); }}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Add to audience"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(contact)}
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
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AddContactDialog open={addOpen} onOpenChange={setAddOpen} onCreated={fetchContacts} />
      <ImportContactsDialog open={importOpen} onOpenChange={setImportOpen} onImported={fetchContacts} />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title="Delete contact"
        description={`Are you sure you want to delete ${deleteConfirm?.name || "this contact"}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onOpenChange={() => setBulkDeleteConfirm(false)}
        title="Delete contacts"
        description={`Are you sure you want to delete ${selected.size} contact${selected.size !== 1 ? "s" : ""}? This action cannot be undone.`}
        confirmLabel="Delete all"
        onConfirm={confirmBulkDelete}
      />

      <AddToAudienceDialog
        open={audienceDialogOpen}
        onOpenChange={setAudienceDialogOpen}
        contactIds={audienceContactIds}
        onDone={() => setSelected(new Set())}
      />
    </div>
  );
}
