"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Paintbrush, ChevronDown } from "lucide-react";
import { EmailEditor } from "@/components/editor/email-editor";
import { EditorTopBar } from "@/components/editor/editor-top-bar";
import { EditorPreview } from "@/components/editor/editor-preview";
import { SendTestModal } from "@/components/editor/send-test-modal";
import { renderEmailHtml } from "@/lib/editor/render-html";

interface EmailStyles {
  bodyBgColor: string;
  contentBgColor: string;
  contentBorderRadius: number;
  contentPadding: number;
}

const DEFAULT_STYLES: EmailStyles = {
  bodyBgColor: "#f5f5f5",
  contentBgColor: "#ffffff",
  contentBorderRadius: 8,
  contentPadding: 40,
};

const BODY_BG_COLORS = [
  "#f5f5f5", "#e5e5e5", "#fafafa", "#ffffff",
  "#0a0a0a", "#1e293b", "#eff6ff", "#fef2f2",
];

const CONTENT_BG_COLORS = [
  "#ffffff", "#fafafa", "#f5f5f5",
  "#0a0a0a", "#1e293b",
  "#eff6ff", "#f0fdf4", "#fef2f2",
];

interface EmailData {
  id: string;
  name: string;
  subject: string;
  preheaderText: string | null;
  editorContent: string;
  htmlContent: string | null;
  isTemplate: boolean;
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
  const [emailStyles, setEmailStyles] = useState<EmailStyles>(DEFAULT_STYLES);
  const [showStylePanel, setShowStylePanel] = useState(false);

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
        // Try to parse email styles from editorContent
        try {
          const parsed = JSON.parse(data.editorContent);
          if (parsed._emailStyles) {
            setEmailStyles({ ...DEFAULT_STYLES, ...parsed._emailStyles });
          }
        } catch { /* ignore */ }
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
      // Embed emailStyles into the editorContent JSON
      let editorContentWithStyles = contentRef.current;
      try {
        const doc = JSON.parse(contentRef.current);
        doc._emailStyles = emailStyles;
        editorContentWithStyles = JSON.stringify(doc);
      } catch { /* ignore */ }

      let htmlContent = "";
      try {
        const doc = JSON.parse(contentRef.current);
        htmlContent = renderEmailHtml(doc, { subject, preheaderText, emailStyles });
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
          editorContent: editorContentWithStyles,
          htmlContent,
        }),
      });
      setLastSaved(new Date());
      setSavedSnapshot(JSON.stringify({ name, subject, preheaderText, editorContent: editorContentWithStyles }));
    } finally {
      setSaving(false);
    }
  }, [email, name, subject, preheaderText, emailStyles]);

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
        isTemplate={email.isTemplate}
        emailId={email.id}
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

            {/* Email style settings */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowStylePanel(!showStylePanel)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Paintbrush className="h-3 w-3" />
                Email style
                <ChevronDown className={`h-3 w-3 transition-transform ${showStylePanel ? "rotate-180" : ""}`} />
              </button>

              {showStylePanel && (
                <div className="mt-2 rounded-xl border border-border bg-background p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Body background */}
                    <div>
                      <span className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Body background
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {BODY_BG_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEmailStyles((s) => ({ ...s, bodyBgColor: c }))}
                            className={`h-7 w-7 rounded-full border transition-all hover:scale-110 ${
                              emailStyles.bodyBgColor === c ? "ring-2 ring-ring ring-offset-1" : "border-border"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <div className="relative ml-1">
                          <input
                            type="color"
                            value={emailStyles.bodyBgColor}
                            onChange={(e) => setEmailStyles((s) => ({ ...s, bodyBgColor: e.target.value }))}
                            className="absolute inset-0 h-7 w-7 cursor-pointer opacity-0"
                          />
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold text-muted-foreground transition-all hover:scale-110 ${
                              !BODY_BG_COLORS.includes(emailStyles.bodyBgColor) ? "ring-2 ring-ring ring-offset-1" : "border-border"
                            }`}
                            style={{ backgroundColor: emailStyles.bodyBgColor }}
                          >
                            #
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content background */}
                    <div>
                      <span className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Content background
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {CONTENT_BG_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEmailStyles((s) => ({ ...s, contentBgColor: c }))}
                            className={`h-7 w-7 rounded-full border transition-all hover:scale-110 ${
                              emailStyles.contentBgColor === c ? "ring-2 ring-ring ring-offset-1" : "border-border"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <div className="relative ml-1">
                          <input
                            type="color"
                            value={emailStyles.contentBgColor}
                            onChange={(e) => setEmailStyles((s) => ({ ...s, contentBgColor: e.target.value }))}
                            className="absolute inset-0 h-7 w-7 cursor-pointer opacity-0"
                          />
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold text-muted-foreground transition-all hover:scale-110 ${
                              !CONTENT_BG_COLORS.includes(emailStyles.contentBgColor) ? "ring-2 ring-ring ring-offset-1" : "border-border"
                            }`}
                            style={{ backgroundColor: emailStyles.contentBgColor }}
                          >
                            #
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Border radius */}
                    <div>
                      <span className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Corner radius
                      </span>
                      <div className="flex gap-1">
                        {[0, 4, 8, 16].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setEmailStyles((s) => ({ ...s, contentBorderRadius: r }))}
                            className={`flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                              emailStyles.contentBorderRadius === r
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {r === 0 ? "None" : `${r}px`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Padding */}
                    <div>
                      <span className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Content padding
                      </span>
                      <div className="flex gap-1">
                        {[{ label: "S", value: 24 }, { label: "M", value: 32 }, { label: "L", value: 40 }, { label: "XL", value: 56 }].map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => setEmailStyles((s) => ({ ...s, contentPadding: p.value }))}
                            className={`flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                              emailStyles.contentPadding === p.value
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Editor */}
            <EmailEditor
              content={editorContent}
              onUpdate={setEditorContent}
              emailStyles={emailStyles}
            />
          </div>
        ) : (
          <div className="px-4 py-8">
            <EditorPreview
              content={editorContent}
              subject={subject}
              preheaderText={preheaderText}
              emailStyles={emailStyles}
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
