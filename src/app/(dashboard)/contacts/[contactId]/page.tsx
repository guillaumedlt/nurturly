"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Mail, Phone, Building2, Briefcase, Tag, Check, X,
  Pencil, Trash2, ListFilter, GitBranch, Send, Eye, MousePointerClick,
  AlertTriangle, Clock, Plus, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";
import Link from "next/link";
import type { ContactProperty } from "@/lib/contacts/types";

interface ContactDetail {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  companyId: string | null;
  jobTitle: string | null;
  phone: string | null;
  tags: string[] | null;
  properties: Record<string, unknown>;
  subscribed: boolean;
  source: "manual" | "import" | "api";
  createdAt: string;
  updatedAt: string;
  lists: { id: string; name: string; type: string; addedAt: string }[];
  activity: { id: string; eventType: string; campaignId: string | null; sequenceId: string | null; occurredAt: string; metadata: string | null }[];
  enrollments: { id: string; sequenceId: string; sequenceName: string; status: string; currentStep: number; enrolledAt: string; completedAt: string | null }[];
}

interface CompanyInfo {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
}

const EVENT_ICONS: Record<string, { icon: typeof Send; color: string }> = {
  sent: { icon: Send, color: "text-blue-500" },
  delivered: { icon: Check, color: "text-emerald-500" },
  opened: { icon: Eye, color: "text-violet-500" },
  clicked: { icon: MousePointerClick, color: "text-amber-500" },
  bounced: { icon: AlertTriangle, color: "text-red-500" },
  complained: { icon: AlertTriangle, color: "text-red-500" },
  unsubscribed: { icon: X, color: "text-neutral-400" },
};

export default function ContactDetailPage({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = use(params);
  const router = useRouter();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [properties, setProperties] = useState<ContactProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeTab, setActiveTab] = useState<"activity" | "audiences" | "sequences">("activity");
  const [newTag, setNewTag] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  // Company autocomplete
  const [companySearch, setCompanySearch] = useState("");
  const [companyOptions, setCompanyOptions] = useState<{ id: string; name: string; domain: string | null }[]>([]);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);

  const fetchContact = useCallback(async () => {
    const [contactRes, propsRes] = await Promise.all([
      fetch(`/api/contacts/${contactId}`),
      fetch("/api/contact-properties"),
    ]);
    if (contactRes.ok) {
      const contactData = await contactRes.json();
      setContact(contactData);
      // Fetch associated company if linked
      if (contactData.companyId) {
        fetch(`/api/companies/${contactData.companyId}`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => { if (data) setCompanyInfo({ id: data.id, name: data.name, domain: data.domain, industry: data.industry }); });
      } else {
        setCompanyInfo(null);
      }
    }
    if (propsRes.ok) {
      const data = await propsRes.json();
      setProperties(data.properties);
    }
    setLoading(false);
  }, [contactId]);

  useEffect(() => { fetchContact(); }, [fetchContact]);

  const updateField = async (field: string, value: unknown) => {
    if (!contact) return;
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      const updated = await res.json();
      setContact((prev) => prev ? { ...prev, ...updated } : prev);
    }
    setEditing(null);
  };

  const updateProperty = async (propName: string, value: unknown) => {
    if (!contact) return;
    const newProps = { ...contact.properties, [propName]: value };
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ properties: newProps }),
    });
    if (res.ok) {
      const updated = await res.json();
      setContact((prev) => prev ? { ...prev, ...updated } : prev);
    }
    setEditing(null);
  };

  const linkCompany = async (cId: string, cName: string) => {
    if (!contact) return;
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: cId, company: cName }),
    });
    if (res.ok) {
      const updated = await res.json();
      setContact((prev) => prev ? { ...prev, ...updated } : prev);
      setCompanyInfo({ id: cId, name: cName, domain: null, industry: null });
      // Refetch company details
      fetch(`/api/companies/${cId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setCompanyInfo({ id: data.id, name: data.name, domain: data.domain, industry: data.industry }); });
    }
    setShowCompanyPicker(false);
    setCompanySearch("");
  };

  const unlinkCompany = async () => {
    if (!contact) return;
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: null, company: null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setContact((prev) => prev ? { ...prev, ...updated } : prev);
      setCompanyInfo(null);
    }
  };

  const createAndLinkCompany = async (name: string) => {
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const created = await res.json();
      await linkCompany(created.id, created.name);
    }
  };

  const addTag = async () => {
    if (!contact || !newTag.trim()) return;
    const tags = [...(contact.tags || []), newTag.trim()];
    await updateField("tags", tags);
    setNewTag("");
    setShowTagInput(false);
  };

  const removeTag = async (tag: string) => {
    if (!contact) return;
    const tags = (contact.tags || []).filter((t) => t !== tag);
    await updateField("tags", tags);
  };

  const handleDelete = async () => {
    if (!contact) return;
    await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    router.push("/contacts");
  };

  const startEdit = (field: string, currentValue: string) => {
    setEditing(field);
    setEditValue(currentValue);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="space-y-4">
        <Link href="/contacts" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to contacts
        </Link>
        <p className="text-[13px] text-muted-foreground">Contact not found.</p>
      </div>
    );
  }

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email;
  const initials = contact.firstName
    ? `${contact.firstName[0]}${contact.lastName?.[0] || ""}`.toUpperCase()
    : contact.email[0].toUpperCase();

  // Group custom properties
  const groupedProps: Record<string, ContactProperty[]> = {};
  for (const p of properties) {
    if (!groupedProps[p.groupName]) groupedProps[p.groupName] = [];
    groupedProps[p.groupName].push(p);
  }

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link href="/contacts" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Contacts
        </Link>
        <Button variant="outline" size="sm" className="h-7 text-[11px] text-destructive hover:bg-destructive/10" onClick={handleDelete}>
          <Trash2 className="mr-1 h-3 w-3" /> Delete
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* ─── Left sidebar: Contact info ─── */}
        <div className="space-y-5">
          {/* Identity card */}
          <div className="rounded-xl border border-border bg-background p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-[15px] font-semibold text-muted-foreground">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground truncate">{name}</h2>
                {contact.jobTitle && (
                  <p className="mt-0.5 text-[12px] text-muted-foreground truncate">{contact.jobTitle}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    contact.subscribed ? "bg-emerald-500/10 text-emerald-600" : "bg-neutral-100 text-neutral-500"
                  }`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${contact.subscribed ? "bg-emerald-500" : "bg-neutral-400"}`} />
                    {contact.subscribed ? "Subscribed" : "Unsubscribed"}
                  </div>
                  <Badge variant="outline" className="text-[10px] font-normal capitalize">{contact.source}</Badge>
                </div>
              </div>
            </div>

            {/* Core fields */}
            <div className="mt-5 space-y-0 divide-y divide-border">
              <EditableField
                icon={Mail}
                label="Email"
                value={contact.email}
                editing={editing === "email"}
                editValue={editValue}
                onStartEdit={() => startEdit("email", contact.email)}
                onEditChange={setEditValue}
                onSave={() => updateField("email", editValue)}
                onCancel={() => setEditing(null)}
              />
              <EditableField
                icon={Phone}
                label="Phone"
                value={contact.phone || ""}
                placeholder="Add phone"
                editing={editing === "phone"}
                editValue={editValue}
                onStartEdit={() => startEdit("phone", contact.phone || "")}
                onEditChange={setEditValue}
                onSave={() => updateField("phone", editValue)}
                onCancel={() => setEditing(null)}
              />
              <EditableField
                icon={Briefcase}
                label="Job title"
                value={contact.jobTitle || ""}
                placeholder="Add job title"
                editing={editing === "jobTitle"}
                editValue={editValue}
                onStartEdit={() => startEdit("jobTitle", contact.jobTitle || "")}
                onEditChange={setEditValue}
                onSave={() => updateField("jobTitle", editValue)}
                onCancel={() => setEditing(null)}
              />
            </div>
          </div>

          {/* Company association */}
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Company</span>
              {companyInfo ? (
                <button
                  type="button"
                  onClick={unlinkCompany}
                  className="flex h-5 items-center gap-1 rounded px-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-2.5 w-2.5" />
                  Unlink
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowCompanyPicker(!showCompanyPicker);
                    if (!showCompanyPicker) {
                      fetch("/api/companies?all=true")
                        .then((r) => r.ok ? r.json() : { companies: [] })
                        .then((data) => setCompanyOptions(data.companies || []));
                    }
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>

            {companyInfo ? (
              <Link href={`/companies/${companyInfo.id}`} className="flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-semibold text-muted-foreground">
                  {companyInfo.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{companyInfo.name}</p>
                  <div className="flex items-center gap-1.5">
                    {companyInfo.domain && <span className="text-[11px] text-muted-foreground">{companyInfo.domain}</span>}
                    {companyInfo.industry && (
                      <>
                        {companyInfo.domain && <span className="text-[11px] text-muted-foreground/30">·</span>}
                        <span className="text-[11px] text-muted-foreground">{companyInfo.industry}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ) : showCompanyPicker ? (
              <div className="relative">
                <Building2 className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Search or create company..."
                  className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-[12px] outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Escape") { setShowCompanyPicker(false); setCompanySearch(""); } }}
                />
                {companySearch.trim() && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
                    {companyOptions
                      .filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase()))
                      .slice(0, 5)
                      .map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => linkCompany(opt.id, opt.name)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-semibold text-muted-foreground">
                            {opt.name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[12px] font-medium text-foreground truncate">{opt.name}</span>
                            {opt.domain && <span className="block text-[10px] text-muted-foreground">{opt.domain}</span>}
                          </div>
                        </button>
                      ))}
                    {!companyOptions.some((o) => o.name.toLowerCase() === companySearch.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => createAndLinkCompany(companySearch.trim())}
                        className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-foreground text-background">
                          <Plus className="h-3 w-3" />
                        </div>
                        <span className="text-[12px] font-medium text-foreground">Create &quot;{companySearch.trim()}&quot;</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground/40">No company linked</p>
            )}
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-border bg-background p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Tags</span>
              <button
                type="button"
                onClick={() => setShowTagInput(!showTagInput)}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(contact.tags || []).map((tag) => (
                <span key={tag} className="group inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {(!contact.tags || contact.tags.length === 0) && !showTagInput && (
                <span className="text-[11px] text-muted-foreground/50">No tags</span>
              )}
            </div>
            {showTagInput && (
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addTag(); if (e.key === "Escape") setShowTagInput(false); }}
                  placeholder="Tag name"
                  className="h-7 flex-1 rounded-md border border-input bg-background px-2 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                />
                <button type="button" onClick={addTag} className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
                  <Check className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Custom Properties */}
          {Object.keys(groupedProps).length > 0 && (
            <div className="rounded-xl border border-border bg-background p-5">
              {Object.entries(groupedProps).map(([group, props]) => (
                <div key={group} className="mb-4 last:mb-0">
                  <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{group}</span>
                  <div className="space-y-0 divide-y divide-border">
                    {props.map((prop) => {
                      const propValue = String(contact.properties[prop.name] ?? "");
                      const isEditing = editing === `prop:${prop.name}`;
                      return (
                        <div key={prop.id} className="group flex items-center justify-between py-2.5">
                          <span className="text-[12px] text-muted-foreground">{prop.label}</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              {prop.type === "select" && prop.options ? (
                                <select
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-7 rounded-md border border-input bg-background px-2 text-[11px] outline-none"
                                  autoFocus
                                >
                                  <option value="">—</option>
                                  {prop.options.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : prop.type === "boolean" ? (
                                <select
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-7 rounded-md border border-input bg-background px-2 text-[11px] outline-none"
                                  autoFocus
                                >
                                  <option value="">—</option>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                              ) : (
                                <input
                                  type={prop.type === "number" ? "number" : prop.type === "date" ? "date" : "text"}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-7 w-32 rounded-md border border-input bg-background px-2 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") updateProperty(prop.name, prop.type === "number" ? Number(editValue) : prop.type === "boolean" ? editValue === "true" : editValue);
                                    if (e.key === "Escape") setEditing(null);
                                  }}
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => updateProperty(prop.name, prop.type === "number" ? Number(editValue) : prop.type === "boolean" ? editValue === "true" : editValue)}
                                className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button type="button" onClick={() => setEditing(null)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setEditing(`prop:${prop.name}`); setEditValue(propValue); }}
                              className="text-[12px] text-foreground hover:underline cursor-pointer"
                            >
                              {propValue || <span className="text-muted-foreground/40">—</span>}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="rounded-xl border border-border bg-background p-5">
            <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Info</span>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">{formatRelativeDate(contact.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="text-foreground">{formatRelativeDate(contact.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <span className="text-foreground capitalize">{contact.source}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right: Activity / Audiences / Sequences ─── */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-border">
            {[
              { key: "activity", label: "Activity", count: contact.activity.length },
              { key: "audiences", label: "Audiences", count: contact.lists.length },
              { key: "sequences", label: "Sequences", count: contact.enrollments.length },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  activeTab === tab.key
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 text-[11px] text-muted-foreground/60">{tab.count}</span>
                )}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-foreground" />
                )}
              </button>
            ))}
          </div>

          {/* Activity tab */}
          {activeTab === "activity" && (
            <div className="rounded-xl border border-border bg-background">
              {contact.activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
                  <p className="mt-3 text-[13px] font-medium text-foreground">No activity yet</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Email events will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {contact.activity.map((event) => {
                    const iconDef = EVENT_ICONS[event.eventType] || { icon: Clock, color: "text-muted-foreground" };
                    const Icon = iconDef.icon;
                    return (
                      <div key={event.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ${iconDef.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-foreground capitalize">{event.eventType.replace("_", " ")}</p>
                          {event.metadata && (
                            <p className="text-[11px] text-muted-foreground truncate">{event.metadata}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeDate(event.occurredAt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Audiences tab */}
          {activeTab === "audiences" && (
            <div className="rounded-xl border border-border bg-background">
              {contact.lists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ListFilter className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
                  <p className="mt-3 text-[13px] font-medium text-foreground">Not in any audience</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Add this contact to an audience to include them in campaigns.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {contact.lists.map((list) => (
                    <Link key={list.id} href={`/lists/${list.id}`} className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-foreground">{list.name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{list.type} list</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground">Added {formatRelativeDate(list.addedAt)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sequences tab */}
          {activeTab === "sequences" && (
            <div className="rounded-xl border border-border bg-background">
              {contact.enrollments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <GitBranch className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
                  <p className="mt-3 text-[13px] font-medium text-foreground">No sequences</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">This contact hasn&#39;t been enrolled in any sequences.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {contact.enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-foreground">{enrollment.sequenceName}</p>
                          <p className="text-[11px] text-muted-foreground">Step {enrollment.currentStep + 1}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                          enrollment.status === "active" ? "bg-blue-500/10 text-blue-600" :
                          enrollment.status === "completed" ? "bg-emerald-500/10 text-emerald-600" :
                          enrollment.status === "paused" ? "bg-amber-500/10 text-amber-600" :
                          "bg-neutral-100 text-neutral-500"
                        }`}>
                          {enrollment.status}
                        </div>
                        <span className="text-[11px] text-muted-foreground">{formatRelativeDate(enrollment.enrolledAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Inline editable field ─── */

function EditableField({
  icon: Icon,
  label,
  value,
  placeholder,
  editing,
  editValue,
  onStartEdit,
  onEditChange,
  onSave,
  onCancel,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  placeholder?: string;
  editing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 py-2.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      {editing ? (
        <div className="flex flex-1 items-center gap-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
            className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-[12px] outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <button type="button" onClick={onSave} className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
            <Check className="h-3 w-3" />
          </button>
          <button type="button" onClick={onCancel} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-between">
          <div className="min-w-0">
            <span className="block text-[10px] text-muted-foreground/60">{label}</span>
            <span className={`block text-[12px] truncate ${value ? "text-foreground" : "text-muted-foreground/40"}`}>
              {value || placeholder || "—"}
            </span>
          </div>
          <button
            type="button"
            onClick={onStartEdit}
            className="flex h-6 w-6 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
