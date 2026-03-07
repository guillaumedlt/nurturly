"use client";

import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { Contact } from "@/lib/contacts/types";

interface ContactDetailSheetProps {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

function EditableField({
  label,
  value,
  field,
  onSave,
}: {
  label: string;
  value: string | null;
  field: string;
  onSave: (field: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");

  useEffect(() => {
    setEditValue(value ?? "");
  }, [value]);

  const handleBlur = () => {
    setEditing(false);
    if (editValue !== (value ?? "")) {
      onSave(field, editValue);
    }
  };

  return (
    <div className="space-y-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
      {editing ? (
        <Input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleBlur()}
          className="h-8 text-[13px]"
        />
      ) : (
        <p
          onClick={() => setEditing(true)}
          className={cn(
            "cursor-pointer rounded px-1 py-0.5 text-[13px] transition-colors hover:bg-muted",
            value ? "text-foreground" : "text-muted-foreground/50 italic"
          )}
        >
          {value || "Add " + label.toLowerCase()}
        </p>
      )}
    </div>
  );
}

export function ContactDetailSheet({
  contactId,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: ContactDetailSheetProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!contactId || !open) return;
    setLoading(true);
    fetch(`/api/contacts/${contactId}`)
      .then((r) => r.json())
      .then((data) => setContact(data))
      .finally(() => setLoading(false));
  }, [contactId, open]);

  const saveField = useCallback(async (field: string, value: string) => {
    if (!contactId) return;
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setContact(updated);
      onUpdated();
    }
  }, [contactId, onUpdated]);

  const toggleSubscribed = async () => {
    if (!contact || !contactId) return;
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscribed: !contact.subscribed }),
    });
    if (res.ok) {
      const updated = await res.json();
      setContact(updated);
      onUpdated();
    }
  };

  const handleDelete = async () => {
    if (!contactId) return;
    setDeleting(true);
    const res = await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
    if (res.ok) {
      onOpenChange(false);
      onDeleted();
    }
    setDeleting(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-[15px]">
            {loading ? "Loading..." : contact ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email : ""}
          </SheetTitle>
        </SheetHeader>

        {contact && (
          <div className="mt-4 space-y-6">
            {/* Email */}
            <div className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Email</span>
              <p className="text-[13px] text-foreground">{contact.email}</p>
            </div>

            <div className="h-px bg-border" />

            {/* Editable fields */}
            <div className="space-y-3">
              <EditableField label="First name" value={contact.firstName} field="firstName" onSave={saveField} />
              <EditableField label="Last name" value={contact.lastName} field="lastName" onSave={saveField} />
              <EditableField label="Company" value={contact.company} field="company" onSave={saveField} />
              <EditableField label="Job title" value={contact.jobTitle} field="jobTitle" onSave={saveField} />
              <EditableField label="Phone" value={contact.phone} field="phone" onSave={saveField} />
            </div>

            <div className="h-px bg-border" />

            {/* Tags */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Tags</span>
              <div className="flex flex-wrap gap-1">
                {contact.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                ))}
                {(!contact.tags || contact.tags.length === 0) && (
                  <span className="text-[12px] text-muted-foreground/50 italic">No tags</span>
                )}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Subscription */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Subscription</span>
                <p className="text-[12px] text-muted-foreground">
                  {contact.subscribed ? "Receives emails" : "Unsubscribed"}
                </p>
              </div>
              <button
                onClick={toggleSubscribed}
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  contact.subscribed ? "bg-foreground" : "bg-muted-foreground/20"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform",
                    contact.subscribed ? "left-[18px]" : "left-0.5"
                  )}
                />
              </button>
            </div>

            <div className="h-px bg-border" />

            {/* Meta */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Source</span>
                <Badge variant="outline" className="text-[10px] font-normal">{contact.source}</Badge>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Added</span>
                <span className="text-foreground">{formatRelativeDate(contact.createdAt)}</span>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Delete */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full text-[12px] text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {deleting ? "Deleting..." : "Delete contact"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
