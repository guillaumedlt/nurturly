"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Building2, Search, Trash2, ChevronLeft, ChevronRight, Globe, Users, Columns3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeDate } from "@/lib/utils";
import Link from "next/link";

interface CompanyProperty {
  id: string;
  name: string;
  label: string;
  type: string;
  groupName: string;
  options: string[] | null;
  required: boolean;
  position: number;
}

interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  description: string | null;
  properties: Record<string, unknown>;
  contactCount: number;
  createdAt: string;
}

const BUILTIN_COLUMNS = [
  { key: "domain", label: "Domain" },
  { key: "industry", label: "Industry" },
  { key: "size", label: "Size" },
  { key: "phone", label: "Phone" },
  { key: "contacts", label: "Contacts" },
  { key: "createdAt", label: "Added" },
];

const DEFAULT_VISIBLE = new Set(["domain", "industry", "contacts", "createdAt"]);

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customProps, setCustomProps] = useState<CompanyProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(DEFAULT_VISIBLE);

  // Add company form state
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (search.trim()) params.set("search", search.trim());

      const [companiesRes, propsRes] = await Promise.all([
        fetch(`/api/companies?${params}`),
        fetch("/api/company-properties"),
      ]);
      if (companiesRes.ok) {
        const data = await companiesRes.json();
        setCompanies(data.companies);
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
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchCompanies(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchCompanies]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    fetchCompanies();
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleBulkDelete = async () => {
    await Promise.all(Array.from(selected).map((id) => fetch(`/api/companies/${id}`, { method: "DELETE" })));
    setSelected(new Set());
    fetchCompanies();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          domain: newDomain.trim() || null,
          industry: newIndustry.trim() || null,
        }),
      });
      if (res.ok) {
        setNewName("");
        setNewDomain("");
        setNewIndustry("");
        setAddOpen(false);
        fetchCompanies();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleAll = () => {
    if (selected.size === companies.length) setSelected(new Set());
    else setSelected(new Set(companies.map((c) => c.id)));
  };

  const toggleCol = (key: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  };

  const activeCustomCols = customProps.filter((p) => visibleCols.has(`prop:${p.name}`));
  const activeBuiltinCols = BUILTIN_COLUMNS.filter((c) => visibleCols.has(c.key));
  const totalCols = 2 + activeBuiltinCols.length + activeCustomCols.length + 1;

  const formatPropValue = (value: unknown, type: string): string => {
    if (value === null || value === undefined || value === "") return "—";
    if (type === "boolean") return value === true || value === "true" ? "Yes" : "No";
    if (type === "date" && typeof value === "string") {
      try { return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return String(value); }
    }
    if (type === "multi_select" && Array.isArray(value)) return value.join(", ");
    return String(value);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Companies</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {total > 0 ? `${total.toLocaleString()} compan${total !== 1 ? "ies" : "y"}` : "Manage your companies and their properties."}
          </p>
        </div>
        <Button size="sm" className="h-8 text-[12px]" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add company
        </Button>
      </div>

      {/* Add company inline dialog */}
      {addOpen && (
        <div className="rounded-xl border border-border bg-background p-5">
          <h3 className="text-[13px] font-medium text-foreground mb-4">New company</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Acme Inc."
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setAddOpen(false); }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Domain</label>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="acme.com"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Industry</label>
              <input
                type="text"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                placeholder="SaaS"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" className="h-8 text-[12px]" disabled={!newName.trim() || saving} onClick={handleCreate}>
              {saving ? "Creating..." : "Create company"}
            </Button>
          </div>
        </div>
      )}

      {loading && companies.length === 0 ? (
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </div>
        </div>
      ) : total === 0 && !search ? (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={Building2}
            title="No companies yet"
            description="Add companies to group your contacts by organization."
            actionLabel="Add your first company"
            onAction={() => setAddOpen(true)}
          />
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-[280px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search companies..."
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-[12px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-foreground">{selected.size} selected</span>
                  <Button variant="outline" size="sm" className="h-7 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleBulkDelete}>
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              )}

              {/* Column picker */}
              <div className="relative">
                <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setShowColumns(!showColumns)}>
                  <Columns3 className="mr-1.5 h-3.5 w-3.5" />
                  Columns
                  {activeCustomCols.length > 0 && (
                    <span className="ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-medium text-background">
                      {activeCustomCols.length}
                    </span>
                  )}
                </Button>
                {showColumns && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowColumns(false)} />
                    <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-background shadow-xl">
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
                      checked={companies.length > 0 && selected.size === companies.length}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 rounded border-border accent-foreground"
                    />
                  </th>
                  <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Company</th>
                  {visibleCols.has("domain") && (
                    <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden md:table-cell">Domain</th>
                  )}
                  {visibleCols.has("industry") && (
                    <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden md:table-cell">Industry</th>
                  )}
                  {visibleCols.has("size") && (
                    <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden lg:table-cell">Size</th>
                  )}
                  {visibleCols.has("phone") && (
                    <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden lg:table-cell">Phone</th>
                  )}
                  {visibleCols.has("contacts") && (
                    <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden sm:table-cell">Contacts</th>
                  )}
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
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={totalCols} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                      No companies match your search
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr key={company.id} className="group h-[52px] border-b border-border last:border-b-0 transition-colors hover:bg-muted/30">
                      <td className="px-3">
                        <input
                          type="checkbox"
                          checked={selected.has(company.id)}
                          onChange={() => toggleSelect(company.id)}
                          className="h-3.5 w-3.5 rounded border-border accent-foreground"
                        />
                      </td>
                      <td className="px-4">
                        <Link href={`/companies/${company.id}`} className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-semibold text-muted-foreground">
                            {getInitials(company.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-foreground hover:underline truncate">{company.name}</div>
                            {company.domain && (
                              <div className="text-[11px] text-muted-foreground truncate">{company.domain}</div>
                            )}
                          </div>
                        </Link>
                      </td>
                      {visibleCols.has("domain") && (
                        <td className="px-4 hidden md:table-cell">
                          {company.domain ? (
                            <div className="flex items-center gap-1.5">
                              <Globe className="h-3 w-3 text-muted-foreground/50" />
                              <span className="text-[12px] text-muted-foreground truncate max-w-[140px]">{company.domain}</span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-muted-foreground/30">—</span>
                          )}
                        </td>
                      )}
                      {visibleCols.has("industry") && (
                        <td className="px-4 hidden md:table-cell">
                          {company.industry ? (
                            <Badge variant="outline" className="text-[10px] font-normal">{company.industry}</Badge>
                          ) : (
                            <span className="text-[12px] text-muted-foreground/30">—</span>
                          )}
                        </td>
                      )}
                      {visibleCols.has("size") && (
                        <td className="px-4 hidden lg:table-cell">
                          <span className={`text-[12px] ${company.size ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                            {company.size || "—"}
                          </span>
                        </td>
                      )}
                      {visibleCols.has("phone") && (
                        <td className="px-4 hidden lg:table-cell">
                          <span className={`text-[12px] font-mono ${company.phone ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                            {company.phone || "—"}
                          </span>
                        </td>
                      )}
                      {visibleCols.has("contacts") && (
                        <td className="px-4 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3 w-3 text-muted-foreground/50" />
                            <span className="text-[12px] text-muted-foreground">{company.contactCount}</span>
                          </div>
                        </td>
                      )}
                      {activeCustomCols.map((prop) => {
                        const val = company.properties?.[prop.name];
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
                          <span className="text-[12px] text-muted-foreground">{formatRelativeDate(company.createdAt)}</span>
                        </td>
                      )}
                      <td className="px-2">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            type="button"
                            onClick={() => handleDelete(company.id)}
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
                Page {page} of {totalPages} ({total.toLocaleString()} companies)
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
    </div>
  );
}
