"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  Play,
  Pause,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { WorkflowBuilder } from "@/components/sequences/workflow-builder";
import type { WorkflowDefinition } from "@/lib/sequences/types";
import { createDefaultWorkflow } from "@/lib/sequences/types";

interface SequenceData {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "archived";
  triggerType: string;
  triggerListId: string | null;
  workflowData: string | null;
  totalEnrolled: number;
  totalCompleted: number;
}

export default function SequenceEditorPage() {
  const params = useParams<{ sequenceId: string }>();
  const router = useRouter();

  const [sequence, setSequence] = useState<SequenceData | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowDefinition>(createDefaultWorkflow());
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emails, setEmails] = useState<{ id: string; name: string }[]>([]);
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasChangesRef = useRef(false);

  // Fetch sequence + emails + lists
  useEffect(() => {
    async function load() {
      try {
        const [seqRes, emailsRes, listsRes] = await Promise.all([
          fetch(`/api/sequences/${params.sequenceId}`),
          fetch("/api/emails"),
          fetch("/api/lists"),
        ]);

        if (!seqRes.ok) {
          router.push("/sequences");
          return;
        }

        const seq: SequenceData = await seqRes.json();
        setSequence(seq);
        setName(seq.name);

        if (seq.workflowData) {
          try {
            setWorkflow(JSON.parse(seq.workflowData));
          } catch {
            setWorkflow(createDefaultWorkflow());
          }
        }

        if (emailsRes.ok) {
          const data = await emailsRes.json();
          setEmails(data.emails?.map((e: { id: string; name: string }) => ({ id: e.id, name: e.name })) || []);
        }

        if (listsRes.ok) {
          const data = await listsRes.json();
          setLists(data.map?.((l: { id: string; name: string }) => ({ id: l.id, name: l.name })) || []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.sequenceId, router]);

  // Save handler
  const save = useCallback(async () => {
    if (!sequence) return;
    setSaving(true);
    try {
      await fetch(`/api/sequences/${sequence.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          workflowData: JSON.stringify(workflow),
        }),
      });
      setSaved(true);
      hasChangesRef.current = false;
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [sequence, name, workflow]);

  // Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [save]);

  // Track changes
  const handleWorkflowChange = useCallback((w: WorkflowDefinition) => {
    setWorkflow(w);
    hasChangesRef.current = true;
  }, []);

  // Click outside menu
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  // Toggle status
  const toggleStatus = async (newStatus: "active" | "paused" | "draft") => {
    if (!sequence) return;
    const res = await fetch(`/api/sequences/${sequence.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSequence(updated);
    }
    setMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sequence) return null;

  return (
    <div className="flex h-dvh flex-col">
      {/* ─── Top bar ─── */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/sequences"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); hasChangesRef.current = true; }}
            className="h-7 max-w-[220px] border-0 bg-transparent text-[14px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Sequence name"
          />
          <StatusBadge status={sequence.status} />
        </div>

        <div className="flex items-center gap-2">
          {/* Save indicator */}
          <span className="text-[11px] text-muted-foreground">
            {saving ? "Saving..." : saved ? "Saved" : ""}
          </span>

          {/* Save button */}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>

          {/* Activate / Pause */}
          {sequence.status === "draft" || sequence.status === "paused" ? (
            <button
              type="button"
              onClick={() => toggleStatus("active")}
              className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
            >
              <Play className="h-3.5 w-3.5" />
              Activate
            </button>
          ) : sequence.status === "active" ? (
            <button
              type="button"
              onClick={() => toggleStatus("paused")}
              className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
          ) : null}

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-50 w-44 rounded-lg border border-border bg-background p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-100">
                {sequence.status === "active" && (
                  <button
                    onClick={() => toggleStatus("paused")}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause sequence
                  </button>
                )}
                {sequence.status !== "draft" && (
                  <button
                    onClick={() => toggleStatus("draft")}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Revert to draft
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Workflow canvas ─── */}
      <div className="flex-1 overflow-hidden">
        <WorkflowBuilder
          workflow={workflow}
          onChange={handleWorkflowChange}
          emails={emails}
          lists={lists}
        />
      </div>
    </div>
  );
}
