"use client";

import { useState } from "react";
import { Loader2, Send, X, CheckCircle2, AlertCircle } from "lucide-react";

interface SendTestModalProps {
  open: boolean;
  onClose: () => void;
  emailId: string;
}

export function SendTestModal({ open, onClose, emailId }: SendTestModalProps) {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  if (!open) return null;

  const handleSend = async () => {
    if (!to.trim() || !to.includes("@")) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/emails/${emailId}/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ type: "success", message: "Test email sent!" });
        setTimeout(() => {
          onClose();
          setResult(null);
          setTo("");
        }, 1500);
      } else {
        setResult({ type: "error", message: data.error || "Failed to send" });
      }
    } catch {
      setResult({ type: "error", message: "Network error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Send test email</h3>
            <p className="text-[12px] text-muted-foreground">Preview how your email looks in a real inbox</p>
          </div>
          <button
            type="button"
            onClick={() => { onClose(); setResult(null); setTo(""); }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Recipient
          </label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="you@example.com"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px] outline-none transition-colors focus:ring-2 focus:ring-ring/20 focus:border-ring placeholder:text-muted-foreground/40"
            autoFocus
          />
        </div>

        {result && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] ${
              result.type === "success"
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {result.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {result.message}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => { onClose(); setResult(null); setTo(""); }}
            className="h-9 rounded-lg px-4 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !to.trim() || !to.includes("@")}
            className="flex h-9 items-center gap-2 rounded-lg bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send test
          </button>
        </div>
      </div>
    </div>
  );
}
