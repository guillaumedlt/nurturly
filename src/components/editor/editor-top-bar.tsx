"use client";

import { ArrowLeft, Save, Eye, Pencil, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useCallback } from "react";

interface EditorTopBarProps {
  name: string;
  onNameChange: (name: string) => void;
  onSave: () => Promise<void>;
  mode: "edit" | "preview";
  onModeChange: (mode: "edit" | "preview") => void;
  saving: boolean;
  lastSaved: Date | null;
}

export function EditorTopBar({
  name,
  onNameChange,
  onSave,
  mode,
  onModeChange,
  saving,
  lastSaved,
}: EditorTopBarProps) {
  const [editingName, setEditingName] = useState(false);

  const handleNameBlur = useCallback(() => {
    setEditingName(false);
    if (!name.trim()) onNameChange("Untitled email");
  }, [name, onNameChange]);

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
            {name || "Untitled email"}
          </button>
        )}

        {lastSaved && (
          <span className="text-[11px] text-muted-foreground/60">
            {saving ? "Saving..." : "Saved"}
          </span>
        )}
      </div>

      {/* Right: Mode toggle + Save */}
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
