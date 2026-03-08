"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { EmailEditor } from "@/components/editor/email-editor";
import { EditorTopBar } from "@/components/editor/editor-top-bar";
import { EditorPreview } from "@/components/editor/editor-preview";
import { SendTestModal } from "@/components/editor/send-test-modal";
import { renderEmailHtml } from "@/lib/editor/render-html";

interface EmailData {
  id: string;
  name: string;
  subject: string;
  preheaderText: string | null;
  editorContent: string;
  htmlContent: string | null;
}

export default function EmailEditorPage() {
  const params = useParams<{ emailId: string }>();
  const router = useRouter();
  const [email, setEmail] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [sendTestOpen, setSendTestOpen] = useState(false);

  // Local state for editing
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [preheaderText, setPreheaderText] = useState("");
  const [editorContent, setEditorContent] = useState("");

  // Track if there are unsaved changes
  const contentRef = useRef(editorContent);
  contentRef.current = editorContent;
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load email
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/emails/${params.emailId}`);
        if (!res.ok) {
          router.push("/emails");
          return;
        }
        const data: EmailData = await res.json();
        setEmail(data);
        setName(data.name);
        setSubject(data.subject);
        setPreheaderText(data.preheaderText || "");
        setEditorContent(data.editorContent);
        setSavedSnapshot(JSON.stringify({ name: data.name, subject: data.subject, preheaderText: data.preheaderText || "", editorContent: data.editorContent }));
      } catch {
        router.push("/emails");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.emailId, router]);

  // Save
  const save = useCallback(async () => {
    if (!email) return;
    setSaving(true);
    try {
      let htmlContent = "";
      try {
        const doc = JSON.parse(contentRef.current);
        htmlContent = renderEmailHtml(doc, { subject, preheaderText });
      } catch {
        // Keep empty if parsing fails
      }

      await fetch(`/api/emails/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject,
          preheaderText: preheaderText || null,
          editorContent: contentRef.current,
          htmlContent,
        }),
      });
      setLastSaved(new Date());
      setSavedSnapshot(JSON.stringify({ name, subject, preheaderText, editorContent: contentRef.current }));
    } finally {
      setSaving(false);
    }
  }, [email, name, subject, preheaderText]);

  // Cmd+S to save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save]);

  // Compute unsaved changes
  const currentSnapshot = JSON.stringify({ name, subject, preheaderText, editorContent });
  const hasUnsavedChanges = savedSnapshot !== null && currentSnapshot !== savedSnapshot;

  // Auto-save with 3s debounce
  useEffect(() => {
    if (!hasUnsavedChanges || saving) return;
    autoSaveTimerRef.current = setTimeout(() => {
      save();
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [hasUnsavedChanges, saving, save, currentSnapshot]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!email) return null;

  const subjectLength = subject.length;
  const subjectColor =
    subjectLength === 0
      ? "text-muted-foreground/40"
      : subjectLength <= 50
        ? "text-success"
        : subjectLength <= 70
          ? "text-warning"
          : "text-destructive";

  return (
    <div className="flex min-h-dvh flex-col">
      <EditorTopBar
        name={name}
        onNameChange={setName}
        onSave={save}
        mode={mode}
        onModeChange={setMode}
        saving={saving}
        lastSaved={lastSaved}
        hasUnsavedChanges={hasUnsavedChanges}
        onSendTest={() => setSendTestOpen(true)}
      />

      <div className="flex-1 overflow-auto bg-muted/30">
        {mode === "edit" ? (
          <div className="mx-auto max-w-[800px] px-4 py-6 sm:px-6">
            {/* Subject & preheader */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground w-20 shrink-0">
                  Subject
                </label>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject line"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 pr-14 text-[14px] outline-none transition-colors focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono ${subjectColor}`}>
                    {subjectLength}/60
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground w-20 shrink-0">
                  Preview
                </label>
                <input
                  type="text"
                  value={preheaderText}
                  onChange={(e) => setPreheaderText(e.target.value)}
                  placeholder="Preview text shown in inbox"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-[13px] outline-none transition-colors focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            {/* Editor */}
            <EmailEditor
              content={editorContent}
              onUpdate={setEditorContent}
            />
          </div>
        ) : (
          <div className="px-4 py-8">
            <EditorPreview
              content={editorContent}
              subject={subject}
              preheaderText={preheaderText}
            />
          </div>
        )}
      </div>

      {/* Send test modal */}
      <SendTestModal
        open={sendTestOpen}
        onClose={() => setSendTestOpen(false)}
        emailId={email.id}
      />
    </div>
  );
}
