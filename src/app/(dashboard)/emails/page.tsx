"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Loader2, Mail } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  updatedAt: string;
  createdAt: string;
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchEmails = useCallback(async () => {
    try {
      const res = await fetch("/api/emails");
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
          Emails
        </h2>
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

      {emails.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No email templates"
          description="Create your first email template to start building beautiful emails."
          actionLabel="New email"
          onAction={createEmail}
        />
      ) : (
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
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
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
                    <button
                      type="button"
                      onClick={(e) => deleteEmail(email.id, e)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
