"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AddContactDialog({ open, onOpenChange, onCreated }: AddContactDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    company: "",
    jobTitle: "",
    phone: "",
    tags: "",
  });

  const reset = () => {
    setForm({ email: "", firstName: "", lastName: "", company: "", jobTitle: "", phone: "", tags: "" });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
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
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Add contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Email *</label>
            <Input
              type="email"
              required
              placeholder="jane@company.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="h-9 text-[13px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">First name</label>
              <Input
                placeholder="Jane"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="h-9 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Last name</label>
              <Input
                placeholder="Doe"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="h-9 text-[13px]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Company</label>
            <Input
              placeholder="Acme Inc."
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              className="h-9 text-[13px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Job title</label>
              <Input
                placeholder="CEO"
                value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                className="h-9 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Phone</label>
              <Input
                placeholder="+1 234 567 890"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="h-9 text-[13px]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Tags</label>
            <Input
              placeholder="vip, newsletter, product"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="h-9 text-[13px]"
            />
            <p className="text-[11px] text-muted-foreground">Comma-separated</p>
          </div>

          {error && <p className="text-[12px] text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-8 text-[12px]" disabled={loading}>
              {loading ? "Adding..." : "Add contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
