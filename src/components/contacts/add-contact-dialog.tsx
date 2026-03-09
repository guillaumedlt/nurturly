"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Building2, Plus } from "lucide-react";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface CompanyOption {
  id: string;
  name: string;
  domain: string | null;
}

export function AddContactDialog({ open, onOpenChange, onCreated }: AddContactDialogProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Company autocomplete
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const companyRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setCompany("");
    setCompanyId(null);
    setJobTitle("");
    setPhone("");
    setError("");
    setShowCompanyDropdown(false);
  };

  // Fetch companies for autocomplete
  useEffect(() => {
    if (!open) return;
    fetch("/api/companies?all=true")
      .then((r) => r.ok ? r.json() : { companies: [] })
      .then((data) => setCompanyOptions(data.companies || []));
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setShowCompanyDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredCompanies = companyOptions.filter((c) =>
    c.name.toLowerCase().includes(company.toLowerCase()) ||
    (c.domain && c.domain.toLowerCase().includes(company.toLowerCase()))
  );

  const handleSelectCompany = (opt: CompanyOption) => {
    setCompany(opt.name);
    setCompanyId(opt.id);
    setShowCompanyDropdown(false);
  };

  const handleCreateCompany = async () => {
    if (!company.trim()) return;
    setCreatingCompany(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: company.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setCompanyId(created.id);
        setCompanyOptions((prev) => [...prev, { id: created.id, name: created.name, domain: created.domain }]);
        setShowCompanyDropdown(false);
      }
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          company: company.trim() || null,
          companyId: companyId,
          jobTitle: jobTitle.trim() || null,
          phone: phone.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create contact");
        return;
      }

      reset();
      onOpenChange(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => { reset(); onOpenChange(false); }} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => { reset(); onOpenChange(false); }}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Add contact</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Add a new contact to your database.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@company.com"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          {/* Company with autocomplete */}
          <div ref={companyRef} className="relative">
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Company</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  setCompanyId(null);
                  setShowCompanyDropdown(true);
                }}
                onFocus={() => setShowCompanyDropdown(true)}
                placeholder="Search or create company..."
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
              />
              {companyId && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600">Linked</span>
                </div>
              )}
            </div>

            {showCompanyDropdown && company.trim() && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-background shadow-xl">
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.slice(0, 6).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectCompany(opt)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-semibold text-muted-foreground">
                        {opt.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[12px] font-medium text-foreground truncate">{opt.name}</span>
                        {opt.domain && <span className="block text-[10px] text-muted-foreground">{opt.domain}</span>}
                      </div>
                    </button>
                  ))
                ) : null}
                {/* Create new company option */}
                {!companyOptions.some((o) => o.name.toLowerCase() === company.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={handleCreateCompany}
                    disabled={creatingCompany}
                    className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-foreground text-background">
                      <Plus className="h-3 w-3" />
                    </div>
                    <span className="text-[12px] font-medium text-foreground">
                      {creatingCompany ? "Creating..." : `Create "${company.trim()}"`}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Job title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="CEO"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => { reset(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-8 text-[12px]" disabled={saving}>
              {saving ? "Adding..." : "Add contact"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
