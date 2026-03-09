"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Globe, Phone, MapPin, Building2, Users, Pencil,
  Trash2, Check, X, Mail, Briefcase, FileText, Plus, Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface CompanyContact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  phone: string | null;
  subscribed: boolean;
  createdAt: string;
}

interface CompanyDetail {
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
  contacts: CompanyContact[];
  createdAt: string;
  updatedAt: string;
}

export default function CompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params);
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [properties, setProperties] = useState<CompanyProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  // Add contact form
  const [showAddContact, setShowAddContact] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  const fetchCompany = useCallback(async () => {
    const [companyRes, propsRes] = await Promise.all([
      fetch(`/api/companies/${companyId}`),
      fetch("/api/company-properties"),
    ]);
    if (companyRes.ok) {
      setCompany(await companyRes.json());
    }
    if (propsRes.ok) {
      const data = await propsRes.json();
      setProperties(data.properties);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchCompany(); }, [fetchCompany]);

  const updateField = async (field: string, value: unknown) => {
    if (!company) return;
    const res = await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCompany((prev) => prev ? { ...prev, ...updated, contacts: prev.contacts } : prev);
    }
    setEditing(null);
  };

  const updateProperty = async (propName: string, value: unknown) => {
    if (!company) return;
    const newProps = { ...company.properties, [propName]: value };
    const res = await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ properties: newProps }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCompany((prev) => prev ? { ...prev, ...updated, contacts: prev.contacts } : prev);
    }
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!company) return;
    await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
    router.push("/companies");
  };

  const handleAddContact = async () => {
    if (!newEmail.trim() || !company) return;
    setAddingContact(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          firstName: newFirstName.trim() || null,
          lastName: newLastName.trim() || null,
          jobTitle: newJobTitle.trim() || null,
          company: company.name,
          companyId: company.id,
        }),
      });
      if (res.ok) {
        setNewEmail("");
        setNewFirstName("");
        setNewLastName("");
        setNewJobTitle("");
        setShowAddContact(false);
        fetchCompany();
      }
    } finally {
      setAddingContact(false);
    }
  };

  const handleUnlinkContact = async (contactId: string) => {
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: null }),
    });
    fetchCompany();
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

  if (!company) {
    return (
      <div className="space-y-4">
        <Link href="/companies" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to companies
        </Link>
        <p className="text-[13px] text-muted-foreground">Company not found.</p>
      </div>
    );
  }

  const initials = company.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  // Group custom properties
  const groupedProps: Record<string, CompanyProperty[]> = {};
  for (const p of properties) {
    if (!groupedProps[p.groupName]) groupedProps[p.groupName] = [];
    groupedProps[p.groupName].push(p);
  }

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link href="/companies" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Companies
        </Link>
        <Button variant="outline" size="sm" className="h-7 text-[11px] text-destructive hover:bg-destructive/10" onClick={handleDelete}>
          <Trash2 className="mr-1 h-3 w-3" /> Delete
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* ─── Left sidebar: Company info ─── */}
        <div className="space-y-5">
          {/* Identity card */}
          <div className="rounded-xl border border-border bg-background p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-[14px] font-semibold text-muted-foreground">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground truncate">{company.name}</h2>
                {company.industry && (
                  <Badge variant="outline" className="mt-1 text-[10px] font-normal">{company.industry}</Badge>
                )}
                {company.size && (
                  <p className="mt-1 text-[12px] text-muted-foreground">{company.size} employees</p>
                )}
              </div>
            </div>

            {/* Core fields */}
            <div className="mt-5 space-y-0 divide-y divide-border">
              <EditableField
                icon={Globe}
                label="Domain"
                value={company.domain || ""}
                placeholder="Add domain"
                editing={editing === "domain"}
                editValue={editValue}
                onStartEdit={() => startEdit("domain", company.domain || "")}
                onEditChange={setEditValue}
                onSave={() => updateField("domain", editValue)}
                onCancel={() => setEditing(null)}
              />
              <EditableField
                icon={Building2}
                label="Industry"
                value={company.industry || ""}
                placeholder="Add industry"
                editing={editing === "industry"}
                editValue={editValue}
                onStartEdit={() => startEdit("industry", company.industry || "")}
                onEditChange={setEditValue}
                onSave={() => updateField("industry", editValue)}
                onCancel={() => setEditing(null)}
              />
              <EditableField
                icon={Users}
                label="Size"
                value={company.size || ""}
                placeholder="Add size"
                editing={editing === "size"}
                editValue={editValue}
                onStartEdit={() => startEdit("size", company.size || "")}
                onEditChange={setEditValue}
                onSave={() => updateField("size", editValue)}
                onCancel={() => setEditing(null)}
              />
              <EditableField
                icon={Phone}
                label="Phone"
                value={company.phone || ""}
                placeholder="Add phone"
                editing={editing === "phone"}
                editValue={editValue}
                onStartEdit={() => startEdit("phone", company.phone || "")}
                onEditChange={setEditValue}
                onSave={() => updateField("phone", editValue)}
                onCancel={() => setEditing(null)}
              />
              <EditableField
                icon={Globe}
                label="Website"
                value={company.website || ""}
                placeholder="Add website"
                editing={editing === "website"}
                editValue={editValue}
                onStartEdit={() => startEdit("website", company.website || "")}
                onEditChange={setEditValue}
                onSave={() => updateField("website", editValue)}
                onCancel={() => setEditing(null)}
              />
              <EditableField
                icon={MapPin}
                label="Address"
                value={company.address || ""}
                placeholder="Add address"
                editing={editing === "address"}
                editValue={editValue}
                onStartEdit={() => startEdit("address", company.address || "")}
                onEditChange={setEditValue}
                onSave={() => updateField("address", editValue)}
                onCancel={() => setEditing(null)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-border bg-background p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Description</span>
              {editing !== "description" && (
                <button
                  type="button"
                  onClick={() => startEdit("description", company.description || "")}
                  className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
            {editing === "description" ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-[12px] outline-none resize-none focus:ring-1 focus:ring-ring"
                  autoFocus
                />
                <div className="flex justify-end gap-1">
                  <button type="button" onClick={() => updateField("description", editValue)} className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
                    <Check className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : (
              <p className={`text-[12px] leading-relaxed ${company.description ? "text-foreground" : "text-muted-foreground/40"}`}>
                {company.description || "No description"}
              </p>
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
                      const propValue = String(company.properties[prop.name] ?? "");
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
                <span className="text-foreground">{formatRelativeDate(company.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="text-foreground">{formatRelativeDate(company.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contacts</span>
                <span className="text-foreground">{company.contacts.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right: Associated contacts ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-medium text-foreground">
              Associated contacts
              {company.contacts.length > 0 && (
                <span className="ml-1.5 text-[11px] text-muted-foreground/60">{company.contacts.length}</span>
              )}
            </h3>
            <Button size="sm" className="h-7 text-[11px]" onClick={() => setShowAddContact(!showAddContact)}>
              <Plus className="mr-1 h-3 w-3" />
              Add contact
            </Button>
          </div>

          {/* Inline add contact form */}
          {showAddContact && (
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="john@company.com"
                    className="h-8 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddContact(); if (e.key === "Escape") setShowAddContact(false); }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">First name</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="John"
                    className="h-8 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Last name</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Doe"
                    className="h-8 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Job title</label>
                  <input
                    type="text"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    placeholder="CEO"
                    className="h-8 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setShowAddContact(false)}>Cancel</Button>
                <Button size="sm" className="h-7 text-[11px]" disabled={!newEmail.trim() || addingContact} onClick={handleAddContact}>
                  {addingContact ? "Adding..." : "Add to company"}
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-background">
            {company.contacts.length === 0 && !showAddContact ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
                <p className="mt-3 text-[13px] font-medium text-foreground">No contacts yet</p>
                <p className="mt-1 text-[12px] text-muted-foreground">Add contacts to associate them with this company.</p>
              </div>
            ) : company.contacts.length > 0 ? (
              <div className="divide-y divide-border">
                {company.contacts.map((contact) => {
                  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
                  const cInitials = contact.firstName
                    ? `${contact.firstName[0]}${contact.lastName?.[0] || ""}`.toUpperCase()
                    : contact.email[0].toUpperCase();
                  return (
                    <div key={contact.id} className="group flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/30">
                      <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                          {cInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-foreground hover:underline">{name || contact.email}</p>
                          <div className="flex items-center gap-2">
                            {name && <span className="text-[11px] text-muted-foreground">{contact.email}</span>}
                            {contact.jobTitle && (
                              <>
                                <span className="text-[11px] text-muted-foreground/30">·</span>
                                <span className="text-[11px] text-muted-foreground">{contact.jobTitle}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${contact.subscribed ? "bg-emerald-500" : "bg-neutral-300"}`} />
                        <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeDate(contact.createdAt)}</span>
                        <button
                          type="button"
                          onClick={() => handleUnlinkContact(contact.id)}
                          title="Remove from company"
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Unlink className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
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
