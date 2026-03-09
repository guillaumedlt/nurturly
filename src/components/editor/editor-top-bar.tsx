"use client";

import { ArrowLeft, Save, Eye, Pencil, Loader2, Send, Copy } from "lucide-react";
import Link from "next/link";
import { useState, useCallback } from "react";
import { toast } from "sonner";

interface EditorTopBarProps {
  name: string;
  onNameChange: (name: string) => void;
  onSave: () => Promise<void>;
  mode: "edit" | "preview";
  onModeChange: (mode: "edit" | "preview") => void;
  saving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges?: boolean;
  onSendTest?: () => void;
  isTemplate?: boolean;
  emailId?: string;
}

export function EditorTopBar({
  name,
  onNameChange,
  onSave,
  mode,
  onModeChange,
  saving,
  lastSaved,
  hasUnsavedChanges,
  onSendTest,
  isTemplate,
  emailId,
}: EditorTopBarProps) {
  const [editingName, setEditingName] = useState(false);
  const [savingAsTemplate, setSavingAsTemplate] = useState(false);

  const handleNameBlur = useCallback(() => {
    setEditingName(false);
    if (!name.trim()) onNameChange(isTemplate ? "Untitled template" : "Untitled email");
  }, [name, onNameChange, isTemplate]);

  const saveAsTemplate = async () => {
    if (!emailId) return;
    setSavingAsTemplate(true);
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${name} (template)`,
          templateId: emailId,
          isTemplate: true,
        }),
      });
      if (res.ok) {
        toast.success("Saved as template");
      } else {
        toast.error("Failed to save as template");
      }
    } catch {
      toast.error("Failed to save as template");
    } finally {
      setSavingAsTemplate(false);
    }
  };

  return (
    <div className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      {/* Left: Back + name */}
      <div className="flex items-center gap-3">
        <Link
          href="/emails"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        {editingName ? (
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameBlur();
            }}
            className="h-8 w-60 rounded-md border border-input bg-background px-2.5 text-[14px] font-medium outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="text-[14px] font-medium text-foreground hover:text-muted-foreground transition-colors"
          >
            {name || (isTemplate ? "Untitled template" : "Untitled email")}
          </button>
        )}

        {isTemplate && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Template
          </span>
        )}

        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
          {saving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </>
          ) : hasUnsavedChanges ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              Unsaved
            </>
          ) : lastSaved ? (
            "Saved"
          ) : null}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Edit / Preview toggle */}
        <div className="flex items-center rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => onModeChange("edit")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              mode === "edit"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onModeChange("preview")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              mode === "preview"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
        </div>

        {/* Save as template (only for emails, not templates) */}
        {!isTemplate && emailId && (
          <button
            type="button"
            onClick={saveAsTemplate}
            disabled={savingAsTemplate}
            className="hidden sm:flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            {savingAsTemplate ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
            Save as template
          </button>
        )}

        {/* Send test */}
        {onSendTest && (
          <button
            type="button"
            onClick={onSendTest}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Send className="h-3 w-3" />
            <span className="hidden sm:inline">Send test</span>
          </button>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-4 text-[12px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </button>
      </div>
    </div>
  );
}
